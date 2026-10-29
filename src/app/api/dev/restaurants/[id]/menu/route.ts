import { NextRequest, NextResponse } from "next/server";
import { isRequestDevAuthenticated } from "@/lib/devAuth";
import { findRestaurantBySlugOrKey } from "@/lib/restaurants";
import { HEATBOX_MENU_DATA } from "@/lib/presets";
import { MenuItem } from "@/types";

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

  const { id } = await params;
  const restaurant = findRestaurantBySlugOrKey(id);
  if (!restaurant) {
    return NextResponse.json({ success: false, error: "Restaurant not found." }, { status: 404 });
  }

  // Fetch menu from Supabase if configured
  if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes("your-project-id")) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/menu_items?restaurant_id=eq.${restaurant.id}&select=*&order=category,id`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (res.ok) {
        const records = await res.json();
        if (records && records.length > 0) {
          const mapped: MenuItem[] = records.map((r: any) => ({
            id: r.id,
            name: r.name,
            category: r.category,
            price: Number(r.price),
            description: r.description || "",
            tag: r.tag || "",
            available: r.available ?? true,
            prepTimeMinutes: r.prep_time_minutes || 12,
            imageUrl: r.image_url || undefined,
            modifierGroups: r.modifier_groups || undefined,
            restaurantId: restaurant.id,
          }));
          return NextResponse.json({ success: true, menu: mapped });
        }
      }
    } catch {
      // Fallback below
    }
  }

  // Default to Heatbox preset if it's the Heat Box tenant
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
  const restaurant = findRestaurantBySlugOrKey(id);
  if (!restaurant) {
    return NextResponse.json({ success: false, error: "Restaurant not found." }, { status: 404 });
  }

  const body = await req.json();
  const items: MenuItem[] = Array.isArray(body?.menu) ? body.menu : [];

  if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes("your-project-id") && items.length > 0) {
    try {
      const records = items.map((item) => ({
        id: item.id,
        restaurant_id: restaurant.id,
        name: item.name,
        category: item.category,
        price: item.price,
        description: item.description || "",
        tag: item.tag || "",
        available: item.available ?? true,
        prep_time_minutes: item.prepTimeMinutes || 12,
        image_url: item.imageUrl || null,
        modifier_groups: item.modifierGroups || null,
        updated_at: new Date().toISOString(),
      }));

      await fetch(`${SUPABASE_URL}/rest/v1/menu_items`, {
        method: "POST",
        headers: {
          ...getHeaders(),
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(records),
      });
    } catch (err) {
      console.error("Supabase bulk menu update error:", err);
    }
  }

  return NextResponse.json({ success: true, count: items.length });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRequestDevAuthenticated(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized access." }, { status: 401 });
  }

  const { id } = await params;
  const restaurant = findRestaurantBySlugOrKey(id);
  if (!restaurant) {
    return NextResponse.json({ success: false, error: "Restaurant not found." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) {
    return NextResponse.json({ success: false, error: "Missing itemId parameter." }, { status: 400 });
  }

  if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes("your-project-id")) {
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/menu_items?id=eq.${itemId}&restaurant_id=eq.${restaurant.id}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );
    } catch (err) {
      console.error("Supabase menu item delete error:", err);
    }
  }

  return NextResponse.json({ success: true, deletedId: itemId });
}
