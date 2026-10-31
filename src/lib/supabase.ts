import { GeoFenceConfig, LeaderboardEntry, MenuCategory, MenuItem, ModifierGroup, OrderCard, OrderStatus, ServiceRequest, SyncEvent } from "@/types";
import { DEFAULT_GEO_CONFIG } from "./geo";
import { initialMenuData } from "./sync";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

export function isSupabaseConfigured(): boolean {
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(SUPABASE_ANON_KEY) &&
    !SUPABASE_URL.includes("your-project-id")
  );
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Prefer: "return=representation",
  };
}

// REST API Operations
export async function fetchOrdersFromSupabase(restaurantId?: string): Promise<OrderCard[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    let query = `${SUPABASE_URL}/rest/v1/orders?select=*,order_items(*)&order=created_at.desc&limit=50`;
    if (restaurantId) {
      query += `&restaurant_id=eq.${restaurantId}`;
    }
    const res = await fetch(query, { headers: getHeaders(), cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.map((rec: Record<string, unknown>) => ({
      id: rec.id as string,
      orderNumber: rec.order_number as number,
      table: rec.table_number as number,
      items: ((rec.order_items as Record<string, unknown>[]) || []).map((item) => ({
        itemId: item.menu_item_id as number,
        name: item.name as string,
        basePrice: Number(item.unit_price),
        selectedModifiers: (item.selected_modifiers as { groupName: string; optionName: string; priceDelta: number }[]) || [],
        quantity: item.quantity as number,
        unitPrice: Number(item.unit_price),
        totalPrice: Number(item.total_price),
        specialInstructions: (item.special_instructions as string) || undefined,
      })),
      subtotal: Number(rec.subtotal),
      serviceFee: Number(rec.service_fee),
      total: Number(rec.total),
      status: rec.status as OrderStatus,
      createdAt: new Date(rec.created_at as string).getTime(),
      updatedAt: new Date(rec.updated_at as string).getTime(),
      geoVerified: rec.geo_verified !== undefined ? Boolean(rec.geo_verified) : undefined,
      distanceMeters: rec.distance_meters !== undefined && rec.distance_meters !== null ? Number(rec.distance_meters) : undefined,
      tableWasVacant: rec.table_was_vacant !== undefined ? Boolean(rec.table_was_vacant) : undefined,
      rejectedReason: (rec.rejected_reason as string) || undefined,
    }));
  } catch {
    return null;
  }
}

export async function fetchServicesFromSupabase(restaurantId?: string): Promise<ServiceRequest[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    let query = `${SUPABASE_URL}/rest/v1/service_requests?select=*&order=created_at.desc&limit=30`;
    if (restaurantId) {
      query += `&restaurant_id=eq.${restaurantId}`;
    }
    const res = await fetch(query, { headers: getHeaders(), cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.map((rec: Record<string, unknown>) => ({
      id: rec.id as string,
      table: rec.table_number as number,
      type: rec.type as ServiceRequest["type"],
      status: rec.status as ServiceRequest["status"],
      createdAt: new Date(rec.created_at as string).getTime(),
      resolvedAt: rec.resolved_at ? new Date(rec.resolved_at as string).getTime() : undefined,
    }));
  } catch {
    return null;
  }
}

const IMG_TAG_REGEX = /\n?\[\[IMG:([\s\S]+?)\]\]$/;

function packDescriptionWithImage(description: string, imageUrl?: string): string {
  const cleanDesc = (description || "").replace(IMG_TAG_REGEX, "").trim();
  const cleanImg = (imageUrl || "").trim();
  return `${cleanDesc}\n[[IMG:${cleanImg || "NONE"}]]`;
}

function unpackDescriptionAndImage(rawDesc: string): {
  description: string;
  imageUrl?: string;
  hasExplicitTag: boolean;
} {
  const match = rawDesc.match(IMG_TAG_REGEX);
  if (!match) return { description: rawDesc, hasExplicitTag: false };
  const val = match[1].trim();
  return {
    description: rawDesc.replace(IMG_TAG_REGEX, "").trim(),
    imageUrl: val === "NONE" ? undefined : val,
    hasExplicitTag: true,
  };
}

export async function fetchMenuFromSupabase(): Promise<MenuItem[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/menu_items?select=*,categories(name),modifier_groups(*,modifier_options(*))&order=id.asc`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.map((rec: Record<string, unknown>) => {
      const name = rec.name as string;
      const rawGroups = (rec.modifier_groups as Record<string, unknown>[]) || [];
      let modifierGroups: ModifierGroup[] | undefined =
        rawGroups.length > 0
          ? rawGroups.map((g) => ({
              id: String(g.id),
              name: String(g.name),
              required: Boolean(g.required),
              options: ((g.modifier_options as Record<string, unknown>[]) || []).map((opt) => ({
                id: String(opt.id),
                name: String(opt.name),
                priceDelta: Number(opt.price_delta) || 0,
              })),
            }))
          : undefined;

      const fallback = initialMenuData.find(
        (m) => m.id === Number(rec.id) || m.name.toLowerCase() === name.toLowerCase()
      );
      if (!modifierGroups && fallback?.modifierGroups) {
        modifierGroups = fallback.modifierGroups;
      }

      const { description, imageUrl, hasExplicitTag } = unpackDescriptionAndImage(
        (rec.description as string) || ""
      );

      return {
        id: Number(rec.id),
        name,
        category: ((rec.categories as { name?: string })?.name || "Starters") as MenuCategory,
        description,
        imageUrl: hasExplicitTag ? imageUrl : fallback?.imageUrl,
        price: Number(rec.price),
        tag: (rec.tag as string) || "Popular",
        available: Boolean(rec.available),
        prepTimeMinutes: Number(rec.prep_time_minutes) || 10,
        modifierGroups,
      };
    });
  } catch {
    return null;
  }
}

export async function syncTableTokenToSupabase(tableNumber: number, newToken: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/dining_tables?table_number=eq.${tableNumber}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ qr_code_token: newToken }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchTableTokensFromSupabase(): Promise<{ tableNumber: number; token: string }[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/dining_tables?select=table_number,qr_code_token`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.map((r: Record<string, unknown>) => ({
      tableNumber: Number(r.table_number),
      token: String(r.qr_code_token),
    }));
  } catch {
    return null;
  }
}

// shortcut: stores restaurant branding/currency/security JSON in dining_tables(table_number=1).name so zero SQL migration is needed
export async function syncGeoConfigToSupabase(config: GeoFenceConfig): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/dining_tables?table_number=eq.1`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ name: JSON.stringify(config) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchGeoConfigFromSupabase(): Promise<GeoFenceConfig | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/dining_tables?table_number=eq.1&select=name`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const rawName = data?.[0]?.name;
    if (typeof rawName === "string" && rawName.trim().startsWith("{")) {
      const parsed = JSON.parse(rawName);
      return { ...DEFAULT_GEO_CONFIG, ...parsed };
    }
    return null;
  } catch {
    return null;
  }
}

// shortcut: stores live arcade leaderboard JSON in dining_tables(table_number=2).name so zero SQL migration is needed
export async function syncLeaderboardToSupabase(entries: LeaderboardEntry[]): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const trimmed = entries.slice(0, 20);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/dining_tables?table_number=eq.2`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ name: JSON.stringify(trimmed) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchLeaderboardFromSupabase(): Promise<LeaderboardEntry[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/dining_tables?table_number=eq.2&select=name`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const rawName = data?.[0]?.name;
    if (typeof rawName === "string" && rawName.trim().startsWith("[")) {
      const parsed = JSON.parse(rawName);
      return Array.isArray(parsed) ? parsed : null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function syncOrderToSupabase(order: OrderCard, restaurantId?: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        id: order.id,
        order_number: order.orderNumber,
        restaurant_id: restaurantId || null,
        table_number: order.table,
        subtotal: order.subtotal,
        service_fee: order.serviceFee,
        total: order.total,
        status: order.status,
        geo_verified: order.geoVerified ?? true,
        distance_meters: order.distanceMeters ?? null,
        table_was_vacant: order.tableWasVacant ?? false,
        created_at: new Date(order.createdAt).toISOString(),
        updated_at: new Date(order.updatedAt).toISOString(),
      }),
    });

    if (!res.ok) return false;

    // Insert order items
    if (order.items.length > 0) {
      const itemsRes = await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(
          order.items.map((item) => ({
            order_id: order.id,
            menu_item_id: item.itemId,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.totalPrice,
            selected_modifiers: item.selectedModifiers,
            special_instructions: item.specialInstructions || null,
          }))
        ),
      });

      if (!itemsRes.ok) {
        console.warn("Failed to insert order items:", await itemsRes.text());
        return false;
      }
    }

    return true;
  } catch (err) {
    console.warn("Failed to sync order to Supabase:", err);
    return false;
  }
}

export async function syncOrderStatusToSupabase(orderId: string, status: OrderStatus): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({
        status,
        updated_at: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncOrderTransferToSupabase(orderId: string, newTable: number): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({
        table_number: newTable,
        updated_at: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncServiceRequestToSupabase(
  req: ServiceRequest,
  restaurantId?: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/service_requests`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        id: req.id,
        restaurant_id: restaurantId || null,
        table_number: req.table,
        type: req.type,
        status: req.status,
        created_at: new Date(req.createdAt).toISOString(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncServiceResolveToSupabase(requestId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/service_requests?id=eq.${requestId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({
        status: "Resolved",
        resolved_at: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncMenuItemUpdateToSupabase(item: MenuItem): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/menu_items?id=eq.${item.id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({
        name: item.name,
        description: packDescriptionWithImage(item.description, item.imageUrl),
        price: item.price,
        tag: item.tag,
        available: item.available,
        prep_time_minutes: item.prepTimeMinutes || 10,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncNewMenuItemToSupabase(
  item: MenuItem,
  restaurantId?: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const targetRestId = restaurantId || "b7e0129a-2415-469b-8f35-908078c139b4";
    const catRes = await fetch(
      `${SUPABASE_URL}/rest/v1/categories?name=eq.${encodeURIComponent(item.category)}`,
      { headers: getHeaders() }
    );
    let categoryId: string | null = null;
    if (catRes.ok) {
      const cats = await catRes.json();
      if (cats.length > 0) categoryId = cats[0].id;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/menu_items`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        restaurant_id: targetRestId,
        category_id: categoryId,
        name: item.name,
        description: packDescriptionWithImage(item.description, item.imageUrl),
        price: item.price,
        tag: item.tag,
        available: item.available,
        prep_time_minutes: item.prepTimeMinutes || 10,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncDeleteMenuItemFromSupabase(itemId: number): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/menu_items?id=eq.${itemId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Realtime WebSocket Subscription with Auto-Reconnect & Phoenix CDC Protocol
export function subscribeToSupabaseRealtime(
  onEvent: (event: SyncEvent) => void,
  restaurantId?: string
): () => void {
  if (!isSupabaseConfigured() || typeof window === "undefined") {
    return () => {};
  }

  let ws: WebSocket | null = null;
  let heartbeat: NodeJS.Timeout | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let isClosedExplicitly = false;

  function connect() {
    try {
      const wsUrl = `${SUPABASE_URL.replace(/^http/, "ws")}/realtime/v1/websocket?apikey=${SUPABASE_ANON_KEY}&vsn=1.0.0`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        // Join realtime channel with Postgres Changes CDC
        ws?.send(
          JSON.stringify({
            topic: "realtime:public:*",
            event: "phx_join",
            payload: {
              config: {
                postgres_changes: [
                  { event: "*", schema: "public", table: "orders" },
                  { event: "*", schema: "public", table: "service_requests" },
                  { event: "*", schema: "public", table: "menu_items" },
                ],
              },
            },
            ref: "1",
          })
        );

        // Keep-alive heartbeat every 20 seconds
        if (heartbeat) clearInterval(heartbeat);
        heartbeat = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: "2" }));
          }
        }, 20000);
      };

      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);

          // Handle Postgres CDC events
          if (data.event === "postgres_changes") {
            const change = data.payload?.data;
            if (!change) return;

            // Strict Tenant Isolation: ignore events from other restaurants
            if (restaurantId && change.record?.restaurant_id && change.record.restaurant_id !== restaurantId) {
              return;
            }

            if (change.table === "orders") {
              if (change.type === "INSERT") {
                // Fetch full order for this specific tenant to ensure order items are populated
                fetchOrdersFromSupabase(restaurantId).then((orders) => {
                  if (orders && orders.length > 0) {
                    const target = orders.find((o) => o.id === change.record.id) || orders[0];
                    onEvent({ type: "NEW_ORDER", payload: target });
                  }
                });
              } else if (change.type === "UPDATE") {
                const rec = change.record;
                onEvent({
                  type: "ORDER_STATUS_CHANGED",
                  payload: {
                    orderId: rec.id,
                    status: rec.status,
                    updatedAt: new Date(rec.updated_at || Date.now()).getTime(),
                  },
                });
              }
            } else if (change.table === "service_requests") {
              if (change.type === "INSERT") {
                const rec = change.record;
                onEvent({
                  type: "NEW_SERVICE_REQUEST",
                  payload: {
                    id: rec.id,
                    table: rec.table_number,
                    type: rec.type,
                    status: rec.status,
                    createdAt: new Date(rec.created_at).getTime(),
                  },
                });
              } else if (change.type === "UPDATE" && change.record.status === "Resolved") {
                onEvent({
                  type: "SERVICE_RESOLVED",
                  payload: {
                    requestId: change.record.id,
                    resolvedAt: new Date(change.record.resolved_at || Date.now()).getTime(),
                  },
                });
              }
            } else if (change.table === "menu_items") {
              fetchMenuFromSupabase().then((newMenu) => {
                if (newMenu) onEvent({ type: "MENU_UPDATED", payload: newMenu });
              });
            }
          }
        } catch {
          // Ignore malformed frames
        }
      };

      ws.onerror = () => {
        // Will trigger onclose and reconnect
      };

      ws.onclose = () => {
        if (!isClosedExplicitly) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };
    } catch {
      if (!isClosedExplicitly) {
        reconnectTimeout = setTimeout(connect, 5000);
      }
    }
  }

  connect();

  return () => {
    isClosedExplicitly = true;
    if (heartbeat) clearInterval(heartbeat);
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (ws) ws.close();
  };
}
