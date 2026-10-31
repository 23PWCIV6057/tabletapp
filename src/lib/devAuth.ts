import crypto from "crypto";
import { NextRequest } from "next/server";

export const DEV_COOKIE_NAME = "table_tapp_dev_session";

function getDevPassword(): string {
  const envPass = process.env.DEV_PORTAL_PASSWORD;
  if (envPass) return envPass;
  if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
    throw new Error("CRITICAL: DEV_PORTAL_PASSWORD must be configured in environment");
  }
  return "tabledev2026";
}

function getDevSecret(): string {
  const envSecret = process.env.DEV_AUTH_SECRET;
  if (envSecret) return envSecret;
  if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
    throw new Error("CRITICAL: DEV_AUTH_SECRET must be configured in environment");
  }
  return "table_tapp_super_dev_secret_key_982341";
}

// In-memory rate limiting against BurpSuite / Hydra dictionary attacks
// Max 5 attempts per IP per 15 minutes
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

export function checkRateLimit(clientIp: string): { allowed: boolean; remainingSeconds?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(clientIp);

  if (entry && entry.lockedUntil > now) {
    return {
      allowed: false,
      remainingSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }

  if (entry && entry.lockedUntil <= now) {
    loginAttempts.delete(clientIp);
  }

  return { allowed: true };
}

export function recordFailedAttempt(clientIp: string) {
  const now = Date.now();
  const entry = loginAttempts.get(clientIp) || { count: 0, lockedUntil: 0 };
  entry.count += 1;

  if (entry.count >= 5) {
    entry.lockedUntil = now + 15 * 60 * 1000; // 15-minute lock
  }

  loginAttempts.set(clientIp, entry);
}

export function resetAttempts(clientIp: string) {
  loginAttempts.delete(clientIp);
}

// Timing-safe password comparison
export function verifyDeveloperPassword(inputPassword: string): boolean {
  if (typeof inputPassword !== "string") return false;
  const devPassword = getDevPassword();
  const inputBuffer = Buffer.from(inputPassword.trim());
  const devBuffer = Buffer.from(devPassword.trim());

  if (inputBuffer.length !== devBuffer.length) {
    // Constant time dummy compare to avoid timing leak
    crypto.timingSafeEqual(inputBuffer, inputBuffer);
    return false;
  }

  return crypto.timingSafeEqual(inputBuffer, devBuffer);
}

// Creates an HMAC-SHA256 signed developer token: dev:<timestamp>:<nonce>:<hmac>
export function createDeveloperToken(): string {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = `dev:${timestamp}:${nonce}`;
  const signature = crypto.createHmac("sha256", getDevSecret()).update(payload).digest("hex");
  return `${payload}:${signature}`;
}

// Verifies developer token signature and expiry (valid for 24 hours)
export function verifyDeveloperToken(token: string | undefined): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(":");
  if (parts.length !== 4) return false;

  const [role, timestampStr, nonce, receivedSig] = parts;
  if (role !== "dev") return false;

  const timestamp = Number(timestampStr);
  if (isNaN(timestamp) || Date.now() - timestamp > 24 * 60 * 60 * 1000) {
    return false; // Expired
  }

  const payload = `${role}:${timestampStr}:${nonce}`;
  const expectedSig = crypto.createHmac("sha256", getDevSecret()).update(payload).digest("hex");

  const sigA = Buffer.from(receivedSig);
  const sigB = Buffer.from(expectedSig);

  if (sigA.length !== sigB.length) return false;
  return crypto.timingSafeEqual(sigA, sigB);
}

// Helper to check authentication directly from NextRequest cookies
export function isRequestDevAuthenticated(req: NextRequest): boolean {
  const cookie = req.cookies.get(DEV_COOKIE_NAME)?.value;
  return verifyDeveloperToken(cookie);
}
