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
import { getAuthState } from "@/lib/auth";
import {
  getActiveGuestSession,
  getStoredTables,
  getStoredTableSessions,
  getTableByToken,
  getTokenForTable,
  saveStoredTables,
  setActiveGuestSession,
  updateTableStatus,
} from "@/lib/tables";
import { getServiceFee, getStoredGeoConfig, saveStoredGeoConfig } from "@/lib/geo";
import {
  fetchGeoConfigFromSupabase,
  fetchMenuFromSupabase,
  fetchOrdersFromSupabase,
  fetchTableTokensFromSupabase,
  isSupabaseConfigured,
  subscribeToSupabaseRealtime,
  syncOrderToSupabase,
  syncServiceRequestToSupabase,
} from "@/lib/supabase";
import {
  MapPinIcon,
  ShieldCheckIcon,
  UtensilsIcon,
} from "@/components/Icons";
import OfflineBanner from "@/components/OfflineBanner";
import GuestView from "@/components/GuestView";

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
  const [isStaff, setIsStaff] = useState(false);

  // Core Customer Synced State
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<OrderCard[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [tableNumber, setTableNumber] = useState<number>(7);
  const [transferNotice, setTransferNotice] = useState<string | null>(null);
  const [isClientLoaded, setIsClientLoaded] = useState(false);

  // Floor & Geo State
  const [tableSessions, setTableSessions] = useState<Record<number, TableSession>>({});
  const [geoConfig, setGeoConfig] = useState<GeoFenceConfig>(getStoredGeoConfig());

  useEffect(() => {
    setIsClientLoaded(true);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("t") || params.get("token");
      const urlTable = params.get("table");
      const auth = getAuthState();
      setIsStaff(auth.authenticatedRole !== "none");

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
        if (existingSession && auth.authenticatedRole === "none") {
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
    }

    setMenu(getStoredMenu());
    setOrders(getStoredOrders());
    setServiceRequests(getStoredServices());
    setTableSessions(getStoredTableSessions());
    setGeoConfig(getStoredGeoConfig());

    let pollingTimer: NodeJS.Timeout | null = null;
    if (isSupabaseConfigured()) {
      fetchOrdersFromSupabase().then((cloudOrders) => {
        if (cloudOrders && cloudOrders.length > 0) {
          setOrders((prev) => {
            const merged = mergeCloudOrdersWithLocalMeta(cloudOrders, prev);
            saveStoredOrders(merged);
            return merged;
          });
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
      fetchGeoConfigFromSupabase().then((cloudGeo) => {
        if (cloudGeo) {
          setGeoConfig(cloudGeo);
          saveStoredGeoConfig(cloudGeo);
        }
      });

      // 5s background sync for guest order tracker & live menu updates
      pollingTimer = setInterval(async () => {
        try {
          const cloudOrders = await fetchOrdersFromSupabase();
          if (cloudOrders) {
            setOrders((prev) => {
              const prevMap = new Map(prev.map((o) => [o.id, o]));
              let hasChanges = false;
              for (const co of cloudOrders) {
                const existing = prevMap.get(co.id);
                if (
                  !existing ||
                  existing.status !== co.status ||
                  existing.table !== co.table ||
                  existing.updatedAt !== co.updatedAt
                ) {
                  hasChanges = true;
                  break;
                }
              }
              if (!hasChanges && cloudOrders.length === prev.length) return prev;
              const merged = mergeCloudOrdersWithLocalMeta(cloudOrders, prev);
              saveStoredOrders(merged);
              return merged;
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

          const cloudGeo = await fetchGeoConfigFromSupabase();
          if (cloudGeo) {
            setGeoConfig((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(cloudGeo)) {
                saveStoredGeoConfig(cloudGeo);
                return cloudGeo;
              }
              return prev;
            });
          }
        } catch {
          // Ignore transient network errors
        }
      }, 5000);
    }

    const unsubscribe = subscribeToSyncEvents((event) => {
      switch (event.type) {
        case "NEW_ORDER":
          setOrders((prev) => [event.payload, ...prev]);
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
        case "ORDER_TRANSFERRED": {
          const { orderId, fromTable, newTable } = event.payload;
          setOrders((prev) =>
            prev.map((o) =>
              o.id === orderId ? { ...o, table: newTable, updatedAt: Date.now() } : o
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
        case "ORDER_REJECTED":
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
        case "MENU_UPDATED":
          setMenu(event.payload);
          break;
        case "TABLE_CLEARED":
          setOrders((prev) =>
            prev.map((o) =>
              o.table === event.payload.tableNumber && o.status !== "Archived"
                ? { ...o, status: "Archived" as OrderStatus, updatedAt: Date.now() }
                : o
            )
          );
          break;
        case "GEO_CONFIG_UPDATED":
          setGeoConfig(event.payload);
          break;
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

    const unsubscribeSupabase = subscribeToSupabaseRealtime((event) => {
      switch (event.type) {
        case "NEW_ORDER":
          setOrders((prev) =>
            prev.some((o) => o.id === event.payload.id) ? prev : [event.payload, ...prev]
          );
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

  const handleUpdateTableStatus = (table: number, status: TableOccupancyStatus) => {
    const updated = updateTableStatus(table, status);
    setTableSessions((prev) => ({ ...prev, [table]: updated }));
    broadcastSyncEvent({
      type: "TABLE_STATUS_CHANGED",
      payload: { tableNumber: table, status, seatedAt: updated.seatedAt },
    });
  };

  const handlePlaceOrder = (
    items: OrderItem[],
    meta?: { geoVerified?: boolean; distanceMeters?: number }
  ) => {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const serviceFee = getServiceFee(subtotal, geoConfig);
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

  if (!isClientLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] text-slate-800">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-600">
            Loading Sunshine Bistro Menu...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fffcf7,_#f8f3eb_40%,_#efe7dc_100%)] px-4 py-5 pb-28 text-slate-900 sm:px-6 sm:py-6 lg:px-10 lg:pb-10">
      <div className="mx-auto max-w-7xl">
        <OfflineBanner />

        {/* Pure Customer Dining Header (Zero Staff Controls) */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-slate-200/90 bg-white px-5 py-4 shadow-sm sm:px-6">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-amber-400 shadow-md">
              <UtensilsIcon size={22} />
            </span>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {geoConfig.restaurantName || "Sunshine Bistro"}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{geoConfig.tagline || "Direct Kitchen Ordering"}</span>
                </span>
                {geoConfig.enabled && (
                  <>
                    <span aria-hidden="true">•</span>
                    <span className="inline-flex items-center gap-1 font-medium text-amber-800">
                      <MapPinIcon size={13} />
                      <span>On-Premises Verified</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-950">
            <ShieldCheckIcon size={15} className="text-amber-700" />
            <span>Table {tableNumber}</span>
          </div>
        </header>

        <GuestView
          key={tableNumber}
          tableNumber={tableNumber}
          onTableChange={setTableNumber}
          isStaff={isStaff}
          menu={menu}
          tableOrders={orders}
          transferNotice={transferNotice}
          onDismissTransferNotice={() => setTransferNotice(null)}
          onPlaceOrder={handlePlaceOrder}
          onRequestService={handleRequestService}
          geoConfig={geoConfig}
        />
      </div>
    </main>
  );
}
