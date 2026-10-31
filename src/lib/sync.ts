import { MenuItem, OrderCard, ServiceRequest, SyncEvent } from "@/types";
import { HEATBOX_MENU_DATA } from "@/lib/presets";

const CHANNEL_NAME = "table_tapp_bus";
const STORAGE_ORDERS_KEY = "tabletapp_orders_v2";
const STORAGE_SERVICES_KEY = "tabletapp_services_v2";
const STORAGE_MENU_KEY = "tabletapp_menu_v2";
const STORAGE_HEATBOX_MENU_KEY = "tabletapp_menu_heatbox_v1";

export const initialMenuData: MenuItem[] = HEATBOX_MENU_DATA;

/**
 * Reconciles cloud orders with local active order state so local metadata
 * (e.g. optimistic geo verification or custom client status) isn't wiped out during sync.
 */
export function mergeCloudOrdersWithLocalMeta(
  cloudOrders: OrderCard[],
  localOrders: OrderCard[]
): OrderCard[] {
  const localMap = new Map(localOrders.map((o) => [o.id, o]));
  const seen = new Set<string>();
  return cloudOrders.filter((cloud) => {
    if (seen.has(cloud.id)) return false;
    seen.add(cloud.id);
    return true;
  }).map((cloud) => {
    const local = localMap.get(cloud.id);
    if (!local) return cloud;
    return {
      ...cloud,
      geoVerified: cloud.geoVerified !== undefined ? cloud.geoVerified : local.geoVerified,
      distanceMeters:
        cloud.distanceMeters !== undefined ? cloud.distanceMeters : local.distanceMeters,
      tableWasVacant:
        cloud.tableWasVacant !== undefined ? cloud.tableWasVacant : local.tableWasVacant,
    };
  });
}

export function getStoredMenu(): MenuItem[] {
  if (typeof window === "undefined") return initialMenuData;
  try {
    const data = localStorage.getItem(STORAGE_MENU_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_MENU_KEY, JSON.stringify(initialMenuData));
      return initialMenuData;
    }
    const parsed: MenuItem[] = JSON.parse(data);
    return parsed.map((item) => {
      if ("imageUrl" in item) return item;
      const fallback = initialMenuData.find((d) => d.id === item.id);
      return fallback?.imageUrl ? { ...item, imageUrl: fallback.imageUrl } : item;
    });
  } catch {
    return initialMenuData;
  }
}

export function saveStoredMenu(menu: MenuItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_MENU_KEY, JSON.stringify(menu));
}

export function getPresetMenu(preset: "default" | "heatbox" = "default"): MenuItem[] {
  if (preset === "heatbox") {
    if (typeof window === "undefined") return HEATBOX_MENU_DATA;
    try {
      const data = localStorage.getItem(STORAGE_HEATBOX_MENU_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_HEATBOX_MENU_KEY, JSON.stringify(HEATBOX_MENU_DATA));
        return HEATBOX_MENU_DATA;
      }
      return JSON.parse(data);
    } catch {
      return HEATBOX_MENU_DATA;
    }
  }
  return getStoredMenu();
}

export function savePresetMenu(menu: MenuItem[], preset: "default" | "heatbox" = "default") {
  if (typeof window === "undefined") return;
  if (preset === "heatbox") {
    localStorage.setItem(STORAGE_HEATBOX_MENU_KEY, JSON.stringify(menu));
  } else {
    saveStoredMenu(menu);
  }
}

export function getStoredOrders(): OrderCard[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_ORDERS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveStoredOrders(orders: OrderCard[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
}

export function getStoredServices(): ServiceRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_SERVICES_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveStoredServices(services: ServiceRequest[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_SERVICES_KEY, JSON.stringify(services));
}

// Global broadcast dispatcher
export function broadcastSyncEvent(event: SyncEvent) {
  if (typeof window === "undefined") return;
  try {
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage(event);
      channel.close();
    }
  } catch {
    // BroadcastChannel unsupported or blocked
  }
}

// Hook-like listener registration
export function subscribeToSyncEvents(callback: (event: SyncEvent) => void): () => void {
  if (typeof window === "undefined") return () => {};

  let channel: BroadcastChannel | null = null;
  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (e) => {
      if (e.data && e.data.type) {
        callback(e.data as SyncEvent);
      }
    };
  }

  // Fallback to storage event for older browsers or if channel fails
  const storageListener = (e: StorageEvent) => {
    if (e.key === STORAGE_ORDERS_KEY && e.newValue) {
      // Storage refreshed
    }
  };
  window.addEventListener("storage", storageListener);

  return () => {
    if (channel) {
      channel.close();
    }
    window.removeEventListener("storage", storageListener);
  };
}
