import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { findRestaurantBySlugOrKey, INITIAL_RESTAURANTS, isRestaurantSuspended } from "@/lib/restaurants";

const DEFAULT_STAFF_PIN = process.env.STAFF_PIN || "1234";
const DEFAULT_OWNER_PIN = process.env.OWNER_PIN || "8888";
const TOKEN_SECRET = process.env.AUTH_SECRET || "tabletapp_default_hmac_secret_2026";

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function signSessionToken(role: "kitchen" | "owner", restaurantId: string, unlockedAt: number): string {
  const payload = `${restaurantId}:${role}:${unlockedAt}`;
  const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
  return `${payload}:${sig}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
    const requestedRole = body?.requestedRole === "owner" ? "owner" : "kitchen";
    const restaurantIdentifier = typeof body?.restaurant === "string" ? body.restaurant.trim() : "";

    if (!/^[0-9]{4,8}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: "PIN must be 4–8 digits." },
        { status: 400 }
      );
    }

    // Resolve tenant specific PINs
    const matchedRestaurant = restaurantIdentifier ? findRestaurantBySlugOrKey(restaurantIdentifier) : INITIAL_RESTAURANTS[0];
    const targetSlug = matchedRestaurant?.slug || restaurantIdentifier || "heatbox";
    if (matchedRestaurant?.status === "suspended" || isRestaurantSuspended(targetSlug)) {
      return NextResponse.json(
        { success: false, error: "This restaurant is currently suspended by management. Staff access is blocked." },
        { status: 403 }
      );
    }
    const targetOwnerPin = matchedRestaurant?.ownerPin || DEFAULT_OWNER_PIN;
    const targetStaffPin = matchedRestaurant?.staffPin || DEFAULT_STAFF_PIN;
    const tenantId = matchedRestaurant?.id || "global";

    const isOwnerMatch = safeCompare(pin, targetOwnerPin);
    const isStaffMatch = safeCompare(pin, targetStaffPin);

    if (requestedRole === "owner") {
      if (isOwnerMatch) {
        const unlockedAt = Date.now();
        return NextResponse.json({
          success: true,
          role: "owner",
          restaurantId: tenantId,
          unlockedAt,
          sessionToken: signSessionToken("owner", tenantId, unlockedAt),
        });
      }
      return NextResponse.json(
        { success: false, error: "Invalid Manager PIN." },
        { status: 401 }
      );
    }

    // Kitchen role: either Staff PIN or Manager PIN unlocks KDS
    if (isStaffMatch || isOwnerMatch) {
      const resolvedRole = isOwnerMatch ? "owner" : "kitchen";
      const unlockedAt = Date.now();
      return NextResponse.json({
        success: true,
        role: resolvedRole,
        restaurantId: tenantId,
        unlockedAt,
        sessionToken: signSessionToken(resolvedRole, tenantId, unlockedAt),
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid Staff PIN." },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Authentication request failed." },
      { status: 500 }
    );
  }
}
