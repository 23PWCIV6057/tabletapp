import { NextRequest, NextResponse } from "next/server";
import { isRequestDevAuthenticated } from "@/lib/devAuth";
import { getStoredRestaurants, saveStoredRestaurants } from "@/lib/restaurants";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRequestDevAuthenticated(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized access." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const all = getStoredRestaurants();
  const targetIdx = all.findIndex((r) => r.id === id || r.slug.toLowerCase() === id.toLowerCase());

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

  // Sync status to Supabase if configured
  if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes("your-project-id")) {
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/restaurants?id=eq.${current.id}`,
        {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({
            status: updated.status,
            name: updated.name,
            tagline: updated.tagline,
            staff_pin: updated.staffPin,
            owner_pin: updated.ownerPin,
            updated_at: new Date().toISOString(),
          }),
        }
      );
    } catch (err) {
      console.error("Failed to sync restaurant patch to Supabase:", err);
    }
  }

  return NextResponse.json({ success: true, restaurant: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRequestDevAuthenticated(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized access." }, { status: 401 });
  }

  const { id } = await params;
  const all = getStoredRestaurants();
  const target = all.find((r) => r.id === id || r.slug.toLowerCase() === id.toLowerCase());
  const filtered = all.filter((r) => r.id !== id && r.slug.toLowerCase() !== id.toLowerCase());

  if (filtered.length === all.length) {
    return NextResponse.json({ success: false, error: "Restaurant not found." }, { status: 404 });
  }

  saveStoredRestaurants(filtered);

  // Sync deletion to Supabase
  if (target && SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes("your-project-id")) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/restaurants?id=eq.${target.id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
    } catch (err) {
      console.error("Failed to sync restaurant delete to Supabase:", err);
    }
  }

  return NextResponse.json({ success: true, message: "Restaurant removed successfully." });
}

