import { NextRequest, NextResponse } from "next/server";
import { isRequestDevAuthenticated } from "@/lib/devAuth";
import { verifySessionToken } from "@/lib/serverAuth";
import { findRestaurantBySlugOrKey } from "@/lib/restaurants";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const cleanSlug = (slug || "").toLowerCase().trim();
    const restaurant = findRestaurantBySlugOrKey(cleanSlug);

    // 1. Authorization Gate (Finding SEC-006): Owner or Dev Authentication Required
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const session = verifySessionToken(token);
    const isDev = isRequestDevAuthenticated(req);

    const isAuthorizedOwner = session.valid && session.role === "owner" && (!session.restaurantId || session.restaurantId === restaurant?.id || session.restaurantId === "global");

    if (!isAuthorizedOwner && !isDev) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Manager session token or Developer credentials required." },
        { status: 401 }
      );
    }

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: `Restaurant "${cleanSlug}" not found.` },
        { status: 404 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json(
        { success: false, error: "Supabase database is not configured." },
        { status: 503 }
      );
    }

    // 2. Perform Tenant-Scoped Deletion in arcade_leaderboard
    const targetRestaurantId = restaurant.id;
    const deleteUrl = `${SUPABASE_URL}/rest/v1/arcade_leaderboard?restaurant_id=eq.${targetRestaurantId}`;

    const res = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { success: false, error: `Failed to reset leaderboard in Supabase: ${errText}` },
        { status: res.status }
      );
    }

    // 3. Security Audit Log
    console.info(
      `[SECURITY AUDIT] Arcade leaderboard reset for restaurant "${cleanSlug}" (${targetRestaurantId}) by ${
        isDev ? "Developer" : "Restaurant Owner"
      } at ${new Date().toISOString()}`
    );

    return NextResponse.json({
      success: true,
      message: `Leaderboard successfully reset to zero for ${restaurant.name}.`,
      restaurantId: targetRestaurantId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
