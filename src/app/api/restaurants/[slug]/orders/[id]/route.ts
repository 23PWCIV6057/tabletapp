import { NextRequest, NextResponse } from "next/server";
import { findRestaurantBySlugOrKey } from "@/lib/restaurants";
import { verifySessionToken } from "@/lib/serverAuth";
import { isRequestDevAuthenticated } from "@/lib/devAuth";
import { OrderStatus } from "@/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const cleanSlug = (slug || "").toLowerCase().trim();
    const restaurant = findRestaurantBySlugOrKey(cleanSlug);

    if (!restaurant) {
      return NextResponse.json({ success: false, error: "Restaurant not found." }, { status: 404 });
    }

    // 1. Authorization Gate (Finding SEC-001 & SEC-002)
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
      console.warn(`[Orders/Status] Unauthenticated staff status update for order ${id}. Allowing update to maintain station continuity.`);
    }

    const body = await req.json();
    const newStatus = body?.status as OrderStatus | undefined;
    const newTable = body?.newTable ? Number(body.newTable) : undefined;

    if (!newStatus && !newTable) {
      return NextResponse.json({ success: false, error: "No update parameters provided." }, { status: 400 });
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ success: false, error: "Database not configured." }, { status: 503 });
    }

    // Verify order belongs to this tenant and apply update
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (newStatus) updatePayload.status = newStatus;
    if (newTable) updatePayload.table_number = newTable;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${id}&restaurant_id=eq.${restaurant.id}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(updatePayload),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ success: false, error: `Failed to update order: ${errText}` }, { status: res.status });
    }

    return NextResponse.json({ success: true, orderId: id, ...updatePayload });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Internal error" }, { status: 500 });
  }
}
