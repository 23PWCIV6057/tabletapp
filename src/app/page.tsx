"use client";

import { useEffect, useState } from "react";
import { GeoFenceConfig, MenuItem, OrderCard, OrderItem, OrderStatus, ServiceRequest, ServiceType, TableOccupancyStatus, TableSession, UserRole } from "@/types";
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
  getStoredTableSessions,
  getTableByToken,
  getTokenForTable,
  saveStoredTableSessions,
  setActiveGuestSession,
  updateTableStatus,
} from "@/lib/tables";
import { getStoredGeoConfig, saveStoredGeoConfig } from "@/lib/geo";
import {
  fetchMenuFromSupabase,
  fetchOrdersFromSupabase,
  fetchServicesFromSupabase,
  isSupabaseConfigured,
  subscribeToSupabaseRealtime,
  syncMenuItemUpdateToSupabase,
  syncOrderStatusToSupabase,
  syncOrderToSupabase,
  syncOrderTransferToSupabase,
  syncServiceRequestToSupabase,
  syncServiceResolveToSupabase,
} from "@/lib/supabase";
import { playAlertChime, playOrderChime } from "@/lib/sound";
import PinModal from "@/components/PinModal";
import OfflineBanner from "@/components/OfflineBanner";
import GuestView from "@/components/GuestView";
import KitchenView from "@/components/KitchenView";
import OwnerView from "@/components/OwnerView";

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
        // If guest has existing session, lock to it; otherwise allow param
        const existingSession = getActiveGuestSession();
        if (existingSession && getAuthState().authenticatedRole === "none") {
          setTableNumber(existingSession.tableNumber);
        } else {
          setTableNumber(Number(urlTable));
        }
      } else {
        const existingSession = getActiveGuestSession();
        if (existingSession) {
          setTableNumber(existingSession.tableNumber);
        }
      }

      // Check existing auth session
      const auth = getAuthState();
      setAuthenticatedRole(auth.authenticatedRole);
    }

    // Load initial stored states
    setMenu(getStoredMenu());
    setOrders(getStoredOrders());
    setServiceRequests(getStoredServices());
    setTableSessions(getStoredTableSessions());
    setGeoConfig(getStoredGeoConfig());

    // High-Frequency Real-time Auto-Sync Loop (Every 2.5s) across all devices
    let pollingTimer: NodeJS.Timeout | null = null;
    if (isSupabaseConfigured()) {
      // 1. Initial immediate hydration
      fetchOrdersFromSupabase().then((cloudOrders) => {
        if (cloudOrders && cloudOrders.length > 0) {
          setOrders(cloudOrders);
          saveStoredOrders(cloudOrders);
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

      // 2. Continuous 2.5s heartbeat poll for instant cross-device updates
      pollingTimer = setInterval(async () => {
        try {
          // Sync Orders
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

              saveStoredOrders(cloudOrders);
              return cloudOrders;
            });
          }

          // Sync Services
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

          // Sync Menu
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
                    cm.name !== p.name
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
      }, 2500);
    }

    // Listen for broadcast sync from other browser tabs / devices
    const unsubscribe = subscribeToSyncEvents((event) => {
      switch (event.type) {
        case "NEW_ORDER": {
          setOrders((prev) => [event.payload, ...prev]);
          // Update table floor status to ACTIVE_ORDER
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
              setTransferNotice(`🔔 Your server moved your order from Table ${fromTable} to Table ${newTable}!`);
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
                ? { ...o, status: "Rejected" as OrderStatus, rejectedReason: event.payload.reason, updatedAt: Date.now() }
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
          // Archive orders for cleared table
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
      }
    });

    // Subscribe to Supabase Realtime if configured
    const unsubscribeSupabase = subscribeToSupabaseRealtime((event) => {
      switch (event.type) {
        case "NEW_ORDER":
          setOrders((prev) => (prev.some((o) => o.id === event.payload.id) ? prev : [event.payload, ...prev]));
          playOrderChime();
          break;
        case "ORDER_STATUS_CHANGED":
          setOrders((prev) =>
            prev.map((o) => (o.id === event.payload.orderId ? { ...o, status: event.payload.status, updatedAt: event.payload.updatedAt } : o))
          );
          break;
        case "NEW_SERVICE_REQUEST":
          setServiceRequests((prev) => (prev.some((s) => s.id === event.payload.id) ? prev : [event.payload, ...prev]));
          playAlertChime();
          break;
      }
    });

    return () => {
      if (pollingTimer) clearInterval(pollingTimer);
      unsubscribe();
      unsubscribeSupabase();
    };
  }, []);

  // Sync state changes to storage whenever they change locally
  const handleUpdateMenu = (newMenu: MenuItem[]) => {
    setMenu(newMenu);
    saveStoredMenu(newMenu);
    broadcastSyncEvent({ type: "MENU_UPDATED", payload: newMenu });

    // Sync menu items to Supabase Cloud
    for (const item of newMenu) {
      syncMenuItemUpdateToSupabase(item);
    }
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

    // Archive all active orders for this table
    const updatedOrders = orders.map((o) =>
      o.table === table && o.status !== "Archived"
        ? { ...o, status: "Archived" as OrderStatus, updatedAt: Date.now() }
        : o
    );
    setOrders(updatedOrders);
    saveStoredOrders(updatedOrders);

    // Resolve any pending service requests for this table
    const updatedServices = serviceRequests.map((s) =>
      s.table === table && s.status === "Pending"
        ? { ...s, status: "Resolved" as const, resolvedAt: Date.now() }
        : s
    );
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

    // Check if table was marked VACANT before this order arrived
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

    // Auto-advance table floor status to ACTIVE_ORDER
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
      setTransferNotice(`🔔 Order transferred: You are now at Table ${newTable}.`);
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
      <div className="flex min-h-screen items-center justify-center bg-[#fffaf1] text-slate-800">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">
            Initializing TableTapp...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fffbf3,_#f7f2ea_35%,_#efe7dd_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <OfflineBanner />

        {/* Global Navigation Header */}
        <header className="mb-6 flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-2xl font-black text-slate-950 shadow-md">
              ⚡
            </span>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                TableTapp
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Sunshine Bistro</span>
                <span>•</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {isSupabaseConfigured() ? "Supabase Cloud Live" : "Local Sync Active"}
                </span>
                {geoConfig.enabled && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-amber-700">📍 GPS Geofence Active</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Role Navigation / Gatekeeper Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectRole("guest")}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                activeRole === "guest"
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              🍽️ Guest View (Table {tableNumber})
            </button>

            <button
              type="button"
              onClick={() => handleSelectRole("kitchen")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
                activeRole === "kitchen"
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>🍳 Kitchen KDS</span>
              {authenticatedRole !== "kitchen" && authenticatedRole !== "owner" && (
                <span className="text-[10px] opacity-75">🔒</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSelectRole("owner")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
                activeRole === "owner"
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>📊 Owner Suite</span>
              {authenticatedRole !== "owner" && (
                <span className="text-[10px] opacity-75">🔒</span>
              )}
            </button>

            {authenticatedRole !== "none" && (
              <button
                type="button"
                onClick={handleLockSession}
                className="ml-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                title="Lock staff session and return to guest mode"
              >
                🔒 Lock
              </button>
            )}
          </div>
        </header>

        {/* View Rendering based on Active Role */}
        <section className="mt-8">
          {activeRole === "guest" && (
            <GuestView
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
