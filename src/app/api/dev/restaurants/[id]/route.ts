import { NextRequest, NextResponse } from "next/server";
import { isRequestDevAuthenticated } from "@/lib/devAuth";
import {
  fetchCustomMenusFromSupabase,
  fetchFleetFromSupabase,
  saveStoredRestaurants,
  syncCustomMenusToSupabase,
  syncFleetToSupabase,
} from "@/lib/restaurants";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

function getHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Prefer: "return=representation",
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRequestDevAuthenticated(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized access." }, { status: 401 });
  }

  const { id } = await params;
  const norm = (id || "").trim().toLowerCase();
  const body = await req.json();

  const all = await fetchFleetFromSupabase();
  const targetIdx = all.findIndex(
    (r) => r.id.toLowerCase() === norm || r.slug.toLowerCase() === norm
  );

  if (targetIdx === -1) {
    return NextResponse.json({ success: false, error: "Restaurant not found." }, { status: 404 });
  }

  const current = all[targetIdx];
  const updated = {
    ...current,
    ...body,
    updatedAt: Date.now(),
  };

  all[targetIdx] = updated;
  saveStoredRestaurants(all);
  await syncFleetToSupabase(all);

  return NextResponse.json({ success: true, restaurant: updated, restaurants: all });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRequestDevAuthenticated(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized access." }, { status: 401 });
  }

  const { id } = await params;
  const norm = (id || "").trim().toLowerCase();

  const all = await fetchFleetFromSupabase();
  const target = all.find(
    (r) => r.id.toLowerCase() === norm || r.slug.toLowerCase() === norm
  );
  const filtered = all.filter(
    (r) => r.id.toLowerCase() !== norm && r.slug.toLowerCase() !== norm
  );

  saveStoredRestaurants(filtered);
  await syncFleetToSupabase(filtered);

  // Remove custom menu from Supabase menu store
  try {
    const menus = await fetchCustomMenusFromSupabase();
    if (target) {
      delete menus[target.slug.toLowerCase()];
      delete menus[target.id.toLowerCase()];
    }
    delete menus[norm];
    await syncCustomMenusToSupabase(menus);
  } catch {
    // Ignore
  }

  // Purge all operational records for this restaurant in Supabase
  const targetId = target?.id || id;
  if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes("your-project-id")) {
    const headers = getHeaders();
    await Promise.allSettled([
      fetch(`${SUPABASE_URL}/rest/v1/orders?restaurant_id=eq.${targetId}`, {
        method: "DELETE",
        headers,
      }),
      fetch(`${SUPABASE_URL}/rest/v1/service_requests?restaurant_id=eq.${targetId}`, {
        method: "DELETE",
        headers,
      }),
      fetch(`${SUPABASE_URL}/rest/v1/menu_items?restaurant_id=eq.${targetId}`, {
        method: "DELETE",
        headers,
      }),
      fetch(`${SUPABASE_URL}/rest/v1/categories?restaurant_id=eq.${targetId}`, {
        method: "DELETE",
        headers,
      }),
      fetch(`${SUPABASE_URL}/rest/v1/restaurants?id=eq.${targetId}`, {
        method: "DELETE",
        headers,
      }),
    ]);
  }

  return NextResponse.json({
    success: true,
    restaurants: filtered,
    message: "Restaurant and all associated data removed permanently.",
  });
}
