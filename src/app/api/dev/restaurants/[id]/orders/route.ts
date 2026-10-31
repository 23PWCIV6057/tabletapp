import { NextRequest, NextResponse } from "next/server";
import { isRequestDevAuthenticated } from "@/lib/devAuth";
import { findRestaurantBySlugOrKey, fetchFleetFromSupabase } from "@/lib/restaurants";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

function getHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Prefer: "return=representation",
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRequestDevAuthenticated(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized access." }, { status: 401 });
  }

  await fetchFleetFromSupabase();
  const { id } = await params;
  const restaurant = findRestaurantBySlugOrKey(id);
  if (!restaurant) {
    return NextResponse.json({ success: false, error: "Restaurant not found." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format");

  // Fetch orders matching this restaurant_id from Supabase if configured
  let orders: any[] = [];
  if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes("your-project-id")) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?restaurant_id=eq.${restaurant.id}&select=*,order_items(*)&order=created_at.desc`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (res.ok) {
        orders = await res.json();
      }
    } catch {
      // Fallback
    }
  }

  // Format as CSV if requested
  if (format === "csv") {
    const csvRows = [
      ["Order ID", "Order #", "Table", "Status", "Total", "Items", "Created At"].join(","),
    ];

    for (const ord of orders) {
      const itemsStr = ((ord.order_items as any[]) || [])
        .map((i) => `${i.quantity}x ${i.name}`)
        .join(" | ");
      csvRows.push(
        [
          `"${ord.id}"`,
          `"${ord.order_number}"`,
          `"${ord.table_number}"`,
          `"${ord.status}"`,
          `"${ord.total}"`,
          `"${itemsStr.replace(/"/g, '""')}"`,
          `"${ord.created_at}"`,
        ].join(",")
      );
    }

    return new Response(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${restaurant.slug}-orders-backup.csv"`,
      },
    });
  }

  return NextResponse.json({
    success: true,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    orderCount: orders.length,
    orders,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRequestDevAuthenticated(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized access." }, { status: 401 });
  }

  await fetchFleetFromSupabase();
  const { id } = await params;
  const restaurant = findRestaurantBySlugOrKey(id);
  if (!restaurant) {
    return NextResponse.json({ success: false, error: "Restaurant not found." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "factory_reset";

  let deletedCount = 0;

  // Supabase scoped deletion
  if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes("your-project-id")) {
    try {
      let queryUrl = `${SUPABASE_URL}/rest/v1/orders?restaurant_id=eq.${restaurant.id}`;
      if (mode === "active_only") {
        queryUrl += "&status=not.in.(Served,Archived)";
      }

      const res = await fetch(queryUrl, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok) {
        const deleted = await res.json();
        deletedCount = Array.isArray(deleted) ? deleted.length : 1;
      }
    } catch (err) {
      console.error("Supabase order wipe error:", err);
    }
  }

  return NextResponse.json({
    success: true,
    mode,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    deletedCount,
    clearedAt: Date.now(),
  });
}
