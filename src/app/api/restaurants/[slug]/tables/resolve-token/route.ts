import { NextRequest, NextResponse } from "next/server";
import { findRestaurantBySlugOrKey } from "@/lib/restaurants";
import { signGuestTableToken } from "@/lib/serverAuth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// POST: Server-side QR Stand Token Resolution (Directive 4)
// Resolves physical QR stand tokens server-side and issues cryptographically signed guest capabilities.
export async function POST(
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

    const body = await req.json().catch(() => ({}));
    const rawToken = String(body?.token || "").trim();
    if (!rawToken || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { success: false, error: "Table token resolution is unavailable." },
        { status: 503 }
      );
    }

    const lookup = await fetch(
      `${SUPABASE_URL}/rest/v1/dining_tables?restaurant_id=eq.${encodeURIComponent(restaurant.id)}&qr_code_token=eq.${encodeURIComponent(rawToken)}&is_active=eq.true&select=table_number&limit=1`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        cache: "no-store",
      }
    );
    if (!lookup.ok) {
      return NextResponse.json(
        { success: false, error: "Table token resolution failed." },
        { status: 502 }
      );
    }

    const rows = await lookup.json();
    const matchedTable =
      Array.isArray(rows) && rows.length === 1 ? Number(rows[0]?.table_number) : null;
    const maxTables = restaurant.tableCount || 16;

    if (!matchedTable || matchedTable < 1 || matchedTable > maxTables) {
      return NextResponse.json(
        { success: false, error: "Invalid, expired, or unrecognized table QR stand." },
        { status: 404 }
      );
    }

    // Issue an expiring guest session capability token (4 hours TTL)
    const capabilityToken = signGuestTableToken(restaurant.id, matchedTable, 4);

    const now = new Date().toISOString();
    const sessionRes = await fetch(`${SUPABASE_URL}/rest/v1/table_sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        restaurant_id: restaurant.id,
        table_number: matchedTable,
        status: "SEATED",
        seated_at: now,
        last_activity_at: now,
        updated_at: now,
      }),
    });
    if (!sessionRes.ok) {
      const errorText = await sessionRes.text();
      return NextResponse.json(
        { success: false, error: "Table session could not be activated.", details: errorText },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      tableNumber: matchedTable,
      capabilityToken,
      expiresInHours: 4,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
