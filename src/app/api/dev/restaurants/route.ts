import { NextRequest, NextResponse } from "next/server";
import { isRequestDevAuthenticated } from "@/lib/devAuth";
import {
  fetchCustomMenusFromSupabase,
  fetchFleetFromSupabase,
  generateAccessKey,
  saveStoredRestaurants,
  syncCustomMenusToSupabase,
  syncFleetToSupabase,
} from "@/lib/restaurants";
import { MenuItem, Restaurant } from "@/types";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  if (!isRequestDevAuthenticated(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized access." }, { status: 401 });
  }

  const restaurants = await fetchFleetFromSupabase();
  saveStoredRestaurants(restaurants);
  return NextResponse.json({ success: true, count: restaurants.length, restaurants });
}

export async function POST(req: NextRequest) {
  if (!isRequestDevAuthenticated(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized access." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ success: false, error: "Restaurant name is required." }, { status: 400 });
    }

    const currentList = await fetchFleetFromSupabase();
    const rawSlug = (body.slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    let slug = rawSlug || `rest-${Date.now().toString(36)}`;

    let counter = 1;
    while (currentList.some((r) => r.slug.toLowerCase() === slug.toLowerCase())) {
      slug = `${rawSlug}-${counter++}`;
    }

    const accessKey = generateAccessKey(slug);
    const newId = crypto.randomUUID ? crypto.randomUUID() : `rest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newRestaurant: Restaurant = {
      id: newId,
      slug,
      accessKey,
      name,
      tagline: body.tagline?.trim() || `${body.city || "Peshawar"} Branch`,
      address: body.address?.trim() || "",
      city: body.city?.trim() || "Peshawar",
      phone: body.phone?.trim() || "",
      currency: body.currency === "USD" ? "USD" : "PKR",
      currencySymbol: body.currency === "USD" ? "$" : "Rs.",
      status: "active",
      staffPin: body.staffPin?.trim() || "1234",
      ownerPin: body.ownerPin?.trim() || "8888",
      securityMode: body.securityMode || "hybrid_gps",
      dailyDineInCode: body.dailyDineInCode?.trim() || "42",
      wifiSsid: body.wifiSsid?.trim() || `${name.replace(/\s+/g, "_")}_Guest_WiFi`,
      wifiPassword: body.wifiPassword?.trim() || "dinein2026",
      arcadePrizeText: body.arcadePrizeText?.trim() || "Win a Free Dessert or Drink on #1 Daily Score!",
      serviceFeePercent: Number(body.serviceFeePercent) || 0,
      tableCount: Math.min(64, Math.max(1, Number(body.tableCount) || 16)),
      latitude: Number(body.latitude) || 34.0151,
      longitude: Number(body.longitude) || 71.5249,
      radiusMeters: Number(body.radiusMeters) || 150,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [newRestaurant, ...currentList];
    saveStoredRestaurants(updated);
    await syncFleetToSupabase(updated);

    if (Array.isArray(body.menuItems) && body.menuItems.length > 0) {
      const menus = await fetchCustomMenusFromSupabase();
      const taggedItems: MenuItem[] = body.menuItems.map((m: MenuItem, idx: number) => ({
        ...m,
        id: m.id || idx + 1,
        restaurantId: newRestaurant.id,
      }));
      menus[newRestaurant.slug.toLowerCase()] = taggedItems;
      menus[newRestaurant.id.toLowerCase()] = taggedItems;
      await syncCustomMenusToSupabase(menus);
    }

    return NextResponse.json({
      success: true,
      restaurant: newRestaurant,
      restaurants: updated,
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create restaurant." }, { status: 500 });
  }
}
