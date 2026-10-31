import { GeoFenceConfig, MenuItem, Restaurant } from "@/types";
import crypto from "crypto";

export const HEATBOX_RESTAURANT: Restaurant = {
  id: "b7e0129a-2415-469b-8f35-908078c139b4",
  slug: "heatbox",
  accessKey: "",
  name: "Heat Box Pizza",
  tagline: "Sher Khan Shaheed Road • Peshawar Cantt",
  address: "Sher Khan Shaheed Road, New Shami Road, Peshawar Cantt",
  city: "Peshawar",
  phone: "051 111 111 199",
  currency: "PKR",
  currencySymbol: "Rs.",
  status: "active",
  staffPin: "",
  ownerPin: "",
  securityMode: "hybrid_gps",
  dailyDineInCode: "42",
  wifiSsid: "HeatBox_Peshawar_5G",
  wifiPassword: "",
  arcadePrizeText: "Free Molten Lava Cake on #1 Daily Score!",
  serviceFeePercent: 0,
  tableCount: 16,
  latitude: 34.0151,
  longitude: 71.5249,
  radiusMeters: 150,
  createdAt: 1765400000000,
  updatedAt: 1765400000000,
};

export const INITIAL_RESTAURANTS: Restaurant[] = [HEATBOX_RESTAURANT];

// Server-side in-memory caches for serverless runtime continuity
let serverRestaurantsCache: Restaurant[] = [...INITIAL_RESTAURANTS];
let serverMenusCache: Record<string, MenuItem[]> = {};

const STORAGE_KEY = "tabletapp_restaurants_v3";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

function getSupabaseHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Prefer: "return=representation",
  };
}

// Server-side restaurant fleet querying (SEC-001 & SEC-005: No JSON storage in dining_tables)
export async function fetchFleetFromSupabase(): Promise<Restaurant[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes("your-project-id")) {
    return serverRestaurantsCache;
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/restaurants?select=*`, {
      headers: getSupabaseHeaders(),
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Map postgres restaurants rows if available
        const mapped = data.map((row: any) => ({
          ...HEATBOX_RESTAURANT,
          id: String(row.id),
          name: row.name || HEATBOX_RESTAURANT.name,
          slug: row.slug || HEATBOX_RESTAURANT.slug,
          currency: row.currency || HEATBOX_RESTAURANT.currency,
          status: (row.is_active === false ? "suspended" : "active") as "active" | "suspended",
        }));
        serverRestaurantsCache = mapped;
        return mapped;
      }
    }
  } catch {
    // Fallback to server cache
  }
  return serverRestaurantsCache;
}

export async function syncFleetToSupabase(restaurants: Restaurant[]): Promise<boolean> {
  serverRestaurantsCache = restaurants;
  return true;
}

export async function fetchCustomMenusFromSupabase(): Promise<Record<string, MenuItem[]>> {
  return serverMenusCache;
}

export async function syncCustomMenusToSupabase(menus: Record<string, MenuItem[]>): Promise<boolean> {
  serverMenusCache = menus;
  return true;
}

export function getStoredRestaurants(): Restaurant[] {
  if (typeof window === "undefined") {
    return serverRestaurantsCache;
  }
  try {
    // Clean up legacy storage keys
    localStorage.removeItem("tabletapp_restaurants_v1");
    localStorage.removeItem("tabletapp_restaurants_v2");

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serverRestaurantsCache));
      return serverRestaurantsCache;
    }
    const parsed: Restaurant[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return serverRestaurantsCache;
    }
    return parsed;
  } catch {
    return serverRestaurantsCache;
  }
}

export function saveStoredRestaurants(restaurants: Restaurant[]) {
  serverRestaurantsCache = restaurants;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(restaurants));
    for (const r of restaurants) {
      setRestaurantSuspensionFlag(r.slug, r.id, r.status === "suspended");
    }
  } catch {
    // Ignore storage quota
  }
}

export function clearRestaurantLocalData(slug: string, id: string) {
  if (typeof window === "undefined") return;
  try {
    const normSlug = (slug || "").toLowerCase();
    const normId = (id || "").toLowerCase();
    localStorage.removeItem(`tabletapp_preset_menu_${slug}`);
    localStorage.removeItem(`tabletapp_preset_menu_${normSlug}`);
    localStorage.removeItem(`tabletapp_suspended_${normSlug}`);
    if (normId) {
      localStorage.removeItem(`tabletapp_suspended_${normId}`);
    }
  } catch {
    // Ignore
  }
}

export function isRestaurantSuspended(slugOrKey: string): boolean {
  const norm = (slugOrKey || "heatbox").trim().toLowerCase();
  if (typeof window !== "undefined") {
    const flag = localStorage.getItem(`tabletapp_suspended_${norm}`);
    if (flag === "true") return true;
    if (flag === "false") return false;
  }
  const found = findRestaurantBySlugOrKey(norm);
  return found?.status === "suspended";
}

export function setRestaurantSuspensionFlag(slug: string, id: string, suspended: boolean) {
  if (typeof window === "undefined") return;
  try {
    const val = suspended ? "true" : "false";
    localStorage.setItem(`tabletapp_suspended_${(slug || "").toLowerCase()}`, val);
    if (id) {
      localStorage.setItem(`tabletapp_suspended_${id.toLowerCase()}`, val);
    }
  } catch {
    // Ignore
  }
}

export function findRestaurantBySlugOrKey(slugOrKey: string): Restaurant | null {
  const all = getStoredRestaurants();
  const normalized = (slugOrKey || "").trim().toLowerCase();
  return (
    all.find(
      (r) =>
        r.slug.toLowerCase() === normalized ||
        r.accessKey.toLowerCase() === normalized ||
        r.id.toLowerCase() === normalized
    ) || null
  );
}

export function generateAccessKey(slug: string): string {
  const randomSuffix = crypto.randomBytes(3).toString("hex");
  const clean = slug.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
  return `r_${clean}_${randomSuffix}`;
}

export function restaurantToGeoConfig(r: Restaurant): GeoFenceConfig {
  return {
    enabled: true,
    restaurantName: r.name,
    tagline: r.tagline || `${r.city || "Peshawar"} Branch`,
    currency: r.currency,
    securityMode: r.securityMode,
    dailyDineInCode: r.dailyDineInCode,
    wifiSsid: r.wifiSsid || `${r.name.replace(/\s+/g, "_")}_Guest`,
    wifiPassword: r.wifiPassword || "",
    arcadePrizeText: r.arcadePrizeText,
    serviceFeeEnabled: (r.serviceFeePercent || 0) > 0,
    serviceFeeAmount: r.serviceFeePercent || 0,
    strictMode: false,
    latitude: r.latitude || 34.0151,
    longitude: r.longitude || 71.5249,
    radiusMeters: r.radiusMeters || 150,
    activePreset: "heatbox",
  };
}
