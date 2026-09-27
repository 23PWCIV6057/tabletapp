import { GeoFenceConfig } from "@/types";

const STORAGE_GEO_KEY = "tabletapp_geo_config_v1";

// Default coordinate placeholder (can be updated to exact coordinates by the restaurant owner in 1 tap)
export const DEFAULT_GEO_CONFIG: GeoFenceConfig = {
  enabled: true,
  latitude: 34.0086,
  longitude: 71.5484,
  radiusMeters: 150, // 150m perimeter covers restaurant floor, patio, and parking
  restaurantName: "Sunshine Bistro",
  strictMode: true,
};

export function getStoredGeoConfig(): GeoFenceConfig {
  if (typeof window === "undefined") return DEFAULT_GEO_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_GEO_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_GEO_KEY, JSON.stringify(DEFAULT_GEO_CONFIG));
      return DEFAULT_GEO_CONFIG;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_GEO_CONFIG;
  }
}

export function saveStoredGeoConfig(config: GeoFenceConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_GEO_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota or access errors
  }
}

/**
 * Calculates Great-Circle distance between two coordinates in meters using the Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's mean radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export type GeoCheckResult =
  | { success: true; distanceMeters: number; coords: { latitude: number; longitude: number } }
  | { success: false; reason: "OUTSIDE_RADIUS" | "PERMISSION_DENIED" | "UNAVAILABLE" | "TIMEOUT"; distanceMeters?: number; message: string };

/**
 * Validates the user's current physical position against the restaurant's geofence boundary.
 */
export async function verifyUserWithinRestaurant(
  config: GeoFenceConfig
): Promise<GeoCheckResult> {
  if (!config.enabled) {
    return { success: true, distanceMeters: 0, coords: { latitude: config.latitude, longitude: config.longitude } };
  }

  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return {
      success: false,
      reason: "UNAVAILABLE",
      message: "Geolocation is not supported by your device or browser.",
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const distance = calculateDistanceMeters(
          latitude,
          longitude,
          config.latitude,
          config.longitude
        );

        if (distance <= config.radiusMeters) {
          resolve({
            success: true,
            distanceMeters: distance,
            coords: { latitude, longitude },
          });
        } else {
          resolve({
            success: false,
            reason: "OUTSIDE_RADIUS",
            distanceMeters: distance,
            message: `You appear to be ${distance >= 1000 ? (distance / 1000).toFixed(1) + " km" : distance + " meters"} away from ${config.restaurantName}. In-table orders can only be placed while physically present at the restaurant.`,
          });
        }
      },
      (err) => {
        let reason: "PERMISSION_DENIED" | "TIMEOUT" | "UNAVAILABLE" = "UNAVAILABLE";
        let message = "Could not determine your physical location.";

        if (err.code === err.PERMISSION_DENIED) {
          reason = "PERMISSION_DENIED";
          message = "Location access was denied. Please allow location access in your browser to verify you are seated at your table.";
        } else if (err.code === err.TIMEOUT) {
          reason = "TIMEOUT";
          message = "Location check timed out. Please ensure GPS is active.";
        }

        resolve({ success: false, reason, message });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}
