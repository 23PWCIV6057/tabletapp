import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  createDeveloperToken,
  DEV_COOKIE_NAME,
  isRequestDevAuthenticated,
  recordFailedAttempt,
  resetAttempts,
  verifyDeveloperPassword,
} from "@/lib/devAuth";

export async function GET(req: NextRequest) {
  const isAuth = isRequestDevAuthenticated(req);
  if (!isAuth) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, role: "developer" });
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  // 1. Rate-limit check against brute force
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Too many failed login attempts. Temporarily locked for ${rate.remainingSeconds}s.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const password = typeof body?.password === "string" ? body.password : "";

    // 2. Timing-safe password verification
    const isValid = verifyDeveloperPassword(password);
    if (!isValid) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { success: false, error: "Invalid developer master key." },
        { status: 401 }
      );
    }

    // 3. Reset rate limiter on success
    resetAttempts(ip);

    // 4. Issue HMAC-SHA256 signed session cookie
    const token = createDeveloperToken();
    const res = NextResponse.json({ success: true, role: "developer" });

    res.cookies.set({
      name: DEV_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return res;
  } catch {
    return NextResponse.json(
      { success: false, error: "Malformed request payload." },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, message: "Logged out." });
  res.cookies.set({
    name: DEV_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
  });
  return res;
}
