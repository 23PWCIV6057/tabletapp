import { NextRequest, NextResponse } from "next/server";
import { isRequestDevAuthenticated } from "@/lib/devAuth";
import {
  fetchCustomMenusFromSupabase,
  fetchFleetFromSupabase,
  syncCustomMenusToSupabase,
} from "@/lib/restaurants";
import { HEATBOX_MENU_DATA } from "@/lib/presets";
import { MenuItem } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRequestDevAuthenticated(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized access." }, { status: 401 });
  }

  const { id } = await params;
  const norm = (id || "").trim().toLowerCase();
  const fleet = await fetchFleetFromSupabase();
  const restaurant = fleet.find(
    (r) => r.id.toLowerCase() === norm || r.slug.toLowerCase() === norm
  );
  if (!restaurant) {
    return NextResponse.json({ success: false, error: "Restaurant not found." }, { status: 404 });
  }

  const menus = await fetchCustomMenusFromSupabase();
  const customMenu =
    menus[restaurant.slug.toLowerCase()] || menus[restaurant.id.toLowerCase()];
  if (Array.isArray(customMenu) && customMenu.length > 0) {
    return NextResponse.json({ success: true, menu: customMenu });
  }

  if (restaurant.slug === "heatbox") {
    return NextResponse.json({ success: true, menu: HEATBOX_MENU_DATA });
  }

  return NextResponse.json({ success: true, menu: [] });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRequestDevAuthenticated(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized access." }, { status: 401 });
  }

  const { id } = await params;
  const norm = (id || "").trim().toLowerCase();
  const fleet = await fetchFleetFromSupabase();
  const restaurant = fleet.find(
    (r) => r.id.toLowerCase() === norm || r.slug.toLowerCase() === norm
  );
  if (!restaurant) {
    return NextResponse.json({ success: false, error: "Restaurant not found." }, { status: 404 });
  }

  const body = await req.json();
  const items: MenuItem[] = Array.isArray(body?.menu) ? body.menu : [];

  const menus = await fetchCustomMenusFromSupabase();
  menus[restaurant.slug.toLowerCase()] = items;
  menus[restaurant.id.toLowerCase()] = items;
  await syncCustomMenusToSupabase(menus);

  return NextResponse.json({ success: true, count: items.length, menu: items });
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
  const fleet = await fetchFleetFromSupabase();
  const restaurant = fleet.find(
    (r) => r.id.toLowerCase() === norm || r.slug.toLowerCase() === norm
  );
  if (!restaurant) {
    return NextResponse.json({ success: false, error: "Restaurant not found." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) {
    return NextResponse.json({ success: false, error: "Missing itemId parameter." }, { status: 400 });
  }

  const menus = await fetchCustomMenusFromSupabase();
  const existing =
    menus[restaurant.slug.toLowerCase()] ||
    menus[restaurant.id.toLowerCase()] ||
    (restaurant.slug === "heatbox" ? HEATBOX_MENU_DATA : []);
  const filtered = existing.filter((m) => String(m.id) !== String(itemId));
  menus[restaurant.slug.toLowerCase()] = filtered;
  menus[restaurant.id.toLowerCase()] = filtered;
  await syncCustomMenusToSupabase(menus);

  return NextResponse.json({ success: true, deletedId: itemId });
}
