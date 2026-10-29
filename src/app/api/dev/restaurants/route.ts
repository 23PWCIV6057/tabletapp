import { NextRequest, NextResponse } from "next/server";
import { isRequestDevAuthenticated } from "@/lib/devAuth";
import {
  generateAccessKey,
  getStoredRestaurants,
  INITIAL_RESTAURANTS,
  saveStoredRestaurants,
} from "@/lib/restaurants";
import { MenuItem, Restaurant } from "@/types";

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

export async function GET(req: NextRequest) {
  if (!isRequestDevAuthenticated(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized access." }, { status: 401 });
  }

  // Check Supabase first if configured
  if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes("your-project-id")) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/restaurants?select=*&order=created_at.asc`, {
        headers: getHeaders(),
        cache: "no-store",
      });
      if (res.ok) {
        const records = await res.json();
        if (Array.isArray(records) && records.length > 0) {
          const mapped: Restaurant[] = records.map((r: any) => ({
            id: r.id,
            slug: r.slug,
            accessKey: r.access_key || `r_${r.slug}_key`,
            name: r.name,
            tagline: r.tagline || "",
            address: r.address || "",
            city: r.city || "Peshawar",
            phone: r.phone || "",
            currency: r.currency || "PKR",
            currencySymbol: r.currency_symbol || "Rs.",
            status: r.status || "active",
            staffPin: r.staff_pin || "1234",
            ownerPin: r.owner_pin || "8888",
            securityMode: r.security_mode || "hybrid_gps",
            dailyDineInCode: r.daily_dine_in_code || "42",
            wifiSsid: r.wifi_ssid,
            wifiPassword: r.wifi_password,
            arcadePrizeText: r.arcade_prize_text,
            serviceFeePercent: Number(r.service_fee_percent || 0),
            tableCount: r.table_count || 16,
            latitude: Number(r.latitude || 34.0151),
            longitude: Number(r.longitude || 71.5249),
            radiusMeters: Number(r.radius_meters || 150),
            createdAt: new Date(r.created_at || Date.now()).getTime(),
            updatedAt: new Date(r.updated_at || Date.now()).getTime(),
          }));
          saveStoredRestaurants(mapped);
          return NextResponse.json({ success: true, count: mapped.length, restaurants: mapped });
        }
      }
    } catch (err) {
      console.error("Supabase restaurants fetch fallback:", err);
    }
  }

  const restaurants = getStoredRestaurants();
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

    const currentList = getStoredRestaurants();
    const rawSlug = (body.slug || name).toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    let slug = rawSlug || `rest-${Date.now().toString(36)}`;

    // Ensure slug uniqueness
    let counter = 1;
    while (currentList.some((r) => r.slug.toLowerCase() === slug.toLowerCase())) {
      slug = `${rawSlug}-${counter++}`;
    }

    const accessKey = generateAccessKey(slug);
    const newId = `rest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

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

    // Sync new restaurant to Supabase
    if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes("your-project-id")) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/restaurants`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            slug: newRestaurant.slug,
            access_key: newRestaurant.accessKey,
            name: newRestaurant.name,
            tagline: newRestaurant.tagline,
            address: newRestaurant.address,
            city: newRestaurant.city,
            phone: newRestaurant.phone,
            currency: newRestaurant.currency,
            currency_symbol: newRestaurant.currencySymbol,
            status: "active",
            staff_pin: newRestaurant.staffPin,
            owner_pin: newRestaurant.ownerPin,
            security_mode: newRestaurant.securityMode,
            daily_dine_in_code: newRestaurant.dailyDineInCode,
            wifi_ssid: newRestaurant.wifiSsid,
            wifi_password: newRestaurant.wifiPassword,
            arcade_prize_text: newRestaurant.arcadePrizeText,
            table_count: newRestaurant.tableCount,
            latitude: newRestaurant.latitude,
            longitude: newRestaurant.longitude,
            radius_meters: newRestaurant.radiusMeters,
          }),
        });
      } catch (err) {
        console.error("Failed to sync new restaurant to Supabase:", err);
      }
    }

    return NextResponse.json({
      success: true,
      restaurant: newRestaurant,
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create restaurant." }, { status: 500 });
  }
}
