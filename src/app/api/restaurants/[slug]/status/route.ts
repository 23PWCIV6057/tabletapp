import { NextRequest, NextResponse } from "next/server";
import { findRestaurantBySlugOrKey, getStoredRestaurants } from "@/lib/restaurants";

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
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const normalized = (slug || "heatbox").trim().toLowerCase();

  // Check Supabase directly if configured
  if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes("your-project-id")) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/restaurants?or=(slug.eq.${normalized},id.eq.${normalized})&select=id,slug,name,status`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (res.ok) {
        const records = await res.json();
        if (Array.isArray(records) && records.length > 0) {
          const r = records[0];
          return NextResponse.json({
            success: true,
            id: r.id,
            slug: r.slug,
            name: r.name,
            status: r.status || "active",
          });
        }
      }
    } catch {
      // Fallback to server cache
    }
  }

  const found = findRestaurantBySlugOrKey(normalized);
  if (found) {
    return NextResponse.json({
      success: true,
      id: found.id,
      slug: found.slug,
      name: found.name,
      status: found.status || "active",
    });
  }

  return NextResponse.json({
    success: true,
    slug: normalized,
    status: "active",
  });
}
