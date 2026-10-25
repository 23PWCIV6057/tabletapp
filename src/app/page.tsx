"use client";

import { useEffect, useState } from "react";
import {
  GeoFenceConfig,
  MenuItem,
  OrderCard,
  OrderItem,
  OrderStatus,
  ServiceRequest,
  ServiceType,
  TableOccupancyStatus,
  TableSession,
  UserRole,
} from "@/types";
import {
  broadcastSyncEvent,
  getStoredMenu,
  getStoredOrders,
  getStoredServices,
  saveStoredMenu,
  saveStoredOrders,
  saveStoredServices,
  subscribeToSyncEvents,
} from "@/lib/sync";
import { clearAuthSession, getAuthState } from "@/lib/auth";
import {
  clearTableFloorSession,
  getActiveGuestSession,
  getStoredTables,
  getStoredTableSessions,
  getTableByToken,
  getTokenForTable,
  saveStoredTables,
  setActiveGuestSession,
  updateTableStatus,
} from "@/lib/tables";
import { getStoredGeoConfig, saveStoredGeoConfig } from "@/lib/geo";
import {
  fetchMenuFromSupabase,
  fetchOrdersFromSupabase,
  fetchServicesFromSupabase,
  fetchTableTokensFromSupabase,
  isSupabaseConfigured,
  subscribeToSupabaseRealtime,
  syncDeleteMenuItemFromSupabase,
  syncMenuItemUpdateToSupabase,
  syncNewMenuItemToSupabase,
  syncOrderStatusToSupabase,
  syncOrderToSupabase,
  syncOrderTransferToSupabase,
  syncServiceRequestToSupabase,
  syncServiceResolveToSupabase,
} from "@/lib/supabase";
import { playAlertChime, playOrderChime } from "@/lib/sound";
import {
  ChartBarIcon,
  ChefHatIcon,
  LockIcon,
  MapPinIcon,
  UtensilsIcon,
} from "@/components/Icons";
import PinModal from "@/components/PinModal";
import OfflineBanner from "@/components/OfflineBanner";
import GuestView from "@/components/GuestView";
import KitchenView from "@/components/KitchenView";
import OwnerView from "@/components/OwnerView";

function mergeCloudOrdersWithLocalMeta(
  cloudOrders: OrderCard[],
  localOrders: OrderCard[]
): OrderCard[] {
  const localMap = new Map(localOrders.map((o) => [o.id, o]));
  return cloudOrders.map((co) => {
    const loc = localMap.get(co.id);
    if (!loc) return co;
    return {
      ...co,
      geoVerified: co.geoVerified ?? loc.geoVerified,
      distanceMeters: co.distanceMeters ?? loc.distanceMeters,
      tableWasVacant: co.tableWasVacant ?? loc.tableWasVacant,
      rejectedReason: co.rejectedReason ?? loc.rejectedReason,
    };
  });
}

export default function Home() {
  // Authentication & Gatekeeping
  const [activeRole, setActiveRole] = useState<UserRole>("guest");
  const [pinModalRole, setPinModalRole] = useState<"kitchen" | "owner" | null>(null);
  const [authenticatedRole, setAuthenticatedRole] = useState<"none" | "kitchen" | "owner">("none");

  // Core Application Synced State
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<OrderCard[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [tableNumber, setTableNumber] = useState<number>(7);
  const [transferNotice, setTransferNotice] = useState<string | null>(null);
  const [isClientLoaded, setIsClientLoaded] = useState(false);

  // Advanced Security & Floor Lifecycle State
  const [tableSessions, setTableSessions] = useState<Record<number, TableSession>>({});
  const [geoConfig, setGeoConfig] = useState<GeoFenceConfig>(getStoredGeoConfig());

  // Initialize from client storage and subscribe to real-time sync
  useEffect(() => {
    setIsClientLoaded(true);

    // Read URL query params for table or role
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("t") || params.get("token");
      const urlTable = params.get("table");

      if (urlToken) {
        const found = getTableByToken(urlToken);
        if (found) {
          setTableNumber(found.tableNumber);
          setActiveGuestSession({
            tableNumber: found.tableNumber,
            token: found.token,
            activatedAt: Date.now(),
          });
        }
      } else if (urlTable && !isNaN(Number(urlTable))) {
        const existingSession = getActiveGuestSession();
        if (existingSession && getAuthState().authenticatedRole === "none") {
          setTableNumber(existingSession.tableNumber);
        } else {
          setTableNumber(Math.min(16, Math.max(1, Number(urlTable))));
        }
      } else {
        const existingSession = getActiveGuestSession();
        if (existingSession) {
          setTableNumber(existingSession.tableNumber);
        }
      }

      const auth = getAuthState();
      setAuthenticatedRole(auth.authenticatedRole);
    }

    // Load initial stored states
    const localOrders = getStoredOrders();
    setMenu(getStoredMenu());
    setOrders(localOrders);
    setServiceRequests(getStoredServices());
    setTableSessions(getStoredTableSessions());
    setGeoConfig(getStoredGeoConfig());

    // Real-time Auto-Sync Loop (Every 5s fallback) across all devices
    let pollingTimer: NodeJS.Timeout | null = null;
    if (isSupabaseConfigured()) {
      // 1. Initial immediate hydration
      fetchOrdersFromSupabase().then((cloudOrders) => {
        if (cloudOrders && cloudOrders.length > 0) {
          setOrders((prev) => {
            const merged = mergeCloudOrdersWithLocalMeta(cloudOrders, prev);
            saveStoredOrders(merged);
            return merged;
          });
        }
      });
      fetchServicesFromSupabase().then((cloudServices) => {
        if (cloudServices && cloudServices.length > 0) {
          setServiceRequests(cloudServices);
          saveStoredServices(cloudServices);
        }
      });
      fetchMenuFromSupabase().then((cloudMenu) => {
        if (cloudMenu && cloudMenu.length > 0) {
          setMenu(cloudMenu);
          saveStoredMenu(cloudMenu);
        }
      });
      fetchTableTokensFromSupabase().then((cloudTokens) => {
        if (cloudTokens && cloudTokens.length > 0) {
          const current = getStoredTables();
          const updated = current.map((t) => {
            const ct = cloudTokens.find((c) => c.tableNumber === t.tableNumber);
            return ct ? { ...t, token: ct.token } : t;
          });
          saveStoredTables(updated);
        }
      });

      // 2. Continuous 5s heartbeat poll for cross-device resilience
      pollingTimer = setInterval(async () => {
        try {
          const cloudOrders = await fetchOrdersFromSupabase();
          if (cloudOrders) {
            setOrders((prev) => {
              const prevMap = new Map(prev.map((o) => [o.id, o]));
              let hasChanges = false;
              let hasNewIncoming = false;

              for (const co of cloudOrders) {
                const existing = prevMap.get(co.id);
                if (!existing) {
                  hasChanges = true;
                  hasNewIncoming = true;
                } else if (
                  existing.status !== co.status ||
                  existing.table !== co.table ||
                  existing.updatedAt !== co.updatedAt
                ) {
                  hasChanges = true;
                }
              }

              if (!hasChanges && cloudOrders.length === prev.length) {
                return prev;
              }

              if (hasNewIncoming) {
                playOrderChime();
              }

              const merged = mergeCloudOrdersWithLocalMeta(cloudOrders, prev);
              saveStoredOrders(merged);
              return merged;
            });
          }

          const cloudServices = await fetchServicesFromSupabase();
          if (cloudServices) {
            setServiceRequests((prev) => {
              const prevMap = new Map(prev.map((s) => [s.id, s]));
              let hasChanges = false;
              let hasNewPending = false;

              for (const cs of cloudServices) {
                const existing = prevMap.get(cs.id);
                if (!existing && cs.status === "Pending") {
                  hasChanges = true;
                  hasNewPending = true;
                } else if (existing && existing.status !== cs.status) {
                  hasChanges = true;
                }
              }

              if (!hasChanges && cloudServices.length === prev.length) {
                return prev;
              }

              if (hasNewPending) {
                playAlertChime();
              }

              saveStoredServices(cloudServices);
              return cloudServices;
            });
          }

          const cloudMenu = await fetchMenuFromSupabase();
          if (cloudMenu && cloudMenu.length > 0) {
            setMenu((prev) => {
              const isDiff =
                prev.length !== cloudMenu.length ||
                prev.some((p) => {
                  const cm = cloudMenu.find((m) => m.id === p.id);
                  return (
                    !cm ||
                    cm.price !== p.price ||
                    cm.available !== p.available ||
                    cm.name !== p.name ||
                    cm.description !== p.description ||
                    cm.tag !== p.tag
                  );
                });
              if (isDiff) {
                saveStoredMenu(cloudMenu);
                return cloudMenu;
              }
              return prev;
            });
          }
        } catch {
          // Ignore transient network errors
        }
      }, 5000);
    }

    // Listen for broadcast sync from other browser tabs / devices
    const unsubscribe = subscribeToSyncEvents((event) => {
      switch (event.type) {
        case "NEW_ORDER": {
          setOrders((prev) => [event.payload, ...prev]);
          setTableSessions((prev) => ({
            ...prev,
            [event.payload.table]: {
              tableNumber: event.payload.table,
              status: "ACTIVE_ORDER",
              lastActivityAt: Date.now(),
            },
          }));
          playOrderChime();
          break;
        }
        case "ORDER_STATUS_CHANGED": {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === event.payload.orderId
                ? { ...o, status: event.payload.status, updatedAt: event.payload.updatedAt }
                : o
            )
          );
          break;
        }
        case "ORDER_TRANSFERRED": {
          const { orderId, fromTable, newTable } = event.payload;
          setOrders((prev) =>
            prev.map((o) =>
              o.id === orderId
                ? { ...o, table: newTable, updatedAt: Date.now() }
                : o
            )
          );

          setTableNumber((currentTable) => {
            if (currentTable === fromTable) {
              const newToken = getTokenForTable(newTable);
              setActiveGuestSession({
                tableNumber: newTable,
                token: newToken,
                activatedAt: Date.now(),
              });
              setTransferNotice(
                `Your server moved your order from Table ${fromTable} to Table ${newTable}.`
              );
              return newTable;
            }
            return currentTable;
          });
          break;
        }
        case "ORDER_REJECTED": {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === event.payload.orderId
                ? {
                    ...o,
                    status: "Rejected" as OrderStatus,
                    rejectedReason: event.payload.reason,
                    updatedAt: Date.now(),
                  }
                : o
            )
          );
          break;
        }
        case "NEW_SERVICE_REQUEST": {
          setServiceRequests((prev) => [event.payload, ...prev]);
          if (event.payload.type === "Request Bill") {
            setTableSessions((prev) => ({
              ...prev,
              [event.payload.table]: {
                tableNumber: event.payload.table,
                status: "BILL_REQUESTED",
                lastActivityAt: Date.now(),
              },
            }));
          }
          playAlertChime();
          break;
        }
        case "SERVICE_RESOLVED": {
          setServiceRequests((prev) =>
            prev.map((s) =>
              s.id === event.payload.requestId
                ? { ...s, status: "Resolved", resolvedAt: event.payload.resolvedAt }
                : s
            )
          );
          break;
        }
        case "MENU_UPDATED": {
          setMenu(event.payload);
          break;
        }
        case "TABLE_STATUS_CHANGED": {
          setTableSessions((prev) => ({
            ...prev,
            [event.payload.tableNumber]: {
              tableNumber: event.payload.tableNumber,
              status: event.payload.status,
              seatedAt: event.payload.seatedAt,
              lastActivityAt: Date.now(),
            },
          }));
          break;
        }
        case "TABLE_CLEARED": {
          setTableSessions((prev) => ({
            ...prev,
            [event.payload.tableNumber]: {
              tableNumber: event.payload.tableNumber,
              status: "VACANT",
              lastActivityAt: Date.now(),
            },
          }));
          setOrders((prev) =>
            prev.map((o) =>
              o.table === event.payload.tableNumber && o.status !== "Archived"
                ? { ...o, status: "Archived" as OrderStatus, updatedAt: Date.now() }
                : o
            )
          );
          break;
        }
        case "GEO_CONFIG_UPDATED": {
          setGeoConfig(event.payload);
          break;
        }
        case "TABLE_TOKEN_ROTATED": {
          const current = getStoredTables();
          const updated = current.map((t) =>
            t.tableNumber === event.payload.tableNumber
              ? { ...t, token: event.payload.token }
              : t
          );
          saveStoredTables(updated);
          break;
        }
      }
    });

    // Subscribe to Supabase Realtime if configured
    const unsubscribeSupabase = subscribeToSupabaseRealtime((event) => {
      switch (event.type) {
        case "NEW_ORDER":
          setOrders((prev) =>
            prev.some((o) => o.id === event.payload.id) ? prev : [event.payload, ...prev]
          );
          playOrderChime();
          break;
        case "ORDER_STATUS_CHANGED":
          setOrders((prev) =>
            prev.map((o) =>
              o.id === event.payload.orderId
                ? { ...o, status: event.payload.status, updatedAt: event.payload.updatedAt }
                : o
            )
          );
          break;
        case "NEW_SERVICE_REQUEST":
          setServiceRequests((prev) =>
            prev.some((s) => s.id === event.payload.id) ? prev : [event.payload, ...prev]
          );
          playAlertChime();
          break;
        case "SERVICE_RESOLVED":
          setServiceRequests((prev) =>
            prev.map((s) =>
              s.id === event.payload.requestId
                ? { ...s, status: "Resolved", resolvedAt: event.payload.resolvedAt }
                : s
            )
          );
          break;
        case "MENU_UPDATED":
          setMenu(event.payload);
          saveStoredMenu(event.payload);
          break;
      }
    });

    return () => {
      if (pollingTimer) clearInterval(pollingTimer);
      unsubscribe();
      unsubscribeSupabase();
    };
  }, []);

  // Diff-aware Menu Update (handles Add, Edit/Toggle, and Delete with Supabase Cloud)
  const handleUpdateMenu = (newMenu: MenuItem[]) => {
    const prevMap = new Map(menu.map((m) => [m.id, m]));
    const nextMap = new Map(newMenu.map((m) => [m.id, m]));

    // 1. Sync newly added items (POST)
    for (const item of newMenu) {
      const prev = prevMap.get(item.id);
      if (!prev) {
        syncNewMenuItemToSupabase(item);
      } else if (
        prev.name !== item.name ||
        prev.price !== item.price ||
        prev.available !== item.available ||
        prev.description !== item.description ||
        prev.tag !== item.tag ||
        prev.prepTimeMinutes !== item.prepTimeMinutes
      ) {
        // 2. Sync only modified items (PATCH)
        syncMenuItemUpdateToSupabase(item);
      }
    }

    // 3. Sync deleted items (DELETE)
    for (const oldItem of menu) {
      if (!nextMap.has(oldItem.id)) {
        syncDeleteMenuItemFromSupabase(oldItem.id);
      }
    }

    setMenu(newMenu);
    saveStoredMenu(newMenu);
    broadcastSyncEvent({ type: "MENU_UPDATED", payload: newMenu });
  };

  const handleUpdateGeoConfig = (newConfig: GeoFenceConfig) => {
    setGeoConfig(newConfig);
    saveStoredGeoConfig(newConfig);
    broadcastSyncEvent({ type: "GEO_CONFIG_UPDATED", payload: newConfig });
  };

  const handleUpdateTableStatus = (table: number, status: TableOccupancyStatus) => {
    const updated = updateTableStatus(table, status);
    setTableSessions((prev) => ({ ...prev, [table]: updated }));
    broadcastSyncEvent({
      type: "TABLE_STATUS_CHANGED",
      payload: { tableNumber: table, status, seatedAt: updated.seatedAt },
    });
  };

  const handleClearTable = (table: number) => {
    const cleared = clearTableFloorSession(table);
    setTableSessions((prev) => ({ ...prev, [table]: cleared }));

    // Archive all active orders for this table & sync to Supabase
    const updatedOrders = orders.map((o) => {
      if (o.table === table && o.status !== "Archived") {
        syncOrderStatusToSupabase(o.id, "Archived");
        return { ...o, status: "Archived" as OrderStatus, updatedAt: Date.now() };
      }
      return o;
    });
    setOrders(updatedOrders);
    saveStoredOrders(updatedOrders);

    // Resolve any pending service requests for this table & sync to Supabase
    const updatedServices = serviceRequests.map((s) => {
      if (s.table === table && s.status === "Pending") {
        syncServiceResolveToSupabase(s.id);
        return { ...s, status: "Resolved" as const, resolvedAt: Date.now() };
      }
      return s;
    });
    setServiceRequests(updatedServices);
    saveStoredServices(updatedServices);

    broadcastSyncEvent({ type: "TABLE_CLEARED", payload: { tableNumber: table } });
  };

  const handlePlaceOrder = (
    items: OrderItem[],
    meta?: { geoVerified?: boolean; distanceMeters?: number }
  ) => {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const serviceFee = subtotal > 0 ? 1.5 : 0;
    const total = subtotal + serviceFee;

    const currentTableSession = tableSessions[tableNumber];
    const tableWasVacant = !currentTableSession || currentTableSession.status === "VACANT";

    const newOrder: OrderCard = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orderNumber: Math.floor(100 + Math.random() * 900),
      table: tableNumber,
      items,
      subtotal,
      serviceFee,
      total,
      status: "New",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      geoVerified: meta?.geoVerified ?? true,
      distanceMeters: meta?.distanceMeters,
      tableWasVacant,
    };

    const nextOrders = [newOrder, ...orders];
    setOrders(nextOrders);
    saveStoredOrders(nextOrders);
    broadcastSyncEvent({ type: "NEW_ORDER", payload: newOrder });
    syncOrderToSupabase(newOrder);

    handleUpdateTableStatus(tableNumber, "ACTIVE_ORDER");
  };

  const handleUpdateOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    const updatedAt = Date.now();
    const nextOrders = orders.map((o) =>
      o.id === orderId ? { ...o, status: nextStatus, updatedAt } : o
    );
    setOrders(nextOrders);
    saveStoredOrders(nextOrders);
    broadcastSyncEvent({
      type: "ORDER_STATUS_CHANGED",
      payload: { orderId, status: nextStatus, updatedAt },
    });
    syncOrderStatusToSupabase(orderId, nextStatus);
  };

  const handleRejectOrder = (orderId: string, reason: string) => {
    const updatedAt = Date.now();
    const nextOrders = orders.map((o) =>
      o.id === orderId
        ? { ...o, status: "Rejected" as OrderStatus, rejectedReason: reason, updatedAt }
        : o
    );
    setOrders(nextOrders);
    saveStoredOrders(nextOrders);
    broadcastSyncEvent({ type: "ORDER_REJECTED", payload: { orderId, reason } });
    syncOrderStatusToSupabase(orderId, "Rejected" as OrderStatus);
  };

  const handleTransferOrder = (orderId: string, newTable: number) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    const fromTable = targetOrder ? targetOrder.table : tableNumber;
    const updatedAt = Date.now();

    const nextOrders = orders.map((o) =>
      o.id === orderId ? { ...o, table: newTable, updatedAt } : o
    );
    setOrders(nextOrders);
    saveStoredOrders(nextOrders);

    if (tableNumber === fromTable) {
      setTableNumber(newTable);
      setActiveGuestSession({
        tableNumber: newTable,
        token: getTokenForTable(newTable),
        activatedAt: Date.now(),
      });
      setTransferNotice(`Order transferred: You are now at Table ${newTable}.`);
    }

    broadcastSyncEvent({
      type: "ORDER_TRANSFERRED",
      payload: { orderId, fromTable, newTable },
    });
    syncOrderTransferToSupabase(orderId, newTable);
  };

  const handleRequestService = (type: ServiceType) => {
    const newRequest: ServiceRequest = {
      id: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      table: tableNumber,
      type,
      status: "Pending",
      createdAt: Date.now(),
    };

    const nextServices = [newRequest, ...serviceRequests];
    setServiceRequests(nextServices);
    saveStoredServices(nextServices);
    broadcastSyncEvent({ type: "NEW_SERVICE_REQUEST", payload: newRequest });
    syncServiceRequestToSupabase(newRequest);

    if (type === "Request Bill") {
      handleUpdateTableStatus(tableNumber, "BILL_REQUESTED");
    }
  };

  const handleResolveService = (requestId: string) => {
    const resolvedAt = Date.now();
    const nextServices = serviceRequests.map((s) =>
      s.id === requestId ? { ...s, status: "Resolved" as const, resolvedAt } : s
    );
    setServiceRequests(nextServices);
    saveStoredServices(nextServices);
    broadcastSyncEvent({
      type: "SERVICE_RESOLVED",
      payload: { requestId, resolvedAt },
    });
    syncServiceResolveToSupabase(requestId);
  };

  // Gatekeeping Navigation
  const handleSelectRole = (role: UserRole) => {
    if (role === "guest") {
      setActiveRole("guest");
      return;
    }

    if (role === "kitchen") {
      if (authenticatedRole === "kitchen" || authenticatedRole === "owner") {
        setActiveRole("kitchen");
      } else {
        setPinModalRole("kitchen");
      }
      return;
    }

    if (role === "owner") {
      if (authenticatedRole === "owner") {
        setActiveRole("owner");
      } else {
        setPinModalRole("owner");
      }
      return;
    }
  };

  const handlePinSuccess = (role: "kitchen" | "owner") => {
    setAuthenticatedRole(role);
    setActiveRole(role);
    setPinModalRole(null);
  };

  const handleLockSession = () => {
    clearAuthSession();
    setAuthenticatedRole("none");
    setActiveRole("guest");
  };

  if (!isClientLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] text-slate-800">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-600">
            Initializing TableTapp...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fffcf7,_#f8f3eb_40%,_#efe7dc_100%)] px-4 py-5 pb-28 text-slate-900 sm:px-6 sm:py-6 lg:px-10 lg:pb-10">
      <div className="mx-auto max-w-7xl">
        <OfflineBanner />

        {/* Global Navigation Header */}
        <header className="mb-6 flex flex-col gap-4 rounded-[28px] border border-slate-200/90 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-amber-400 shadow-md">
              <UtensilsIcon size={22} />
            </span>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                TableTapp
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Sunshine Bistro</span>
                <span aria-hidden="true">•</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {isSupabaseConfigured() ? "Supabase Cloud Live" : "Local Sync Active"}
                </span>
                {geoConfig.enabled && (
                  <>
                    <span aria-hidden="true">•</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                      <MapPinIcon size={13} />
                      <span>GPS Geofence Active</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Role Navigation / Gatekeeper Bar (44px min touch targets) */}
          <nav aria-label="Role Switcher" className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectRole("guest")}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
                activeRole === "guest"
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <UtensilsIcon size={15} />
              <span>Guest View (Table {tableNumber})</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectRole("kitchen")}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
                activeRole === "kitchen"
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <ChefHatIcon size={15} />
              <span>Kitchen KDS</span>
              {authenticatedRole !== "kitchen" && authenticatedRole !== "owner" && (
                <LockIcon size={12} className="opacity-70" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSelectRole("owner")}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
                activeRole === "owner"
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <ChartBarIcon size={15} />
              <span>Owner Suite</span>
              {authenticatedRole !== "owner" && (
                <LockIcon size={12} className="opacity-70" />
              )}
            </button>

            {authenticatedRole !== "none" && (
              <button
                type="button"
                onClick={handleLockSession}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                title="Lock staff session and return to guest mode"
              >
                <LockIcon size={13} />
                <span>Lock</span>
              </button>
            )}
          </nav>
        </header>

        {/* View Rendering based on Active Role */}
        <section className="mt-6">
          {activeRole === "guest" && (
            <GuestView
              key={tableNumber}
              tableNumber={tableNumber}
              onTableChange={setTableNumber}
              isStaff={authenticatedRole !== "none"}
              menu={menu}
              tableOrders={orders}
              transferNotice={transferNotice}
              onDismissTransferNotice={() => setTransferNotice(null)}
              onPlaceOrder={handlePlaceOrder}
              onRequestService={handleRequestService}
              onOpenStaffLogin={(role) => setPinModalRole(role)}
              geoConfig={geoConfig}
            />
          )}

          {activeRole === "kitchen" && (
            <KitchenView
              orders={orders}
              serviceRequests={serviceRequests}
              tableSessions={tableSessions}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onResolveService={handleResolveService}
              onTransferOrder={handleTransferOrder}
              onUpdateTableStatus={handleUpdateTableStatus}
              onClearTable={handleClearTable}
              onRejectOrder={handleRejectOrder}
              onLockSession={handleLockSession}
            />
          )}

          {activeRole === "owner" && (
            <OwnerView
              menu={menu}
              orders={orders}
              services={serviceRequests}
              geoConfig={geoConfig}
              onUpdateMenu={handleUpdateMenu}
              onUpdateGeoConfig={handleUpdateGeoConfig}
              onLockSession={handleLockSession}
            />
          )}
        </section>
      </div>

      {/* Gatekeeping PIN Authentication Modal */}
      <PinModal
        isOpen={pinModalRole !== null}
        requestedRole={pinModalRole || "kitchen"}
        onSuccess={handlePinSuccess}
        onClose={() => setPinModalRole(null)}
      />
    </main>
  );
}
