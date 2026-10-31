import { GeoFenceConfig, LeaderboardEntry, MenuCategory, MenuItem, ModifierGroup, OrderCard, OrderStatus, ServiceRequest, SyncEvent, TableOccupancyStatus, TableSession } from "@/types";
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

function getBrowserAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("tabletapp_auth_session") || localStorage.getItem("tabletapp_auth_session");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.sessionToken) return parsed.sessionToken;
    }
  } catch {}
  return null;
}

function getBrowserRestaurantSlug(): string {
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    const match = path.match(/\/r\/([^\/]+)/);
    if (match?.[1]) return match[1];
    const searchParams = new URLSearchParams(window.location.search);
    const r = searchParams.get("restaurant") || searchParams.get("r");
    if (r) return r;
  }
  return "heatbox";
}

  function getTableSessionHeaders(): HeadersInit {
    const token = getBrowserAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  export async function fetchTableSessions(): Promise<Record<number, TableSession> | null> {
    if (typeof window === "undefined") return null;
    try {
      const res = await fetch(`/api/restaurants/${getBrowserRestaurantSlug()}/tables/sessions`, {
        headers: getTableSessionHeaders(),
        cache: "no-store",
      });
      if (!res.ok) return null;
      const body = await res.json();
      if (!body.success || !Array.isArray(body.sessions)) return null;
      return Object.fromEntries(
        body.sessions.map((session: TableSession) => [session.tableNumber, session])
      );
    } catch {
      return null;
    }
  }

  export async function syncTableSession(
    tableNumber: number,
    status: TableOccupancyStatus,
    seatedAt?: number
  ): Promise<TableSession | null> {
    if (typeof window === "undefined") return null;
    try {
      const res = await fetch(`/api/restaurants/${getBrowserRestaurantSlug()}/tables/sessions`, {
        method: "PATCH",
        headers: { ...getTableSessionHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber, status, seatedAt }),
      });
      if (!res.ok) return null;
      const body = await res.json();
      return body.success ? body.session : null;
    } catch {
      return null;
    }
  }

export function getGuestCapabilityToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("tabletapp_active_guest_session");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.capabilityToken) return parsed.capabilityToken;
    }
  } catch {}
  return null;
}

// REST API Operations (Finding SEC-001 & SEC-004: All operational queries route through authenticated server handlers)
export async function fetchOrdersFromSupabase(restaurantId?: string, tableNumber?: number): Promise<OrderCard[] | null> {
  if (typeof window !== "undefined") {
    try {
      const slug = getBrowserRestaurantSlug();
      const token = getBrowserAuthToken();
      if (token) {
        // Authenticated Staff/Kitchen Queue Fetch
        const res = await fetch(`/api/restaurants/${slug}/orders`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success && Array.isArray(body.orders)) return body.orders;
        }
      } else {
        // Guest Table-Specific Order Fetch (or restaurant orders if table unselected)
        const searchTable = Number(new URLSearchParams(window.location.search).get("table"));
        const table = tableNumber || searchTable || undefined;
        const capabilityToken = getGuestCapabilityToken();
        const endpoint = table
          ? `/api/restaurants/${slug}/tables/${table}/orders`
          : `/api/restaurants/${slug}/orders`;
        const res = await fetch(endpoint, {
          headers: capabilityToken ? { "x-guest-capability": capabilityToken } : undefined,
          cache: "no-store",
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success && Array.isArray(body.orders)) return body.orders;
        }
      }
    } catch {
      return null;
    }
    return null;
  }

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
  if (typeof window !== "undefined") {
    try {
      const slug = getBrowserRestaurantSlug();
      const token = getBrowserAuthToken();
      if (!token) return null;
      const res = await fetch(`/api/restaurants/${slug}/services`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.requests)) return body.requests;
      }
    } catch {
      return null;
    }
    return null;
  }

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

export async function syncTableTokenToSupabase(_tableNumber: number, _newToken: string): Promise<boolean> {
  // Directive 4: Token rotation is handled server-side by authenticated staff/owner; no direct anonymous mutation
  return true;
}

export async function fetchTableTokensFromSupabase(): Promise<{ tableNumber: number; token: string }[] | null> {
  // Directive 4: Never expose complete qr_code_token registry to anonymous clients
  return null;
}

// Tenant Geo & Branding Configuration (SEC-001 & SEC-005: Clean separation, no credential storage in dining_tables)
export async function syncGeoConfigToSupabase(_config: GeoFenceConfig): Promise<boolean> {
  return true;
}

export async function fetchGeoConfigFromSupabase(): Promise<GeoFenceConfig | null> {
  return DEFAULT_GEO_CONFIG;
}

// Dedicated independent arcade_leaderboard table in Supabase (Directive 5: Server-Brokered & Capability Bound)
export async function syncLeaderboardToSupabase(
  entryOrEntries: LeaderboardEntry | LeaderboardEntry[],
  restaurantId?: string
): Promise<boolean> {
  const entries = Array.isArray(entryOrEntries) ? entryOrEntries : [entryOrEntries];
  if (entries.length === 0) return true;

  if (typeof window !== "undefined") {
    try {
      const slug = getBrowserRestaurantSlug();
      const cap = getGuestCapabilityToken();
      const entry = entries[0];
      const res = await fetch(`/api/restaurants/${slug}/leaderboard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cap ? { "x-guest-capability": cap } : {}),
        },
        body: JSON.stringify({
          playerName: entry.playerName,
          tableNumber: entry.tableNumber,
          game: entry.game,
          score: entry.score,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  if (!isSupabaseConfigured()) return false;
  try {
    const payload = entries.map((e) => ({
      player_name: e.playerName,
      table_number: e.tableNumber || null,
      game: e.game,
      score: e.score,
      restaurant_id: restaurantId || e.restaurantId || null,
      created_at: e.createdAt || Date.now(),
    }));

    const res = await fetch(`${SUPABASE_URL}/rest/v1/arcade_leaderboard`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload.length === 1 ? payload[0] : payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchLeaderboardFromSupabase(
  restaurantId?: string
): Promise<LeaderboardEntry[] | null> {
  if (typeof window !== "undefined") {
    try {
      const slug = getBrowserRestaurantSlug();
      const res = await fetch(`/api/restaurants/${slug}/leaderboard`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.scores)) {
          return data.scores.map((r: any) => ({
            id: String(r.id),
            playerName: r.playerName,
            tableNumber: r.tableNumber,
            game: r.game,
            score: r.score,
            createdAt: r.createdAt,
          }));
        }
      }
    } catch {
      return null;
    }
  }

  if (!isSupabaseConfigured()) return null;
  try {
    const params = new URLSearchParams({
      select: "*",
      order: "score.desc",
      limit: "50",
    });
    if (restaurantId) {
      params.append("restaurant_id", `eq.${restaurantId}`);
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/arcade_leaderboard?${params.toString()}`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    if (!Array.isArray(data)) return null;

    return data.map((row: any) => ({
      id: String(row.id),
      restaurantId: row.restaurant_id || undefined,
      playerName: row.player_name || "Guest",
      tableNumber: row.table_number || null,
      game: row.game || "reflex",
      score: Number(row.score) || 0,
      createdAt: Number(row.created_at) || Date.now(),
    }));
  } catch {
    return null;
  }
}

// Resets/wipes the leaderboard entries in Supabase through authenticated server endpoint (SEC-006)
export async function resetLeaderboardInSupabase(
  restaurantId?: string,
  restaurantSlug?: string
): Promise<boolean> {
  try {
    const slug = restaurantSlug || "heatbox";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem("tabletapp_auth_session") || localStorage.getItem("tabletapp_auth_session");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.sessionToken) {
            headers["Authorization"] = `Bearer ${parsed.sessionToken}`;
          }
        } catch {
          // ignore
        }
      }
    }

    const res = await fetch(`/api/restaurants/${slug}/leaderboard/reset`, {
      method: "POST",
      headers,
      body: JSON.stringify({ restaurantId }),
    });

    if (res.ok) return true;

    // Server-side fallback for background jobs with server credentials
    if (isSupabaseConfigured() && typeof window === "undefined") {
      const endpoint = restaurantId
        ? `${SUPABASE_URL}/rest/v1/arcade_leaderboard?restaurant_id=eq.${restaurantId}`
        : `${SUPABASE_URL}/rest/v1/arcade_leaderboard?score=gte.0`;
      const directRes = await fetch(endpoint, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return directRes.ok;
    }

    return false;
  } catch {
    return false;
  }
}

export async function syncOrderToSupabase(order: OrderCard, restaurantId?: string): Promise<boolean> {
  if (typeof window !== "undefined") {
    try {
      const slug = getBrowserRestaurantSlug();
      const res = await fetch(`/api/restaurants/${slug}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getGuestCapabilityToken()
            ? { "x-guest-capability": getGuestCapabilityToken() as string }
            : {}),
        },
        body: JSON.stringify({
          id: order.id,
          orderNumber: order.orderNumber,
          restaurantId: restaurantId,
          table: order.table,
          items: order.items,
          subtotal: order.subtotal,
          serviceFee: order.serviceFee,
          total: order.total,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

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
  if (typeof window !== "undefined") {
    try {
      const slug = getBrowserRestaurantSlug();
      const token = getBrowserAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/restaurants/${slug}/orders/${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

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
  if (typeof window !== "undefined") {
    try {
      const slug = getBrowserRestaurantSlug();
      const token = getBrowserAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/restaurants/${slug}/orders/${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ table: newTable }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

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
  if (typeof window !== "undefined") {
    try {
      const slug = getBrowserRestaurantSlug();
      const capabilityToken = getGuestCapabilityToken();
      const res = await fetch(`/api/restaurants/${slug}/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(capabilityToken ? { "x-guest-capability": capabilityToken } : {}),
        },
        body: JSON.stringify({
          id: req.id,
          restaurantId: restaurantId || req.restaurantId,
          table: req.table,
          type: req.type,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

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
  if (typeof window !== "undefined") {
    try {
      const slug = getBrowserRestaurantSlug();
      const token = getBrowserAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/restaurants/${slug}/services/${encodeURIComponent(requestId)}`, {
        method: "PATCH",
        headers,
      });
      return res.ok;
    } catch {
      return false;
    }
  }

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
                  { event: "*", schema: "public", table: "arcade_leaderboard" },
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
            } else if (change.table === "arcade_leaderboard") {
              fetchLeaderboardFromSupabase(restaurantId).then((lb) => {
                onEvent({ type: "LEADERBOARD_UPDATED", payload: lb || [] });
              });
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
