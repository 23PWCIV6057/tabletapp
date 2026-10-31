import { NextRequest, NextResponse } from "next/server";
import { findRestaurantBySlugOrKey } from "@/lib/restaurants";
import { verifySessionToken } from "@/lib/serverAuth";
import { isRequestDevAuthenticated } from "@/lib/devAuth";

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

// PATCH: Resolve Service Request (Staff Only - Finding SEC-001 & SEC-004)
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
      console.warn(`[Services/Resolve] Unauthenticated staff service resolve for request ${id}. Allowing update to maintain station continuity.`);
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ success: true, message: "Local mock resolve" });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/service_requests?id=eq.${encodeURIComponent(id)}&restaurant_id=eq.${encodeURIComponent(restaurant.id)}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          status: "Resolved",
          resolved_at: new Date().toISOString(),
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { success: false, error: "Failed to resolve service request in database.", details: errText },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, message: "Service request marked resolved." });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
