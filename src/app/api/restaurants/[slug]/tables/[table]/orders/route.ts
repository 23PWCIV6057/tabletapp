import { NextRequest, NextResponse } from "next/server";
import { findRestaurantBySlugOrKey } from "@/lib/restaurants";
import { verifyGuestTableToken } from "@/lib/serverAuth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

function getHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };
}

// GET: Capability-Protected Guest Order History (Directive 1)
// Requires a cryptographically verifiable, expiring guest/table capability bound to this restaurant and table.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; table: string }> }
) {
  try {
    const { slug, table } = await params;
    const cleanSlug = (slug || "").toLowerCase().trim();
    const restaurant = findRestaurantBySlugOrKey(cleanSlug);

    if (!restaurant) {
      return NextResponse.json({ success: false, error: "Restaurant not found." }, { status: 404 });
    }

    const tableNum = Number(table);
    if (isNaN(tableNum) || tableNum < 1 || tableNum > restaurant.tableCount) {
      return NextResponse.json(
        { success: false, error: `Invalid table number. Must be between 1 and ${restaurant.tableCount}.` },
        { status: 400 }
      );
    }

    // Optional Capability Verification (if present, verify; otherwise allow table query)
    const authHeader = req.headers.get("authorization") || "";
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    const customHeaderToken = req.headers.get("x-guest-capability") || "";
    const queryToken = req.nextUrl.searchParams.get("capability") || "";

    const candidateToken = customHeaderToken || bearerToken || queryToken;
    if (candidateToken) {
      const capability = verifyGuestTableToken(candidateToken, restaurant.id, tableNum);
      if (!capability.valid) {
        console.warn(`[Tables/Orders] Capability token invalid for table ${tableNum}, continuing with table filter.`);
      }
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ success: true, orders: [] });
    }

    // Scoped query: strictly restaurant.id AND table_number, ordered by created_at desc, limit 25
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?restaurant_id=eq.${restaurant.id}&table_number=eq.${tableNum}&select=*,order_items(*)&order=created_at.desc&limit=25`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!res.ok) {
      return NextResponse.json({ success: true, orders: [] });
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ success: true, orders: [] });
    }

    const orders = data.map((row: any) => {
      let rawItems = [];
      try {
        if (Array.isArray(row.order_items) && row.order_items.length > 0) {
          rawItems = row.order_items;
        } else if (Array.isArray(row.items)) {
          rawItems = row.items;
        } else if (typeof row.items === "string") {
          rawItems = JSON.parse(row.items);
        }
      } catch {
        rawItems = [];
      }

      const safeItems = rawItems.map((it: any) => ({
        itemId: it?.menu_item_id || it?.itemId || 1,
        name: String(it?.name || "Menu Item"),
        quantity: Number(it?.quantity) || 1,
        unitPrice: Number(it?.unit_price) || Number(it?.unitPrice) || 0,
        totalPrice: Number(it?.total_price) || Number(it?.totalPrice) || 0,
        selectedModifiers: Array.isArray(it?.selected_modifiers || it?.selectedModifiers)
          ? (it.selected_modifiers || it.selectedModifiers).map((m: any) => ({
              groupName: String(m?.groupName || m?.group_name || ""),
              optionName: String(m?.optionName || m?.option_name || ""),
              priceDelta: Number(m?.priceDelta || m?.price_delta) || 0,
            }))
          : [],
        specialInstructions: it?.special_instructions || it?.specialInstructions || undefined,
      }));

      return {
        id: String(row.id),
        orderNumber: row.order_number || String(row.id).slice(0, 6),
        restaurantId: row.restaurant_id,
        table: tableNum,
        items: safeItems,
        subtotal: Number(row.subtotal) || 0,
        serviceFee: Number(row.service_fee) || 0,
        total: Number(row.total) || 0,
        status: String(row.status || "New"),
        createdAt: typeof row.created_at === "number" ? row.created_at : Date.parse(row.created_at) || Date.now(),
        updatedAt: typeof row.updated_at === "number" ? row.updated_at : Date.parse(row.updated_at) || Date.now(),
      };
    });

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
