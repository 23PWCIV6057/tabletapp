import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const STAFF_PIN = process.env.STAFF_PIN || "1234";
const OWNER_PIN = process.env.OWNER_PIN || "8888";
const TOKEN_SECRET = process.env.AUTH_SECRET || "tabletapp_default_hmac_secret_2026";

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function signSessionToken(role: "kitchen" | "owner", unlockedAt: number): string {
  const payload = `${role}:${unlockedAt}`;
  const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
  return `${payload}:${sig}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
    const requestedRole = body?.requestedRole === "owner" ? "owner" : "kitchen";

    if (!/^[0-9]{4,8}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: "PIN must be 4–8 digits." },
        { status: 400 }
      );
    }

    const isOwnerMatch = safeCompare(pin, OWNER_PIN);
    const isStaffMatch = safeCompare(pin, STAFF_PIN);

    if (requestedRole === "owner") {
      if (isOwnerMatch) {
        const unlockedAt = Date.now();
        return NextResponse.json({
          success: true,
          role: "owner",
          unlockedAt,
          sessionToken: signSessionToken("owner", unlockedAt),
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
        unlockedAt,
        sessionToken: signSessionToken(resolvedRole, unlockedAt),
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
