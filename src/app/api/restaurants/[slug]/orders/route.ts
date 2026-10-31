import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { findRestaurantBySlugOrKey } from "@/lib/restaurants";
import { verifySessionToken, verifyGuestTableToken } from "@/lib/serverAuth";
import { isRequestDevAuthenticated } from "@/lib/devAuth";
import { OrderCard, OrderStatus } from "@/types";
import { initialMenuData } from "@/lib/sync";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };
}

// In-memory rate limiter: max 10 orders per IP per 5 minutes (Directive 2)
const orderRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkOrderRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = orderRateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    orderRateLimitMap.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

// GET: Staff & Kitchen Order Queue (Finding SEC-001 & SEC-004: Server-Authorized)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const cleanSlug = (slug || "").toLowerCase().trim();
    const restaurant = findRestaurantBySlugOrKey(cleanSlug);

    if (!restaurant) {
      return NextResponse.json({ success: false, error: "Restaurant not found." }, { status: 404 });
    }

    // Authorization: Staff/Owner Session Token or Developer Cookie
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const session = verifySessionToken(token);
    const isDev = isRequestDevAuthenticated(req);

    const isAuthorizedStaff =
      (session.valid &&
        (session.role === "kitchen" || session.role === "owner") &&
        (!session.restaurantId || session.restaurantId === restaurant.id || session.restaurantId === "global")) ||
      isDev;

    if (!isAuthorizedStaff) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Staff or Manager authentication required to view kitchen queue." },
        { status: 401 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ success: false, orders: [] });
    }

    // Scoped Query to Supabase via server credentials
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?restaurant_id=eq.${restaurant.id}&select=*,order_items(*)&order=created_at.desc&limit=100`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!res.ok) {
      return NextResponse.json({ success: false, orders: [] });
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ success: true, orders: [] });
    }

    const orders: OrderCard[] = data.map((row: any) => {
      let items = [];
      try {
        items = Array.isArray(row.order_items)
          ? row.order_items.map((item: any) => ({
              itemId: item.menu_item_id,
              name: item.name,
              basePrice: Number(item.unit_price),
              selectedModifiers: item.selected_modifiers || [],
              quantity: Number(item.quantity),
              unitPrice: Number(item.unit_price),
              totalPrice: Number(item.total_price),
              specialInstructions: item.special_instructions || undefined,
            }))
          : [];
      } catch {
        items = [];
      }

      return {
        id: String(row.id),
        orderNumber: row.order_number || String(row.id).slice(0, 6),
        restaurantId: row.restaurant_id,
        table: Number(row.table_number) || 1,
        items,
        subtotal: Number(row.subtotal) || Number(row.total) || 0,
        serviceFee: Number(row.service_fee) || 0,
        total: Number(row.total) || 0,
        status: (row.status as OrderStatus) || "New",
        createdAt: typeof row.created_at === "number" ? row.created_at : Date.parse(row.created_at) || Date.now(),
        updatedAt: typeof row.updated_at === "number" ? row.updated_at : Date.parse(row.updated_at) || Date.now(),
      };
    });

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Internal error" }, { status: 500 });
  }
}

// POST: Guest Order Placement (Directive 2: Server-Enforced Order Integrity)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    if (!checkOrderRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: "Too many orders submitted. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const { slug } = await params;
    const cleanSlug = (slug || "").toLowerCase().trim();
    const restaurant = findRestaurantBySlugOrKey(cleanSlug);

    if (!restaurant) {
      return NextResponse.json({ success: false, error: "Restaurant not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const tableNumber = Number(body?.table_number || body?.table);
    const rawItems = Array.isArray(body?.items) ? body.items : [];

    // Table Validation
    if (!tableNumber || tableNumber < 1 || tableNumber > (restaurant.tableCount || 50)) {
      return NextResponse.json(
        { success: false, error: `Invalid table number. Must be between 1 and ${restaurant.tableCount || 50}.` },
        { status: 400 }
      );
    }

    // Guest Table Capability Verification (Directive 1 & 2)
    const capabilityToken =
      req.headers.get("x-guest-capability") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
      String(body?.capabilityToken || "");

    if (!capabilityToken) {
      return NextResponse.json(
        { success: false, error: "A valid guest table capability token is required." },
        { status: 401 }
      );
    }

    const capVerification = verifyGuestTableToken(capabilityToken, restaurant.id, tableNumber);
    if (!capVerification.valid) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired guest table capability token." },
        { status: 403 }
      );
    }

    // Payload Constraints: Enforce quantity and item limits (Directive 2)
    if (rawItems.length === 0) {
      return NextResponse.json({ success: false, error: "Order must contain at least one item." }, { status: 400 });
    }
    if (rawItems.length > 50) {
      return NextResponse.json({ success: false, error: "Order contains too many items (max 50)." }, { status: 400 });
    }

    // Server-Side Price Lookup & Recalculation (Directive 2: Never trust client totals)
    const validatedItems: any[] = [];
    let serverSubtotal = 0;

    for (const rawItem of rawItems) {
      const itemId = Number(rawItem?.itemId || rawItem?.id);
      const quantity = Math.floor(Number(rawItem?.quantity));

      if (isNaN(quantity) || quantity < 1 || quantity > 20) {
        return NextResponse.json(
          { success: false, error: `Invalid item quantity for item ID ${itemId}. Must be between 1 and 20.` },
          { status: 400 }
        );
      }

      // Authoritative server menu price resolution
      const menuItem = initialMenuData.find((m) => m.id === itemId);
      if (!menuItem) {
        return NextResponse.json(
          { success: false, error: `Menu item with ID ${itemId} does not exist in this restaurant.` },
          { status: 400 }
        );
      }
      if (menuItem.available === false) {
        return NextResponse.json(
          { success: false, error: `Menu item "${menuItem.name}" is currently unavailable.` },
          { status: 400 }
        );
      }

      // Modifier validation
      let modifierDeltaTotal = 0;
      const validatedModifiers: any[] = [];

      if (Array.isArray(rawItem?.selectedModifiers)) {
        for (const mod of rawItem.selectedModifiers) {
          const groupName = String(mod?.groupName || "").trim();
          const optionName = String(mod?.optionName || "").trim();

          const group = menuItem.modifierGroups?.find((g) => g.name.toLowerCase() === groupName.toLowerCase());
          const option = group?.options.find((o) => o.name.toLowerCase() === optionName.toLowerCase());

          if (option) {
            const priceDelta = Number(option.priceDelta) || 0;
            modifierDeltaTotal += priceDelta;
            validatedModifiers.push({
              groupName: group?.name || groupName,
              optionName: option.name,
              priceDelta,
            });
          }
        }
      }

      const unitPrice = menuItem.price + modifierDeltaTotal;
      const itemTotalPrice = unitPrice * quantity;
      serverSubtotal += itemTotalPrice;

      validatedItems.push({
        itemId: menuItem.id,
        name: menuItem.name,
        basePrice: menuItem.price,
        selectedModifiers: validatedModifiers,
        quantity,
        unitPrice,
        totalPrice: itemTotalPrice,
        specialInstructions: typeof rawItem?.specialInstructions === "string" ? rawItem.specialInstructions.slice(0, 200) : undefined,
      });
    }

    // Server-computed fees and totals (Directive 2)
    const feeRate = (restaurant.serviceFeePercent || 0) / 100;
    const serverServiceFee = Math.round(serverSubtotal * feeRate);
    const serverTotal = serverSubtotal + serverServiceFee;

    // Server-generated identifiers & metadata (Directive 2)
    const clientOrderId = typeof body?.id === "string" && /^ord_[a-zA-Z0-9_-]{8,80}$/.test(body.id)
      ? body.id
      : null;
    const serverOrderId = clientOrderId || crypto.randomUUID();
    const serverOrderNumber = String(Math.floor(1000 + Math.random() * 9000));
    const now = Date.now();

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({
        success: true,
        order: {
          id: serverOrderId,
          orderNumber: serverOrderNumber,
          restaurantId: restaurant.id,
          table: tableNumber,
          items: validatedItems,
          subtotal: serverSubtotal,
          serviceFee: serverServiceFee,
          total: serverTotal,
          status: "New",
          createdAt: now,
          updatedAt: now,
        },
      });
    }

    // Insert order through server-side authenticated connection
    const payload = {
      id: serverOrderId,
      order_number: serverOrderNumber,
      restaurant_id: restaurant.id,
      table_number: tableNumber,
      subtotal: serverSubtotal,
      service_fee: serverServiceFee,
      total: serverTotal,
      status: "New",
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { success: false, error: `Failed to insert order: ${errText}` },
        { status: res.status }
      );
    }

    if (validatedItems.length > 0) {
      const itemsRes = await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(
          validatedItems.map((item) => ({
            order_id: serverOrderId,
            menu_item_id: item.itemId,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.totalPrice,
            selected_modifiers: item.selectedModifiers,
            special_instructions: item.specialInstructions || null,
          }))
        ),
      });

      if (!itemsRes.ok) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(serverOrderId)}&restaurant_id=eq.${encodeURIComponent(restaurant.id)}`,
          { method: "DELETE", headers: getHeaders() }
        );
        const errText = await itemsRes.text();
        return NextResponse.json(
          { success: false, error: `Failed to persist order items: ${errText}` },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: serverOrderId,
        orderNumber: serverOrderNumber,
        restaurantId: restaurant.id,
        table: tableNumber,
        items: validatedItems,
        subtotal: serverSubtotal,
        serviceFee: serverServiceFee,
        total: serverTotal,
        status: "New",
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Internal error" }, { status: 500 });
  }
}
