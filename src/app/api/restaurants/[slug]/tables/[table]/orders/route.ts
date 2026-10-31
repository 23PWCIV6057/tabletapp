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

    // Capability Extraction & Cryptographic Verification (Directive 1)
    const authHeader = req.headers.get("authorization") || "";
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    const customHeaderToken = req.headers.get("x-guest-capability") || "";
    const queryToken = req.nextUrl.searchParams.get("capability") || "";

    const candidateToken = customHeaderToken || bearerToken || queryToken;

    if (!candidateToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized. Valid guest table session capability required to access table order history.",
        },
        { status: 401 }
      );
    }

    const capability = verifyGuestTableToken(candidateToken, restaurant.id, tableNum);
    if (!capability.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Expired, invalid, or cross-tenant table capability token.",
        },
        { status: 403 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ success: true, orders: [] });
    }

    // Scoped query: strictly restaurant.id AND table_number, ordered by created_at desc, limit 20
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?restaurant_id=eq.${restaurant.id}&table_number=eq.${tableNum}&select=*&order=created_at.desc&limit=20`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!res.ok) {
      return NextResponse.json({ success: true, orders: [] });
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ success: true, orders: [] });
    }

    // Return ONLY the minimum guest-visible order fields (Directive 1)
    const orders = data.map((row: any) => {
      let rawItems = [];
      try {
        rawItems = Array.isArray(row.items)
          ? row.items
          : typeof row.items === "string"
            ? JSON.parse(row.items)
            : [];
      } catch {
        rawItems = [];
      }

      const safeItems = rawItems.map((it: any) => ({
        name: String(it?.name || "Menu Item"),
        quantity: Number(it?.quantity) || 1,
        selectedModifiers: Array.isArray(it?.selectedModifiers)
          ? it.selectedModifiers.map((m: any) => ({
              groupName: String(m?.groupName || ""),
              optionName: String(m?.optionName || ""),
              priceDelta: Number(m?.priceDelta) || 0,
            }))
          : [],
      }));

      return {
        orderNumber: String(row.order_number || ""),
        table: tableNum,
        items: safeItems,
        subtotal: Number(row.subtotal) || 0,
        serviceFee: Number(row.service_fee) || 0,
        total: Number(row.total) || 0,
        status: String(row.status || "New"),
        createdAt: Number(row.created_at) || Date.now(),
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
