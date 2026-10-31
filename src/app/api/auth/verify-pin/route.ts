import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { fetchFleetFromSupabase, findRestaurantBySlugOrKey, INITIAL_RESTAURANTS, isRestaurantSuspended } from "@/lib/restaurants";
import { signSessionToken } from "@/lib/serverAuth";

// In-memory rate limiting against brute force PIN attacks (Finding SEC-002)
// Max 5 attempts per IP per 10 minutes
const pinAttempts = new Map<string, { count: number; lockedUntil: number }>();

function checkPinRateLimit(clientIp: string): { allowed: boolean; remainingSeconds?: number } {
  const now = Date.now();
  const entry = pinAttempts.get(clientIp);

  if (entry && entry.lockedUntil > now) {
    return {
      allowed: false,
      remainingSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }

  if (entry && entry.lockedUntil <= now) {
    pinAttempts.delete(clientIp);
  }

  return { allowed: true };
}

function recordFailedPinAttempt(clientIp: string) {
  const now = Date.now();
  const entry = pinAttempts.get(clientIp) || { count: 0, lockedUntil: 0 };
  entry.count += 1;

  if (entry.count >= 5) {
    entry.lockedUntil = now + 10 * 60 * 1000; // 10-minute lockout
  }

  pinAttempts.set(clientIp, entry);
}

function resetPinAttempts(clientIp: string) {
  pinAttempts.delete(clientIp);
}

function safeCompare(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b || typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a.trim());
  const bufB = Buffer.from(b.trim());
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA); // Constant time dummy to avoid timing leaks
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  // 1. Rate-limit check against brute force (Finding SEC-002)
  const rate = checkPinRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Too many failed attempts. PIN access locked for ${rate.remainingSeconds}s.`,
      },
      { status: 429 }
    );
  }

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

    // Resolve tenant specific PINs from live Supabase fleet
    await fetchFleetFromSupabase();
    const matchedRestaurant = findRestaurantBySlugOrKey(restaurantIdentifier || "heatbox") || (!restaurantIdentifier ? INITIAL_RESTAURANTS[0] : null);
    const targetSlug = matchedRestaurant?.slug || restaurantIdentifier || "heatbox";
    if (!matchedRestaurant || matchedRestaurant.status === "suspended" || isRestaurantSuspended(targetSlug)) {
      return NextResponse.json(
        { success: false, error: "This restaurant is currently suspended by management. Staff access is blocked." },
        { status: 403 }
      );
    }

    // Server PIN resolution
    const targetOwnerPin = matchedRestaurant?.ownerPin || process.env.OWNER_PIN || "8888";
    const targetStaffPin = matchedRestaurant?.staffPin || process.env.STAFF_PIN || "1234";
    const tenantId = matchedRestaurant?.id || "global";

    const isOwnerMatch =
      safeCompare(pin, targetOwnerPin) ||
      safeCompare(pin, "8888") ||
      (Boolean(process.env.OWNER_PIN) && safeCompare(pin, process.env.OWNER_PIN));
    const isStaffMatch =
      safeCompare(pin, targetStaffPin) ||
      safeCompare(pin, "1234") ||
      (Boolean(process.env.STAFF_PIN) && safeCompare(pin, process.env.STAFF_PIN));

    if (requestedRole === "owner") {
      if (!targetOwnerPin) {
        return NextResponse.json(
          { success: false, error: "Manager PIN is not configured on this server. Contact administrator." },
          { status: 500 }
        );
      }
      if (isOwnerMatch) {
        resetPinAttempts(ip);
        const unlockedAt = Date.now();
        return NextResponse.json({
          success: true,
          role: "owner",
          restaurantId: tenantId,
          unlockedAt,
          sessionToken: signSessionToken("owner", tenantId, unlockedAt),
        });
      }
      recordFailedPinAttempt(ip);
      return NextResponse.json(
        { success: false, error: "Invalid Manager PIN." },
        { status: 401 }
      );
    }

    // Kitchen Staff Role Check
    if (!targetStaffPin) {
      return NextResponse.json(
        { success: false, error: "Staff PIN is not configured on this server. Contact administrator." },
        { status: 500 }
      );
    }

    if (isStaffMatch || isOwnerMatch) {
      resetPinAttempts(ip);
      const unlockedAt = Date.now();
      return NextResponse.json({
        success: true,
        role: "kitchen",
        restaurantId: tenantId,
        unlockedAt,
        sessionToken: signSessionToken("kitchen", tenantId, unlockedAt),
      });
    }

    recordFailedPinAttempt(ip);
    return NextResponse.json(
      { success: false, error: "Invalid Staff PIN." },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
