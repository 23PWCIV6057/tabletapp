import { CurrencyCode, GeoFenceConfig, Restaurant } from "@/types";
import crypto from "crypto";

export const HEATBOX_RESTAURANT: Restaurant = {
  id: "b7e0129a-2415-469b-8f35-908078c139b4",
  slug: "heatbox",
  accessKey: "r_hb_pesh_7a92f",
  name: "Heat Box Pizza",
  tagline: "Sher Khan Shaheed Road • Peshawar Cantt",
  address: "Sher Khan Shaheed Road, New Shami Road, Peshawar Cantt",
  city: "Peshawar",
  phone: "051 111 111 199",
  currency: "PKR",
  currencySymbol: "Rs.",
  status: "active",
  staffPin: "1234",
  ownerPin: "8888",
  securityMode: "hybrid_gps",
  dailyDineInCode: "42",
  wifiSsid: "HeatBox_Peshawar_5G",
  wifiPassword: "heatbox123",
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

const STORAGE_KEY = "tabletapp_restaurants_v2";

export function getStoredRestaurants(): Restaurant[] {
  if (typeof window === "undefined") return INITIAL_RESTAURANTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_RESTAURANTS));
      return INITIAL_RESTAURANTS;
    }
    const parsed: Restaurant[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return INITIAL_RESTAURANTS;
    }
    return parsed;
  } catch {
    return INITIAL_RESTAURANTS;
  }
}

export function saveStoredRestaurants(restaurants: Restaurant[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(restaurants));
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
    wifiPassword: r.wifiPassword || "dinein2026",
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
