import { NextRequest, NextResponse } from "next/server";
import { findRestaurantBySlugOrKey } from "@/lib/restaurants";
import { verifySessionToken } from "@/lib/serverAuth";
import { isRequestDevAuthenticated } from "@/lib/devAuth";
import { TableOccupancyStatus, TableSession } from "@/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const VALID_STATUSES = new Set<TableOccupancyStatus>([
  "VACANT",
  "SEATED",
  "ACTIVE_ORDER",
  "SERVED",
  "BILL_REQUESTED",
]);

function headers(prefer?: string) {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function authorize(req: NextRequest, restaurantId: string) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const session = verifySessionToken(token);
  const isDev = isRequestDevAuthenticated(req);
  return (
    isDev ||
    (session.valid &&
      (session.role === "kitchen" || session.role === "owner") &&
      (!session.restaurantId || session.restaurantId === restaurantId || session.restaurantId === "global"))
  );
}

function mapRow(row: Record<string, unknown>): TableSession {
  return {
    tableNumber: Number(row.table_number),
    status: row.status as TableOccupancyStatus,
    seatedAt: row.seated_at ? Date.parse(String(row.seated_at)) : undefined,
    lastActivityAt: row.last_activity_at ? Date.parse(String(row.last_activity_at)) : Date.now(),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const restaurant = findRestaurantBySlugOrKey((slug || "").toLowerCase().trim());
  if (!restaurant) return NextResponse.json({ success: false, error: "Restaurant not found." }, { status: 404 });
  if (!(await authorize(req, restaurant.id))) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ success: false, error: "Table session storage is not configured." }, { status: 503 });
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/table_sessions?restaurant_id=eq.${restaurant.id}&select=table_number,status,seated_at,last_activity_at&order=table_number.asc`,
    { headers: headers(), cache: "no-store" }
  );
  if (!res.ok) {
    return NextResponse.json({ success: false, error: "Unable to load table sessions." }, { status: 502 });
  }
  const rows = await res.json();
  return NextResponse.json({
    success: true,
    sessions: Array.isArray(rows) ? rows.map(mapRow) : [],
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const restaurant = findRestaurantBySlugOrKey((slug || "").toLowerCase().trim());
  if (!restaurant) return NextResponse.json({ success: false, error: "Restaurant not found." }, { status: 404 });
  if (!(await authorize(req, restaurant.id))) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ success: false, error: "Table session storage is not configured." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const tableNumber = Number(body?.tableNumber);
  const status = body?.status as TableOccupancyStatus;
  if (
    !Number.isInteger(tableNumber) ||
    tableNumber < 1 ||
    tableNumber > (restaurant.tableCount || 50) ||
    !VALID_STATUSES.has(status)
  ) {
    return NextResponse.json({ success: false, error: "Invalid table session." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const row = {
    restaurant_id: restaurant.id,
    table_number: tableNumber,
    status,
    seated_at: status === "SEATED" ? body?.seatedAt ? new Date(Number(body.seatedAt)).toISOString() : now : null,
    last_activity_at: now,
    updated_at: now,
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/table_sessions`, {
    method: "POST",
    headers: headers("resolution=merge-duplicates,return=representation"),
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    return NextResponse.json({ success: false, error: "Unable to save table session." }, { status: 502 });
  }
  const saved = await res.json();
  return NextResponse.json({ success: true, session: Array.isArray(saved) && saved[0] ? mapRow(saved[0]) : mapRow(row) });
}
