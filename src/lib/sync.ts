import { MenuItem, OrderCard, ServiceRequest, SyncEvent } from "@/types";
import { HEATBOX_MENU_DATA } from "@/lib/presets";

const CHANNEL_NAME = "table_tapp_bus";
const STORAGE_ORDERS_KEY = "tabletapp_orders_v1";
const STORAGE_SERVICES_KEY = "tabletapp_services_v1";
const STORAGE_MENU_KEY = "tabletapp_menu_v1";
const STORAGE_HEATBOX_MENU_KEY = "tabletapp_menu_heatbox_v1";

export const initialMenuData: MenuItem[] = [
  {
    id: 1,
    category: "Starters",
    name: "Crispy Calamari",
    description: "Tender fried squid tossed with sea salt, cracked black pepper, served with lemon aioli.",
    price: 13.5,
    tag: "Popular",
    available: true,
    prepTimeMinutes: 8,
    imageUrl: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=600&q=80",
    modifierGroups: [
      {
        id: "dip",
        name: "Choice of Dip",
        required: true,
        options: [
          { id: "aioli", name: "House Garlic Aioli", priceDelta: 0 },
          { id: "spicy_mayo", name: "Chili Lime Mayo", priceDelta: 0.5 },
          { id: "tartar", name: "Caper Tartar Sauce", priceDelta: 0 },
        ],
      },
    ],
  },
  {
    id: 2,
    category: "Starters",
    name: "Truffle Parmesan Fries",
    description: "Crispy hand-cut russet fries drizzled with white truffle oil and aged pecorino cheese.",
    price: 9.5,
    tag: "Chef Pick",
    available: true,
    prepTimeMinutes: 7,
    imageUrl: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80",
    modifierGroups: [
      {
        id: "portion",
        name: "Portion Size",
        required: true,
        options: [
          { id: "reg", name: "Regular Basket", priceDelta: 0 },
          { id: "large", name: "Sharing Basket", priceDelta: 4.0 },
        ],
      },
    ],
  },
  {
    id: 3,
    category: "Starters",
    name: "Charred Citrus Salad",
    description: "Wild arugula, shaved fennel, blood orange segments, candied walnuts, and citrus vinaigrette.",
    price: 11.0,
    tag: "Vegetarian",
    available: true,
    prepTimeMinutes: 5,
    imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 4,
    category: "Mains",
    name: "Grilled Citrus Chicken Bowl",
    description: "Marinated free-range chicken breast, warm quinoa, roasted sweet potato, avocado, and tahini drizzle.",
    price: 19.5,
    tag: "Signature",
    available: true,
    prepTimeMinutes: 14,
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
    modifierGroups: [
      {
        id: "grain",
        name: "Grain Base",
        required: true,
        options: [
          { id: "quinoa", name: "Tri-Color Quinoa", priceDelta: 0 },
          { id: "brown_rice", name: "Brown Jasmine Rice", priceDelta: 0 },
          { id: "cauli_rice", name: "Cauliflower Rice (+ Low Carb)", priceDelta: 2.0 },
        ],
      },
    ],
  },
  {
    id: 5,
    category: "Mains",
    name: "Prime Ribeye Steak (300g)",
    description: "Pan-seared 28-day dry aged ribeye steak basted with thyme and garlic compound butter.",
    price: 34.0,
    tag: "Chef Pick",
    available: true,
    prepTimeMinutes: 18,
    imageUrl: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80",
    modifierGroups: [
      {
        id: "doneness",
        name: "Meat Doneness",
        required: true,
        options: [
          { id: "rare", name: "Rare (Cool red center)", priceDelta: 0 },
          { id: "med_rare", name: "Medium Rare (Warm red center)", priceDelta: 0 },
          { id: "medium", name: "Medium (Warm pink center)", priceDelta: 0 },
          { id: "med_well", name: "Medium Well (Slight pink)", priceDelta: 0 },
          { id: "well_done", name: "Well Done (No pink)", priceDelta: 0 },
        ],
      },
    ],
  },
  {
    id: 6,
    category: "Mains",
    name: "Wild Mushroom Tagliatelle",
    description: "Fresh egg pasta ribbons tossed with chanterelle & porcini mushrooms in a truffle parmesan emulsion.",
    price: 24.0,
    tag: "Vegetarian",
    available: true,
    prepTimeMinutes: 12,
    imageUrl: "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 7,
    category: "Desserts",
    name: "Warm Molten Lava Cake",
    description: "Decadent Valrhona dark chocolate cake with a molten center, served with vanilla bean gelato.",
    price: 10.5,
    tag: "Popular",
    available: true,
    prepTimeMinutes: 10,
    imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 8,
    category: "Desserts",
    name: "Basque Burnt Cheesecake",
    description: "Caramelized crust with an ultra-creamy interior, served with wild berry compote.",
    price: 9.0,
    tag: "Sweet",
    available: true,
    prepTimeMinutes: 4,
    imageUrl: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 9,
    category: "Drinks",
    name: "Sparkling Citrus Spritz",
    description: "Fresh pressed blood orange, yuzu juice, aromatic bitters, and sparkling mineral water.",
    price: 6.5,
    tag: "Cold",
    available: true,
    prepTimeMinutes: 3,
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 10,
    category: "Drinks",
    name: "Cold Brew Nitro Coffee",
    description: "Slow-steeped organic Ethiopian beans infused with nitrogen for a silky, creamy head.",
    price: 5.5,
    tag: "Cold",
    available: true,
    prepTimeMinutes: 2,
    imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80",
  },
];

export const initialOrdersData: OrderCard[] = [
  {
    id: "ord_101",
    orderNumber: 101,
    table: 4,
    items: [
      {
        itemId: 5,
        name: "Prime Ribeye Steak (300g)",
        basePrice: 34.0,
        selectedModifiers: [{ groupName: "Meat Doneness", optionName: "Medium Rare", priceDelta: 0 }],
        quantity: 1,
        unitPrice: 34.0,
        totalPrice: 34.0,
        specialInstructions: "Sauce on the side please",
      },
      {
        itemId: 2,
        name: "Truffle Parmesan Fries",
        basePrice: 9.5,
        selectedModifiers: [{ groupName: "Portion Size", optionName: "Regular Basket", priceDelta: 0 }],
        quantity: 1,
        unitPrice: 9.5,
        totalPrice: 9.5,
      },
    ],
    subtotal: 43.5,
    serviceFee: 1.5,
    total: 45.0,
    status: "New",
    createdAt: Date.now() - 3 * 60 * 1000,
    updatedAt: Date.now() - 3 * 60 * 1000,
  },
  {
    id: "ord_102",
    orderNumber: 102,
    table: 7,
    items: [
      {
        itemId: 6,
        name: "Wild Mushroom Tagliatelle",
        basePrice: 24.0,
        selectedModifiers: [],
        quantity: 1,
        unitPrice: 24.0,
        totalPrice: 24.0,
      },
      {
        itemId: 9,
        name: "Sparkling Citrus Spritz",
        basePrice: 6.5,
        selectedModifiers: [],
        quantity: 2,
        unitPrice: 6.5,
        totalPrice: 13.0,
      },
    ],
    subtotal: 37.0,
    serviceFee: 1.5,
    total: 38.5,
    status: "Preparing",
    createdAt: Date.now() - 8 * 60 * 1000,
    updatedAt: Date.now() - 5 * 60 * 1000,
  },
  {
    id: "ord_103",
    orderNumber: 103,
    table: 9,
    items: [
      {
        itemId: 4,
        name: "Grilled Citrus Chicken Bowl",
        basePrice: 19.5,
        selectedModifiers: [{ groupName: "Grain Base", optionName: "Tri-Color Quinoa", priceDelta: 0 }],
        quantity: 2,
        unitPrice: 19.5,
        totalPrice: 39.0,
      },
    ],
    subtotal: 39.0,
    serviceFee: 1.5,
    total: 40.5,
    status: "Ready",
    createdAt: Date.now() - 14 * 60 * 1000,
    updatedAt: Date.now() - 2 * 60 * 1000,
  },
];

export const initialServicesData: ServiceRequest[] = [
  {
    id: "srv_1",
    table: 3,
    type: "Water Refill",
    status: "Pending",
    createdAt: Date.now() - 2 * 60 * 1000,
  },
  {
    id: "srv_2",
    table: 6,
    type: "Call Waiter",
    status: "Pending",
    createdAt: Date.now() - 5 * 60 * 1000,
  },
  {
    id: "srv_3",
    table: 8,
    type: "Sauces & Condiments",
    status: "Pending",
    createdAt: Date.now() - 1 * 60 * 1000,
  },
];

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
  if (typeof window === "undefined") return initialOrdersData;
  try {
    const data = localStorage.getItem(STORAGE_ORDERS_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(initialOrdersData));
      return initialOrdersData;
    }
    return JSON.parse(data);
  } catch {
    return initialOrdersData;
  }
}

export function saveStoredOrders(orders: OrderCard[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
}

export function getStoredServices(): ServiceRequest[] {
  if (typeof window === "undefined") return initialServicesData;
  try {
    const data = localStorage.getItem(STORAGE_SERVICES_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_SERVICES_KEY, JSON.stringify(initialServicesData));
      return initialServicesData;
    }
    return JSON.parse(data);
  } catch {
    return initialServicesData;
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
