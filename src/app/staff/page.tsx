"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GeoFenceConfig,
  MenuItem,
  OrderCard,
  OrderStatus,
  ServiceRequest,
  TableOccupancyStatus,
  TableSession,
} from "@/types";
import {
  broadcastSyncEvent,
  getPresetMenu,
  getStoredMenu,
  getStoredOrders,
  getStoredServices,
  mergeCloudOrdersWithLocalMeta,
  savePresetMenu,
  saveStoredMenu,
  saveStoredOrders,
  saveStoredServices,
  subscribeToSyncEvents,
} from "@/lib/sync";
import {
  HEATBOX_GEO_PRESET,
  HEATBOX_MENU_DATA,
} from "@/lib/presets";
import { clearAuthSession, getAuthState } from "@/lib/auth";
import {
  clearTableFloorSession,
  getStoredTables,
  getStoredTableSessions,
  saveStoredTables,
  updateTableStatus,
} from "@/lib/tables";
import { getStoredGeoConfig, saveStoredGeoConfig } from "@/lib/geo";
import {
  findRestaurantBySlugOrKey,
  isRestaurantSuspended,
  restaurantToGeoConfig,
  setRestaurantSuspensionFlag,
} from "@/lib/restaurants";
import {
  fetchGeoConfigFromSupabase,
  fetchMenuFromSupabase,
  fetchOrdersFromSupabase,
  fetchServicesFromSupabase,
  fetchTableTokensFromSupabase,
  isSupabaseConfigured,
  subscribeToSupabaseRealtime,
  syncDeleteMenuItemFromSupabase,
  syncGeoConfigToSupabase,
  syncMenuItemUpdateToSupabase,
  syncNewMenuItemToSupabase,
  syncOrderStatusToSupabase,
  syncOrderTransferToSupabase,
  syncServiceResolveToSupabase,
} from "@/lib/supabase";
import { playAlertChime, playOrderChime } from "@/lib/sound";
import {
  ChartBarIcon,
  ChefHatIcon,
  LockIcon,
  ShieldCheckIcon,
  UtensilsIcon,
} from "@/components/Icons";
import PinModal from "@/components/PinModal";
import OfflineBanner from "@/components/OfflineBanner";
import KitchenView from "@/components/KitchenView";
import OwnerView from "@/components/OwnerView";

export default function StaffHubPage({ restaurantSlug }: { restaurantSlug?: string } = {}) {
  const [activeTab, setActiveTab] = useState<"kitchen" | "owner">("kitchen");
  const [pinModalRole, setPinModalRole] = useState<"kitchen" | "owner" | null>(null);
  const [authenticatedRole, setAuthenticatedRole] = useState<"none" | "kitchen" | "owner">("none");
  const [isClientLoaded, setIsClientLoaded] = useState(false);

  const activeTenantSlug = (restaurantSlug || "heatbox").toLowerCase();
  const currentRestaurant = findRestaurantBySlugOrKey(activeTenantSlug);
  const [isSuspended, setIsSuspended] = useState<boolean>(() => isRestaurantSuspended(activeTenantSlug));

  // Synced Staff State
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<OrderCard[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [tableSessions, setTableSessions] = useState<Record<number, TableSession>>({});
  const [geoConfig, setGeoConfig] = useState<GeoFenceConfig>(getStoredGeoConfig());

  useEffect(() => {
    setIsClientLoaded(true);

    const auth = getAuthState();
    setAuthenticatedRole(auth.authenticatedRole);
    if (auth.authenticatedRole === "owner") {
      setActiveTab("owner");
    } else {
      setActiveTab("kitchen");
    }

    // Live restaurant status & custom tenant config/menu check
    fetch(`/api/restaurants/${activeTenantSlug}/status`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const suspended = data.status === "suspended" || Boolean(data.deleted);
          setIsSuspended(suspended);
          setRestaurantSuspensionFlag(activeTenantSlug, data.id || "", suspended);
          if (data.restaurant) {
            setGeoConfig(restaurantToGeoConfig(data.restaurant));
          }
          if (Array.isArray(data.menu) && data.menu.length > 0) {
            setMenu(data.menu);
          }
        }
      })
      .catch(() => {});

    const matched = restaurantSlug ? findRestaurantBySlugOrKey(restaurantSlug) : null;
    const initialGeo = matched ? restaurantToGeoConfig(matched) : getStoredGeoConfig();
    setGeoConfig(initialGeo);
    if (matched?.slug === "heatbox" || initialGeo.activePreset === "heatbox") {
      setMenu(getPresetMenu("heatbox"));
    } else {
      setMenu(getPresetMenu(initialGeo.activePreset || "heatbox"));
    }
    setOrders(getStoredOrders());
    setServiceRequests(getStoredServices());
    setTableSessions(getStoredTableSessions());

    const currentTenantId = matched?.id;

    let pollingTimer: NodeJS.Timeout | null = null;
    if (isSupabaseConfigured()) {
      fetchOrdersFromSupabase(currentTenantId).then((cloudOrders) => {
        if (cloudOrders && cloudOrders.length > 0) {
          setOrders((prev) => {
            const merged = mergeCloudOrdersWithLocalMeta(cloudOrders, prev);
            saveStoredOrders(merged);
            return merged;
          });
        }
      });
      fetchServicesFromSupabase(currentTenantId).then((cloudServices) => {
        if (cloudServices && cloudServices.length > 0) {
          setServiceRequests(cloudServices);
          saveStoredServices(cloudServices);
        }
      });
      fetchMenuFromSupabase().then((cloudMenu) => {
        if (cloudMenu && cloudMenu.length > 0) {
          saveStoredMenu(cloudMenu);
          if ((getStoredGeoConfig().activePreset || "default") === "default") {
            setMenu(cloudMenu);
          }
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
          if (cloudGeo.activePreset === "heatbox") {
            setMenu(getPresetMenu("heatbox"));
          }
        }
      });

      pollingTimer = setInterval(async () => {
        try {
          const cloudOrders = await fetchOrdersFromSupabase(currentTenantId);
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

              if (!hasChanges && cloudOrders.length === prev.length) return prev;
              if (hasNewIncoming) playOrderChime();

              const merged = mergeCloudOrdersWithLocalMeta(cloudOrders, prev);
              saveStoredOrders(merged);
              return merged;
            });
          }

          const cloudServices = await fetchServicesFromSupabase(currentTenantId);
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

              if (!hasChanges && cloudServices.length === prev.length) return prev;
              if (hasNewPending) playAlertChime();

              saveStoredServices(cloudServices);
              return cloudServices;
            });
          }

          if ((getStoredGeoConfig().activePreset || "default") === "default") {
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
                      cm.tag !== p.tag ||
                      cm.imageUrl !== p.imageUrl
                    );
                  });
                if (isDiff) {
                  saveStoredMenu(cloudMenu);
                  return cloudMenu;
                }
                return prev;
              });
            }
          }
        } catch {
          // Ignore transient network errors
        }
      }, 4000);
    }

    const unsubscribe = subscribeToSyncEvents((event) => {
      switch (event.type) {
        case "NEW_ORDER":
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
        case "ORDER_STATUS_CHANGED":
          setOrders((prev) =>
            prev.map((o) =>
              o.id === event.payload.orderId
                ? { ...o, status: event.payload.status, updatedAt: event.payload.updatedAt }
                : o
            )
          );
          break;
        case "ORDER_TRANSFERRED":
          setOrders((prev) =>
            prev.map((o) =>
              o.id === event.payload.orderId
                ? { ...o, table: event.payload.newTable, updatedAt: Date.now() }
                : o
            )
          );
          break;
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
        case "NEW_SERVICE_REQUEST":
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
          break;
        case "TABLE_STATUS_CHANGED":
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
        case "TABLE_CLEARED":
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
        case "RESTAURANT_STATUS_CHANGED": {
          if (
            event.payload.slug?.toLowerCase() === activeTenantSlug ||
            event.payload.restaurantId === currentRestaurant?.id
          ) {
            const suspended = event.payload.status === "suspended";
            setIsSuspended(suspended);
            setRestaurantSuspensionFlag(activeTenantSlug, event.payload.restaurantId, suspended);
          }
          break;
        }
        case "RESTAURANT_DELETED": {
          if (
            event.payload.slug?.toLowerCase() === activeTenantSlug ||
            event.payload.restaurantId === currentRestaurant?.id
          ) {
            setIsSuspended(true);
            setRestaurantSuspensionFlag(activeTenantSlug, event.payload.restaurantId, true);
          }
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
          saveStoredMenu(event.payload);
          if ((getStoredGeoConfig().activePreset || "default") === "default") {
            setMenu(event.payload);
          }
          break;
      }
    }, currentTenantId);

    return () => {
      if (pollingTimer) clearInterval(pollingTimer);
      unsubscribe();
      unsubscribeSupabase();
    };
  }, []);

  const handleUpdateMenu = (newMenu: MenuItem[]) => {

    const prevMap = new Map(menu.map((m) => [m.id, m]));
    const nextMap = new Map(newMenu.map((m) => [m.id, m]));

    for (const item of newMenu) {
      const prev = prevMap.get(item.id);
      if (!prev) {
        syncNewMenuItemToSupabase(item, currentRestaurant?.id);
      } else if (
        prev.name !== item.name ||
        prev.price !== item.price ||
        prev.available !== item.available ||
        prev.description !== item.description ||
        prev.tag !== item.tag ||
        prev.prepTimeMinutes !== item.prepTimeMinutes ||
        prev.imageUrl !== item.imageUrl
      ) {
        syncMenuItemUpdateToSupabase(item);
      }
    }

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
    syncGeoConfigToSupabase(newConfig);
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

    const updatedOrders = orders.map((o) => {
      if (o.table === table && o.status !== "Archived") {
        syncOrderStatusToSupabase(o.id, "Archived");
        return { ...o, status: "Archived" as OrderStatus, updatedAt: Date.now() };
      }
      return o;
    });
    setOrders(updatedOrders);
    saveStoredOrders(updatedOrders);

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
    const fromTable = targetOrder ? targetOrder.table : 1;
    const updatedAt = Date.now();

    const nextOrders = orders.map((o) =>
      o.id === orderId ? { ...o, table: newTable, updatedAt } : o
    );
    setOrders(nextOrders);
    saveStoredOrders(nextOrders);

    broadcastSyncEvent({
      type: "ORDER_TRANSFERRED",
      payload: { orderId, fromTable, newTable },
    });
    syncOrderTransferToSupabase(orderId, newTable);
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

  const handleSelectTab = (tab: "kitchen" | "owner") => {
    if (tab === "kitchen") {
      if (authenticatedRole === "kitchen" || authenticatedRole === "owner") {
        setActiveTab("kitchen");
      } else {
        setPinModalRole("kitchen");
      }
      return;
    }

    if (tab === "owner") {
      if (authenticatedRole === "owner") {
        setActiveTab("owner");
      } else {
        setPinModalRole("owner");
      }
    }
  };

  const handlePinSuccess = (role: "kitchen" | "owner") => {
    setAuthenticatedRole(role);
    setActiveTab(pinModalRole === "owner" ? "owner" : "kitchen");
    setPinModalRole(null);
  };

  const handleLockSession = () => {
    clearAuthSession();
    setAuthenticatedRole("none");
  };

  if (!isClientLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">
            Loading Staff Portal...
          </p>
        </div>
      </div>
    );
  }

  if (isClientLoaded && isSuspended) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-md w-full rounded-3xl border border-rose-500/30 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
            <LockIcon size={28} />
          </div>
          <h2 className="mt-4 text-xl font-black text-white">{currentRestaurant?.name || "Restaurant"} Hub Suspended</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Staff and kitchen operations for this restaurant branch are currently paused by the administrator.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-slate-800 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition"
          >
            Return to TableTapp
          </Link>
        </div>
      </main>
    );
  }

  // Unauthenticated Gatekeeper Screen at /staff
  if (authenticatedRole === "none") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-10 text-white">
        <OfflineBanner />

        <div className="w-full max-w-xl rounded-[32px] border border-slate-800 bg-slate-900/90 p-8 shadow-2xl">
          <div className="flex items-center gap-3.5 border-b border-slate-800 pb-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-md">
              <ShieldCheckIcon size={24} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
                {geoConfig.restaurantName || "TableTapp"} • Internal Operations
              </p>
              <h1 className="font-display text-2xl font-bold text-white">
                Staff &amp; Management Hub
              </h1>
            </div>
          </div>

          <p className="mt-5 text-xs text-slate-400 leading-relaxed">
            Select your station below and enter your authorized PIN to unlock real-time
            kitchen expediting or restaurant management.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setPinModalRole("kitchen")}
              className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/80 p-5 text-left transition hover:border-amber-500/60 hover:bg-slate-950"
            >
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <ChefHatIcon size={22} />
                </div>
                <h2 className="font-display mt-4 text-lg font-bold text-white group-hover:text-amber-400 transition">
                  Kitchen Display (KDS)
                </h2>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Live order tickets, prep timers, floor table lifecycle, and waiter service
                  alerts.
                </p>
              </div>
              <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <LockIcon size={13} />
                <span>Unlock with Staff PIN →</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPinModalRole("owner")}
              className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/80 p-5 text-left transition hover:border-amber-500/60 hover:bg-slate-950"
            >
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <ChartBarIcon size={22} />
                </div>
                <h2 className="font-display mt-4 text-lg font-bold text-white group-hover:text-emerald-400 transition">
                  Executive Owner Suite
                </h2>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Live menu pricing &amp; stock, cryptographic QR stand printing, GPS
                  geofencing, and revenue analytics.
                </p>
              </div>
              <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <LockIcon size={13} />
                <span>Unlock with Manager PIN →</span>
              </div>
            </button>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-5 text-xs text-slate-400">
            <Link
              href={restaurantSlug ? `/r/${restaurantSlug}` : "/"}
              className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-slate-300 hover:text-white transition"
            >
              <UtensilsIcon size={14} />
              <span>← Back to Customer Dining Menu</span>
            </Link>
            <span className="text-slate-500">Protected by Server PIN Auth</span>
          </div>
        </div>

        <PinModal
          isOpen={pinModalRole !== null}
          requestedRole={pinModalRole || "kitchen"}
          restaurantSlug={restaurantSlug}
          onSuccess={handlePinSuccess}
          onClose={() => setPinModalRole(null)}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fffcf7,_#f8f3eb_40%,_#efe7dc_100%)] px-4 py-5 pb-16 text-slate-900 sm:px-6 sm:py-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <OfflineBanner />

        {/* Dedicated Staff Operations Header */}
        <header className="mb-6 flex flex-col gap-4 rounded-[28px] border border-slate-200/90 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-amber-400 shadow-md">
              <ShieldCheckIcon size={22} />
            </span>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                TableTapp Staff Hub
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">
                  {geoConfig.restaurantName || "Heat Box Pizza"}
                </span>

              </div>
            </div>
          </div>

          <nav aria-label="Staff Station Switcher" className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectTab("kitchen")}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
                activeTab === "kitchen"
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <ChefHatIcon size={15} />
              <span>Kitchen KDS</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab("owner")}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
                activeTab === "owner"
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <ChartBarIcon size={15} />
              <span>Owner Suite</span>
              {authenticatedRole !== "owner" && <LockIcon size={12} className="opacity-70" />}
            </button>

            <Link
              href={restaurantSlug ? `/r/${restaurantSlug}` : "/"}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <UtensilsIcon size={14} />
              <span>Guest Menu</span>
            </Link>

            <button
              type="button"
              onClick={handleLockSession}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
            >
              <LockIcon size={13} />
              <span>Lock</span>
            </button>
          </nav>
        </header>

        <section className="mt-6">
          {activeTab === "kitchen" ? (
            <KitchenView
              orders={orders}
              serviceRequests={serviceRequests}
              tableSessions={tableSessions}
              geoConfig={geoConfig}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onResolveService={handleResolveService}
              onTransferOrder={handleTransferOrder}
              onUpdateTableStatus={handleUpdateTableStatus}
              onClearTable={handleClearTable}
              onRejectOrder={handleRejectOrder}
              onLockSession={handleLockSession}
            />
          ) : (
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

      <PinModal
        isOpen={pinModalRole !== null}
        requestedRole={pinModalRole || "owner"}
        restaurantSlug={restaurantSlug}
        onSuccess={handlePinSuccess}
        onClose={() => setPinModalRole(null)}
      />
    </main>
  );
}
