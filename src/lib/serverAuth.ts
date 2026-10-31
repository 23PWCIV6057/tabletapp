import crypto from "crypto";

export function getTokenSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET must be configured in server environment variables");
  }
  return secret;
}

export function signSessionToken(
  role: "kitchen" | "owner",
  restaurantId: string,
  unlockedAt: number
): string {
  const payload = `${restaurantId}:${role}:${unlockedAt}`;
  const sig = crypto.createHmac("sha256", getTokenSecret()).update(payload).digest("hex");
  return `${payload}:${sig}`;
}

export function verifySessionToken(token: string | undefined): {
  valid: boolean;
  role?: "kitchen" | "owner";
  restaurantId?: string;
} {
  if (!token || typeof token !== "string") return { valid: false };
  const parts = token.split(":");
  if (parts.length !== 4) return { valid: false };
  const [restaurantId, role, unlockedAtStr, sig] = parts;
  if (role !== "kitchen" && role !== "owner") return { valid: false };
  const unlockedAt = Number(unlockedAtStr);
  if (isNaN(unlockedAt) || Date.now() - unlockedAt > 12 * 60 * 60 * 1000) {
    return { valid: false }; // Expired after 12 hours
  }
  let secret: string;
  try {
    secret = getTokenSecret();
  } catch {
    return { valid: false };
  }
  const payload = `${restaurantId}:${role}:${unlockedAtStr}`;
  const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const bufSig = Buffer.from(sig);
  const bufExpected = Buffer.from(expectedSig);
  if (bufSig.length !== bufExpected.length) return { valid: false };
  if (!crypto.timingSafeEqual(bufSig, bufExpected)) return { valid: false };
  return { valid: true, role, restaurantId };
}

// Expiring guest table session capability (Finding SEC-001 & SEC-004)
export function signGuestTableToken(
  restaurantId: string,
  tableNumber: number,
  ttlHours: number = 4
): string {
  const expiresAt = Date.now() + ttlHours * 60 * 60 * 1000;
  const payload = `guest:${restaurantId}:${tableNumber}:${expiresAt}`;
  const sig = crypto.createHmac("sha256", getTokenSecret()).update(payload).digest("hex");
  return `${payload}:${sig}`;
}

export function verifyGuestTableToken(
  token: string | undefined,
  expectedRestaurantId: string,
  expectedTableNumber?: number
): { valid: boolean; restaurantId?: string; tableNumber?: number; expiresAt?: number } {
  if (!token || typeof token !== "string") return { valid: false };
  const parts = token.split(":");
  if (parts.length !== 5) return { valid: false };
  const [prefix, restaurantId, tableStr, expiresAtStr, sig] = parts;
  if (prefix !== "guest") return { valid: false };
  if (restaurantId !== expectedRestaurantId && expectedRestaurantId !== "global") return { valid: false };

  const tableNumber = Number(tableStr);
  const expiresAt = Number(expiresAtStr);
  if (isNaN(tableNumber) || isNaN(expiresAt)) return { valid: false };
  if (Date.now() > expiresAt) return { valid: false }; // Expired

  if (expectedTableNumber !== undefined && tableNumber !== expectedTableNumber) {
    return { valid: false };
  }

  let secret: string;
  try {
    secret = getTokenSecret();
  } catch {
    return { valid: false };
  }

  const payload = `guest:${restaurantId}:${tableStr}:${expiresAtStr}`;
  const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const bufSig = Buffer.from(sig);
  const bufExpected = Buffer.from(expectedSig);
  if (bufSig.length !== bufExpected.length) return { valid: false };
  if (!crypto.timingSafeEqual(bufSig, bufExpected)) return { valid: false };

  return { valid: true, restaurantId, tableNumber, expiresAt };
}
