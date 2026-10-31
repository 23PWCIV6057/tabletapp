import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { findRestaurantBySlugOrKey } from "@/lib/restaurants";
import { verifyGuestTableToken, verifySessionToken } from "@/lib/serverAuth";
import { isRequestDevAuthenticated } from "@/lib/devAuth";
import { ServiceRequest, ServiceType } from "@/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };
}

// GET: Staff Service Requests (Finding SEC-001 & SEC-004: Server-Authorized)
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
      return NextResponse.json(
        { success: false, error: "Unauthorized. Staff or Manager token required." },
        { status: 401 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ success: true, requests: [] });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/service_requests?restaurant_id=eq.${restaurant.id}&status=eq.Pending&select=*&order=created_at.desc&limit=50`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!res.ok) {
      return NextResponse.json({ success: true, requests: [] });
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ success: true, requests: [] });
    }

    const requests: ServiceRequest[] = data.map((row: any) => ({
      id: String(row.id),
      restaurantId: row.restaurant_id,
      table: Number(row.table_number) || 1,
      type: (row.type as ServiceType) || "Call Waiter",
      status: (row.status as "Pending" | "Resolved") || "Pending",
      createdAt: Number(row.created_at) || Date.now(),
      resolvedAt: row.resolved_at ? Number(row.resolved_at) : undefined,
    }));

    return NextResponse.json({ success: true, requests });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Internal error" }, { status: 500 });
  }
}

// POST: Guest Service Request (Finding SEC-001 & SEC-004: Validated Server-Side)
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

    const body = await req.json();
    const tableNumber = Number(body?.table || body?.table_number);
    const type = body?.type as ServiceType;
    const capabilityToken =
      req.headers.get("x-guest-capability") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
      String(body?.capabilityToken || "");

    const validTypes: ServiceType[] = [
      "Call Waiter",
      "Extra Napkins",
      "Sauces & Condiments",
      "Request Bill",
    ];

    if (!tableNumber || tableNumber < 1 || tableNumber > (restaurant.tableCount || 50)) {
      return NextResponse.json(
        { success: false, error: `Invalid table number. Must be between 1 and ${restaurant.tableCount || 50}.` },
        { status: 400 }
      );
    }

    if (!validTypes.includes(type)) {
      return NextResponse.json({ success: false, error: "Invalid service request type." }, { status: 400 });
    }

    if (!capabilityToken) {
      return NextResponse.json(
        { success: false, error: "A valid guest table capability token is required." },
        { status: 401 }
      );
    }

    const capability = verifyGuestTableToken(capabilityToken, restaurant.id, tableNumber);
    if (!capability.valid) {
      return NextResponse.json(
        { success: false, error: "Invalid, expired, or cross-tenant table capability token." },
        { status: 403 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ success: false, error: "Database not configured." }, { status: 503 });
    }

    const reqId =
      typeof body?.id === "string" && /^srv_[a-zA-Z0-9_-]{8,80}$/.test(body.id)
        ? body.id
        : crypto.randomUUID();
    const payload = {
      id: reqId,
      restaurant_id: restaurant.id,
      table_number: tableNumber,
      type,
      status: "Pending",
      created_at: new Date().toISOString(),
    };

    const existingRes = await fetch(
      `${SUPABASE_URL}/rest/v1/service_requests?id=eq.${encodeURIComponent(reqId)}&restaurant_id=eq.${encodeURIComponent(restaurant.id)}&select=id&limit=1`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (existingRes.ok) {
      const existingRows = await existingRes.json();
      if (Array.isArray(existingRows) && existingRows[0]) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          request: {
            id: reqId,
            restaurantId: restaurant.id,
            table: tableNumber,
            type,
            status: "Pending",
            createdAt: Date.now(),
          },
        });
      }
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/service_requests`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      if (res.status === 409) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          request: {
            id: reqId,
            restaurantId: restaurant.id,
            table: tableNumber,
            type,
            status: "Pending",
            createdAt: Date.now(),
          },
        });
      }
      const errText = await res.text();
      return NextResponse.json({ success: false, error: `Failed to insert request: ${errText}` }, { status: res.status });
    }

    return NextResponse.json({
      success: true,
      request: {
        id: reqId,
        restaurantId: restaurant.id,
        table: tableNumber,
        type,
        status: "Pending",
        createdAt: Date.now(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Internal error" }, { status: 500 });
  }
}
