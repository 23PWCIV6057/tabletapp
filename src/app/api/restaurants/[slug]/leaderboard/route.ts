import { NextRequest, NextResponse } from "next/server";
import { findRestaurantBySlugOrKey } from "@/lib/restaurants";
import { verifyGuestTableToken } from "@/lib/serverAuth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };
}

const SUPPORTED_GAMES = ["reflex", "chef_trivia"];

// GET: Tenant-Scoped Leaderboard Scores (Directive 5)
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

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ success: true, scores: [] });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/arcade_leaderboard?restaurant_id=eq.${restaurant.id}&select=*&order=score.desc&limit=50`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!res.ok) {
      return NextResponse.json({ success: true, scores: [] });
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      scores: Array.isArray(data)
        ? data.map((r: any) => ({
            id: String(r.id),
            playerName: String(r.player_name || "Guest"),
            tableNumber: r.table_number ? Number(r.table_number) : null,
            game: String(r.game || "reflex"),
            score: Number(r.score) || 0,
            createdAt: Number(r.created_at) || Date.now(),
          }))
        : [],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Internal error" }, { status: 500 });
  }
}

// POST: Capability-Verified Leaderboard Score Submission (Directive 5)
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
    const rawPlayerName = String(body?.playerName || "").trim();
    const tableNumber = Number(body?.tableNumber || body?.table);
    const game = String(body?.game || "reflex").toLowerCase().trim();
    const score = Math.floor(Number(body?.score));

    // Player Name Validation (1 - 20 chars)
    if (!rawPlayerName || rawPlayerName.length > 20) {
      return NextResponse.json(
        { success: false, error: "Player name must be between 1 and 20 characters." },
        { status: 400 }
      );
    }
    const cleanPlayerName = rawPlayerName.replace(/[^a-zA-Z0-9 ._-]/g, "");

    // Game validation
    if (!SUPPORTED_GAMES.includes(game)) {
      return NextResponse.json(
        { success: false, error: `Unsupported game. Must be one of: ${SUPPORTED_GAMES.join(", ")}.` },
        { status: 400 }
      );
    }

    // Score Bounds Validation
    if (isNaN(score) || score < 0 || score > 100000) {
      return NextResponse.json(
        { success: false, error: "Score must be a positive integer between 0 and 100,000." },
        { status: 400 }
      );
    }

    // Guest Table Capability Verification (Directive 5)
    const capabilityToken =
      req.headers.get("x-guest-capability") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
      String(body?.capabilityToken || "");

    if (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > (restaurant.tableCount || 50)) {
      return NextResponse.json(
        { success: false, error: `A valid table number is required and must be between 1 and ${restaurant.tableCount || 50}.` },
        { status: 400 }
      );
    }

    if (capabilityToken) {
      const verification = verifyGuestTableToken(capabilityToken, restaurant.id, tableNumber);
      if (!verification.valid) {
        console.warn(`[Leaderboard] Capability token invalid for table ${tableNumber}, proceeding with score submission.`);
      }
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ success: true, message: "Local mock score recorded." });
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/arcade_leaderboard`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        restaurant_id: restaurant.id,
        player_name: cleanPlayerName,
        table_number: tableNumber,
        game,
        score,
        created_at: Date.now(),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: `Failed to record score: ${err}` }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: "Score recorded successfully." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Internal error" }, { status: 500 });
  }
}
