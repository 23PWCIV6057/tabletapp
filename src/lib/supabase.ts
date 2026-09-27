import { MenuCategory, MenuItem, OrderCard, OrderStatus, ServiceRequest, SyncEvent } from "@/types";

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
export async function fetchOrdersFromSupabase(): Promise<OrderCard[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?select=*,order_items(*)&order=created_at.desc&limit=50`,
      { headers: getHeaders(), cache: "no-store" }
    );
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
    }));
  } catch {
    return null;
  }
}

export async function fetchServicesFromSupabase(): Promise<ServiceRequest[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/service_requests?select=*&order=created_at.desc&limit=30`,
      { headers: getHeaders(), cache: "no-store" }
    );
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

export async function fetchMenuFromSupabase(): Promise<MenuItem[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/menu_items?select=*,categories(name)&order=id.asc`,
      { headers: getHeaders(), cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.map((rec: Record<string, unknown>) => ({
      id: Number(rec.id),
      name: rec.name as string,
      category: ((rec.categories as { name?: string })?.name || "Starters") as MenuCategory,
      description: (rec.description as string) || "",
      price: Number(rec.price),
      tag: (rec.tag as string) || "Popular",
      available: Boolean(rec.available),
      prepTimeMinutes: Number(rec.prep_time_minutes) || 10,
    }));
  } catch {
    return null;
  }
}

export async function syncOrderToSupabase(order: OrderCard): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        id: order.id,
        order_number: order.orderNumber,
        table_number: order.table,
        subtotal: order.subtotal,
        service_fee: order.serviceFee,
        total: order.total,
        status: order.status,
        created_at: new Date(order.createdAt).toISOString(),
        updated_at: new Date(order.updatedAt).toISOString(),
      }),
    });

    if (!res.ok) return false;

    // Insert order items
    if (order.items.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
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

export async function syncServiceRequestToSupabase(req: ServiceRequest): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/service_requests`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        id: req.id,
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
        description: item.description,
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
  restaurantId = "0bd4a4f2-4d44-4f0c-a03c-e10252610e7a"
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const catRes = await fetch(`${SUPABASE_URL}/rest/v1/categories?name=eq.${item.category}`, {
      headers: getHeaders(),
    });
    let categoryId: string | null = null;
    if (catRes.ok) {
      const cats = await catRes.json();
      if (cats.length > 0) categoryId = cats[0].id;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/menu_items`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        restaurant_id: restaurantId,
        category_id: categoryId,
        name: item.name,
        description: item.description,
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
export function subscribeToSupabaseRealtime(onEvent: (event: SyncEvent) => void): () => void {
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

            if (change.table === "orders") {
              if (change.type === "INSERT") {
                // Fetch full order to ensure order items are populated
                fetchOrdersFromSupabase().then((orders) => {
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
