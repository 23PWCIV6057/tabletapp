import { NextRequest, NextResponse } from "next/server";
import {
  fetchCustomMenusFromSupabase,
  fetchFleetFromSupabase,
  saveStoredRestaurants,
} from "@/lib/restaurants";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const normalized = (slug || "heatbox").trim().toLowerCase();

  const fleet = await fetchFleetFromSupabase();
  saveStoredRestaurants(fleet);

  const found = fleet.find(
    (r) =>
      r.slug.toLowerCase() === normalized ||
      r.accessKey.toLowerCase() === normalized ||
      r.id.toLowerCase() === normalized
  );

  if (found) {
    const menus = await fetchCustomMenusFromSupabase();
    const customMenu =
      menus[found.slug.toLowerCase()] || menus[found.id.toLowerCase()] || null;
    return NextResponse.json({
      success: true,
      id: found.id,
      slug: found.slug,
      name: found.name,
      status: found.status || "active",
      restaurant: found,
      menu: customMenu,
    });
  }

  // If a tenant slug was deleted or does not exist in fleet, block it as suspended
  return NextResponse.json({
    success: true,
    slug: normalized,
    status: "suspended",
    deleted: true,
  });
}
