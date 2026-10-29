import { NextRequest, NextResponse } from "next/server";
import { isRequestDevAuthenticated } from "@/lib/devAuth";
import { getStoredRestaurants, saveStoredRestaurants } from "@/lib/restaurants";

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
  const targetIdx = all.findIndex((r) => r.id === id || r.slug === id);

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
  const filtered = all.filter((r) => r.id !== id && r.slug !== id);

  if (filtered.length === all.length) {
    return NextResponse.json({ success: false, error: "Restaurant not found." }, { status: 404 });
  }

  saveStoredRestaurants(filtered);
  return NextResponse.json({ success: true, message: "Restaurant removed successfully." });
}
