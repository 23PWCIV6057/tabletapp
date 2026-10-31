"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  GeoFenceConfig,
  LeaderboardEntry,
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
  getPresetMenu,
  getStoredMenu,
  getStoredOrders,
  getStoredServices,
  mergeCloudOrdersWithLocalMeta,
  saveStoredMenu,
  saveStoredOrders,
  saveStoredServices,
  subscribeToSyncEvents,
} from "@/lib/sync";
import {
  HEATBOX_GEO_PRESET,
} from "@/lib/presets";
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
import {
  getServiceFee,
  getStoredGeoConfig,
  getStoredLeaderboard,
  saveStoredGeoConfig,
  saveStoredLeaderboard,
} from "@/lib/geo";
import {
  findRestaurantBySlugOrKey,
  isRestaurantSuspended,
  restaurantToGeoConfig,
  setRestaurantSuspensionFlag,
} from "@/lib/restaurants";
import {
  fetchGeoConfigFromSupabase,
  fetchLeaderboardFromSupabase,
  fetchMenuFromSupabase,
  fetchOrdersFromSupabase,
  fetchTableTokensFromSupabase,
  isSupabaseConfigured,
  subscribeToSupabaseRealtime,
  syncLeaderboardToSupabase,
  syncOrderToSupabase,
  syncServiceRequestToSupabase,
  syncTableSession,
} from "@/lib/supabase";
import {
  CheckCircleIcon,
  CopyIcon,
  GamepadIcon,
  InstagramIcon,
  LockIcon,
  MapPinIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrophyIcon,
  UtensilsIcon,
  WifiIcon,
  XIcon,
} from "@/components/Icons";
import OfflineBanner from "@/components/OfflineBanner";
import GuestView from "@/components/GuestView";
import QRCodeView from "@/components/QRCodeView";
import CafeArcadeModal from "@/components/CafeArcadeModal";

export default function Home({ restaurantSlug }: { restaurantSlug?: string } = {}) {
  const [isStaff, setIsStaff] = useState(false);

  const activeTenantSlug = (restaurantSlug || "heatbox").toLowerCase();
  const currentRestaurant = findRestaurantBySlugOrKey(activeTenantSlug);
  const [isSuspended, setIsSuspended] = useState<boolean>(() => isRestaurantSuspended(activeTenantSlug));

  // Core Customer Synced State
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<OrderCard[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"hub" | "table">("hub");
  const [transferNotice, setTransferNotice] = useState<string | null>(null);
  const [isClientLoaded, setIsClientLoaded] = useState(false);

  // Welcome Hub Modals & Arcade State
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isWifiModalOpen, setIsWifiModalOpen] = useState(false);
  const [isArcadeModalOpen, setIsArcadeModalOpen] = useState(false);
  const [wifiCopied, setWifiCopied] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // QR Scanner & Manual Check-In States
  const [selectedCheckInTable, setSelectedCheckInTable] = useState<number>(1);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastOrderFingerprintRef = useRef<{ value: string; at: number } | null>(null);
  const lastServiceFingerprintRef = useRef<{ value: string; at: number } | null>(null);

  // Floor & Geo State
  const [tableSessions, setTableSessions] = useState<Record<number, TableSession>>({});
  const [geoConfig, setGeoConfig] = useState<GeoFenceConfig>(getStoredGeoConfig());

  useEffect(() => {
    setIsClientLoaded(true);

    let urlPresetOverride: "default" | "heatbox" | null = null;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("t") || params.get("token");
      const urlTable = params.get("table");
      const urlPreset = (params.get("preset") || params.get("brand") || "").toLowerCase();
      if (urlPreset === "heatbox") urlPresetOverride = "heatbox";
      else if (urlPreset === "default") urlPresetOverride = "default";

      const auth = getAuthState();
      setIsStaff(auth.authenticatedRole !== "none");

      if (urlToken) {
        const found = getTableByToken(urlToken);
        if (found) {
          setTableNumber(found.tableNumber);
          setViewMode("table");
          setActiveGuestSession({
            tableNumber: found.tableNumber,
            token: found.token,
            activatedAt: Date.now(),
          });
        }
      } else {
        const existingSession = getActiveGuestSession();
        if (existingSession) {
          setTableNumber(existingSession.tableNumber);
        }
      }
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
    let initialGeo = matched ? restaurantToGeoConfig(matched) : getStoredGeoConfig();
    if (urlPresetOverride === "heatbox") {
      initialGeo = { ...initialGeo, ...HEATBOX_GEO_PRESET, activePreset: "heatbox" };
      saveStoredGeoConfig(initialGeo);
    }

    setGeoConfig(initialGeo);
    if (matched?.slug === "heatbox" || initialGeo.activePreset === "heatbox") {
      setMenu(getPresetMenu("heatbox"));
    } else {
      setMenu(getPresetMenu(initialGeo.activePreset || "heatbox"));
    }
    setOrders(getStoredOrders());
    setServiceRequests(getStoredServices());
    setTableSessions(getStoredTableSessions());
    setLeaderboard(getStoredLeaderboard());

    let currentTenantId = matched?.id;

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
      fetchMenuFromSupabase().then((cloudMenu) => {
        if (cloudMenu && cloudMenu.length > 0) {
          saveStoredMenu(cloudMenu);
          const currentPreset = urlPresetOverride || getStoredGeoConfig().activePreset || "default";
          if (currentPreset === "default") {
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
        if (cloudGeo && !urlPresetOverride) {
          setGeoConfig(cloudGeo);
          saveStoredGeoConfig(cloudGeo);
          if (cloudGeo.activePreset === "heatbox") {
            setMenu(getPresetMenu("heatbox"));
          }
        }
      });
      fetchLeaderboardFromSupabase(currentRestaurant?.id).then((cloudLb) => {
        if (cloudLb && cloudLb.length > 0) {
          setLeaderboard(cloudLb);
          saveStoredLeaderboard(cloudLb);
        }
      });

      // 5s background sync for guest order tracker & live menu updates
      pollingTimer = setInterval(async () => {
        try {
          const cloudOrders = await fetchOrdersFromSupabase(currentTenantId);
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

          const currentPreset = urlPresetOverride || getStoredGeoConfig().activePreset || "default";
          if (currentPreset === "default") {
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

          const cloudGeo = await fetchGeoConfigFromSupabase();
          if (cloudGeo && !urlPresetOverride) {
            setGeoConfig((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(cloudGeo)) {
                saveStoredGeoConfig(cloudGeo);
                if (cloudGeo.activePreset !== prev.activePreset) {
                  setMenu(getPresetMenu(cloudGeo.activePreset || "default"));
                }
                return cloudGeo;
              }
              return prev;
            });
          }

          const cloudLb = await fetchLeaderboardFromSupabase(currentRestaurant?.id);
          if (cloudLb && cloudLb.length > 0) {
            setLeaderboard((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(cloudLb)) {
                saveStoredLeaderboard(cloudLb);
                return cloudLb;
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
          setMenu(getPresetMenu(event.payload.activePreset || "default"));
          break;
        case "LEADERBOARD_UPDATED":
          setLeaderboard(event.payload);
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

  // Live Camera QR Scanner Effect when Scan Modal is open
  useEffect(() => {
    if (!isScanModalOpen || !cameraActive) return;
    let stream: MediaStream | null = null;
    let scanTimer: NodeJS.Timeout | null = null;

    async function startCamera() {
      try {
        setCameraError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Use native BarcodeDetector if available in mobile browser
        const BarcodeDetectorClass = (
          window as unknown as {
            BarcodeDetector?: new (opts: { formats: string[] }) => {
              detect: (el: HTMLVideoElement) => Promise<{ rawValue?: string }[]>;
            };
          }
        ).BarcodeDetector;

        if (BarcodeDetectorClass) {
          const detector = new BarcodeDetectorClass({ formats: ["qr_code"] });
          scanTimer = setInterval(async () => {
            if (!videoRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes.length > 0 && codes[0].rawValue) {
                const raw = codes[0].rawValue;
                const matchTable = raw.match(/[?&]table=(\d+)/i);
                const matchToken = raw.match(/\/t\/([a-zA-Z0-9_]+)/i);
                if (matchTable) {
                  const num = Math.min(16, Math.max(1, Number(matchTable[1])));
                  handleSeatAtTable(num);
                } else if (matchToken) {
                  const found = getTableByToken(matchToken[1]);
                  if (found) handleSeatAtTable(found.tableNumber);
                }
              }
            } catch {
              // Ignore frame detection error
            }
          }, 350);
        }
      } catch {
        setCameraError(
          "Camera permission denied or unavailable. Select your table number below to sit immediately."
        );
        setCameraActive(false);
      }
    }

    startCamera();

    return () => {
      if (scanTimer) clearInterval(scanTimer);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isScanModalOpen, cameraActive]);

  const handleSeatAtTable = (num: number) => {
    // Customers can only be seated if they don't already have a table session,
    // or if action is initiated by staff override.
    if (tableNumber !== null && !isStaff) {
      alert(`You are currently checked into Table ${tableNumber}. Table transfers must be processed by your server or kitchen staff.`);
      setIsScanModalOpen(false);
      setCameraActive(false);
      return;
    }
    const validNum = Math.min(16, Math.max(1, num));
    setTableNumber(validNum);
    setViewMode("table");
    setIsScanModalOpen(false);
    setCameraActive(false);
    setActiveGuestSession({
      tableNumber: validNum,
      token: getTokenForTable(validNum),
      activatedAt: Date.now(),
    });
  };

  const handleSubmitArcadeScore = (entry: Omit<LeaderboardEntry, "id" | "createdAt">) => {
    const newEntry: LeaderboardEntry = {
      ...entry,
      id: `lb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    const next = [newEntry, ...leaderboard]
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
    setLeaderboard(next);
    saveStoredLeaderboard(next);
    broadcastSyncEvent({ type: "LEADERBOARD_UPDATED", payload: next });
    syncLeaderboardToSupabase(next, currentRestaurant?.id);
  };

  const handleCopyWifiPassword = () => {
    const pwd = geoConfig.wifiPassword || "heatbox123";
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(pwd);
      setWifiCopied(true);
      setTimeout(() => setWifiCopied(false), 2500);
    }
  };

  const handleUpdateTableStatus = (table: number, status: TableOccupancyStatus) => {
    const updated = updateTableStatus(table, status);
    setTableSessions((prev) => ({ ...prev, [table]: updated }));
    broadcastSyncEvent({
      type: "TABLE_STATUS_CHANGED",
      payload: { tableNumber: table, status, seatedAt: updated.seatedAt },
    });
    syncTableSession(table, status, updated.seatedAt);
  };

  const handlePlaceOrder = (
    items: OrderItem[],
    meta?: { geoVerified?: boolean; distanceMeters?: number }
  ) => {
    if (isSuspended || isRestaurantSuspended(activeTenantSlug)) {
      alert("This dining location is currently suspended by management. New orders cannot be placed.");
      return;
    }
    const activeTable = tableNumber || 1;
    const fingerprint = JSON.stringify({
      table: activeTable,
      items: items.map((item) => [item.itemId, item.quantity, item.selectedModifiers, item.specialInstructions]),
    });
    const now = Date.now();
    if (
      lastOrderFingerprintRef.current?.value === fingerprint &&
      now - lastOrderFingerprintRef.current.at < 5000
    ) {
      return;
    }
    lastOrderFingerprintRef.current = { value: fingerprint, at: now };
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const serviceFee = getServiceFee(subtotal, geoConfig);
    const total = subtotal + serviceFee;

    const currentTableSession = tableSessions[activeTable];
    const tableWasVacant = !currentTableSession || currentTableSession.status === "VACANT";

    const newOrder: OrderCard = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orderNumber: Math.floor(100 + Math.random() * 900),
      table: activeTable,
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
    syncOrderToSupabase(newOrder, currentRestaurant?.id);

    handleUpdateTableStatus(activeTable, "ACTIVE_ORDER");
  };

  const handleRequestService = (type: ServiceType) => {
    if (isSuspended || isRestaurantSuspended(activeTenantSlug)) {
      alert("This restaurant is currently suspended.");
      return;
    }
    const activeTable = tableNumber || 1;
    const fingerprint = `${activeTable}:${type}`;
    const now = Date.now();
    if (
      lastServiceFingerprintRef.current?.value === fingerprint &&
      now - lastServiceFingerprintRef.current.at < 5000
    ) {
      return;
    }
    lastServiceFingerprintRef.current = { value: fingerprint, at: now };
    const newRequest: ServiceRequest = {
      id: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      table: activeTable,
      type,
      status: "Pending",
      createdAt: Date.now(),
    };

    const nextServices = [newRequest, ...serviceRequests];
    setServiceRequests(nextServices);
    saveStoredServices(nextServices);
    broadcastSyncEvent({ type: "NEW_SERVICE_REQUEST", payload: newRequest });
    syncServiceRequestToSupabase(newRequest, currentRestaurant?.id);

    if (type === "Request Bill") {
      handleUpdateTableStatus(activeTable, "BILL_REQUESTED");
    }
  };

  if (!isClientLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] text-slate-800">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-600">
            Loading {geoConfig.restaurantName || "Heat Box Pizza"}...
          </p>
        </div>
      </div>
    );
  }

  const restaurantName = geoConfig.restaurantName || "Heat Box Pizza";
  const wifiSsid = geoConfig.wifiSsid || "HeatBox_Peshawar_5G";
  const wifiPassword = geoConfig.wifiPassword || "heatbox123";
  const wifiQrString = `WIFI:T:WPA;S:${wifiSsid};P:${wifiPassword};;`;
  const topChampions = [...leaderboard].sort((a, b) => b.score - a.score).slice(0, 3);

  if (isClientLoaded && isSuspended) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-md w-full rounded-3xl border border-rose-500/30 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
            <LockIcon size={28} />
          </div>
          <h2 className="mt-4 text-xl font-black text-white">{currentRestaurant?.name || "Restaurant"} Paused</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            This dining location is currently suspended by the platform administrator. Please speak with restaurant staff or try again later.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-slate-800 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition"
          >
            TableTapp Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fffcf7,_#f8f3eb_40%,_#efe7dc_100%)] px-4 py-5 pb-28 text-slate-900 sm:px-6 sm:py-6 lg:px-10 lg:pb-10">
      <div className="mx-auto max-w-7xl">
        <OfflineBanner />

        {/* Customer Dining Header with Quick Access to Hub, Wi-Fi & Arcade */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-slate-200/90 bg-white px-5 py-4 shadow-sm sm:px-6">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setViewMode("hub")}
              aria-label="Open Café Welcome Hub"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-amber-400 shadow-md hover:bg-slate-800 transition"
            >
              <UtensilsIcon size={22} />
            </button>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {restaurantName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{geoConfig.tagline || "Direct Kitchen Ordering"}</span>
                </span>

              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {viewMode === "table" && (
              <button
                type="button"
                onClick={() => setViewMode("hub")}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                <span>← Café Hub</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsWifiModalOpen(true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-xs font-bold text-sky-900 hover:bg-sky-100 transition"
            >
              <WifiIcon size={14} className="text-sky-700" />
              <span>Free Wi-Fi</span>
            </button>

            <button
              type="button"
              onClick={() => setIsArcadeModalOpen(true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-black text-amber-950 hover:bg-amber-100 transition"
            >
              <GamepadIcon size={14} className="text-amber-700" />
              <span>Play Game</span>
            </button>

            {tableNumber ? (
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-black text-white shadow-sm hover:bg-slate-800 transition"
              >
                <ShieldCheckIcon size={14} className="text-amber-400" />
                <span>Table {tableNumber} Menu</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsScanModalOpen(true)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-black text-slate-950 shadow-sm hover:bg-amber-400 transition"
              >
                <QrCodeIcon size={14} />
                <span>Scan Table QR</span>
              </button>
            )}
          </div>
        </header>

        {viewMode === "hub" || tableNumber === null ? (
          /* Café Welcome Hub (Shown when main link is opened without scanning a specific table) */
          <div className="space-y-8">
            {/* Hero Welcome Card */}
            <section className="relative overflow-hidden rounded-[32px] border border-slate-900 bg-slate-950 p-6 sm:p-10 text-white shadow-2xl">
              <div className="max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/15 px-3.5 py-1 text-xs font-black uppercase tracking-widest text-amber-400">
                  <SparklesIcon size={13} />
                  <span>Welcome to {restaurantName}</span>
                </div>

                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  Your Digital Table Companion
                </h2>

                <p className="text-sm text-slate-300 leading-relaxed">
                  Scan the QR stand on your table to place live kitchen orders and summon your
                  server—or connect to our free guest Wi-Fi and compete on the live café
                  leaderboard while your meal is prepared fresh.
                </p>

                {tableNumber !== null && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      className="inline-flex min-h-12 items-center gap-2.5 rounded-full bg-emerald-500 px-6 py-3 text-sm font-black text-slate-950 shadow-lg hover:bg-emerald-400 transition"
                    >
                      <UtensilsIcon size={16} />
                      <span>Return to Table {tableNumber} Ordering Menu →</span>
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* 3 Primary Interactive Experience Cards */}
            <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Option 1: Scan QR Code to Sit & Order */}
              <div className="flex flex-col justify-between rounded-[28px] border-2 border-amber-400 bg-white p-6 shadow-md transition hover:shadow-xl">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-13 w-13 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-md">
                      <QrCodeIcon size={26} />
                    </span>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-900">
                      Step 1 • Dine-In
                    </span>
                  </div>

                  <h3 className="font-display mt-5 text-2xl font-bold text-slate-900">
                    Scan Table QR Code
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    Scan the QR stand at your table to unlock your table&apos;s live menu,
                    customize dishes, and send orders directly to the kitchen.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (tableNumber !== null && !isStaff) {
                      setViewMode("table");
                    } else {
                      setIsScanModalOpen(true);
                    }
                  }}
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 py-3.5 text-xs font-black text-white shadow-md hover:bg-slate-800 active:scale-95 transition"
                >
                  <QrCodeIcon size={16} className="text-amber-400" />
                  <span>{tableNumber ? `Seated at Table #${tableNumber} (Locked)` : "Scan QR & Sit at Table"}</span>
                </button>
              </div>

              {/* Option 2: Free Guest Wi-Fi */}
              <div className="flex flex-col justify-between rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-400 hover:shadow-lg">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-13 w-13 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-700">
                      <WifiIcon size={26} />
                    </span>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">
                      High-Speed Lounge
                    </span>
                  </div>

                  <h3 className="font-display mt-5 text-2xl font-bold text-slate-900">
                    Free Café Wi-Fi
                  </h3>

                </div>

                <button
                  type="button"
                  onClick={() => setIsWifiModalOpen(true)}
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-sky-600 py-3.5 text-xs font-black text-white shadow-md hover:bg-sky-500 active:scale-95 transition"
                >
                  <WifiIcon size={16} />
                  <span>View Wi-Fi Name &amp; Code</span>
                </button>
              </div>

              {/* Option 3: Play Game & Live Café Leaderboard */}
              <div className="flex flex-col justify-between rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-400 hover:shadow-lg">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-13 w-13 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700">
                      <GamepadIcon size={26} />
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                      Multiplayer Leaderboard
                    </span>
                  </div>

                  <h3 className="font-display mt-5 text-2xl font-bold text-slate-900">
                    Play Game &amp; Compete
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    Play Reflex Rush or challenge our AI Chef Bot while you wait! Beat
                    the restaurant&apos;s high score to put your name at #1.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsArcadeModalOpen(true)}
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-500 py-3.5 text-xs font-black text-slate-950 shadow-md hover:bg-emerald-400 active:scale-95 transition"
                >
                  <TrophyIcon size={16} />
                  <span>Play Arcade &amp; View Leaderboard</span>
                </button>
              </div>
            </section>

            {/* Live Restaurant Hall of Fame Preview Banner */}
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                    <TrophyIcon size={22} />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-slate-900">
                      Today&apos;s {restaurantName} High-Score Champions
                    </h3>
                    <p className="text-xs text-slate-600">
                      {geoConfig.arcadePrizeText ||
                        "Compete from your table while waiting for your meal!"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsArcadeModalOpen(true)}
                  className="min-h-10 self-start sm:self-auto rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                >
                  Challenge Top Score →
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {topChampions.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-xs text-slate-500">
                    <p className="font-bold text-slate-700">No champions on the leaderboard yet!</p>
                    <p className="mt-1">Play Reflex Rush or Beat the Chef to be the first name on the board.</p>
                  </div>
                ) : (
                  topChampions.map((champ, idx) => (
                  <div
                    key={champ.id}
                    className={`flex items-center justify-between rounded-2xl border p-4 ${
                      idx === 0
                        ? "border-amber-300 bg-amber-50/70"
                        : "border-slate-200 bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`tabular-nums flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                          idx === 0
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-900 text-white"
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">
                          {champ.playerName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {champ.tableNumber ? `Table ${champ.tableNumber}` : "Café Lounge"} •{" "}
                          {champ.game === "reflex" ? "Reflex Rush" : "Chef Bot Streak"}
                        </p>
                      </div>
                    </div>

                    <span className="tabular-nums shrink-0 rounded-xl bg-white border border-slate-200 px-3 py-1 text-xs font-black text-amber-800">
                      {champ.score} {champ.game === "reflex" ? "pts" : "wins"}
                    </span>
                  </div>
                ))
                )}
              </div>
            </section>

            <footer className="border-t border-slate-200/80 pt-6 text-center">
              <p className="text-xs font-semibold text-slate-600">
                {restaurantName}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
                <span>Made by <strong className="font-semibold text-slate-800">Maaz Khan</strong></span>
                <span aria-hidden="true">•</span>
                <a
                  href="https://instagram.com/maghaz._.khan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-pink-600 transition"
                  title="Contact on Instagram for suggestions, queries or issues"
                >
                  <InstagramIcon size={14} className="text-pink-600" />
                  <span>@maghaz._.khan</span>
                </a>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">
                For any suggestions, queries or issues
              </p>
              <div className="mt-3 flex items-center justify-center">
                <Link
                  href={restaurantSlug ? `/r/${restaurantSlug}/staff` : "/staff"}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <LockIcon size={12} />
                  <span>Staff &amp; Kitchen Portal</span>
                </Link>
              </div>
            </footer>
          </div>
        ) : (
          <GuestView
            key={tableNumber}
            tableNumber={tableNumber}
            onTableChange={handleSeatAtTable}
            isStaff={isStaff}
            menu={menu}
            tableOrders={orders}
            transferNotice={transferNotice}
            onDismissTransferNotice={() => setTransferNotice(null)}
            onPlaceOrder={handlePlaceOrder}
            onRequestService={handleRequestService}
            geoConfig={geoConfig}
          />
        )}
      </div>

      {/* Modal 1: Scan Table QR Code / Select Table */}
      {isScanModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="scan-qr-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsScanModalOpen(false);
              setCameraActive(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950">
                  <QrCodeIcon size={20} />
                </span>
                <div>
                  <h3 id="scan-qr-modal-title" className="font-display text-lg font-bold text-slate-900">
                    Sit at Your Table
                  </h3>
                  <p className="text-xs text-slate-500">
                    Scan your table stand QR or select your table number
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close scanner modal"
                onClick={() => {
                  setIsScanModalOpen(false);
                  setCameraActive(false);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <XIcon size={18} />
              </button>
            </div>

            {/* Live Camera Scanner Area */}
            <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-slate-950 p-4 text-center text-white">
              {cameraActive ? (
                <div className="space-y-3">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="mx-auto h-52 w-full rounded-xl object-cover"
                  />
                  <p className="text-xs text-amber-300 font-semibold">
                    Point your camera at the Table QR Stand...
                  </p>
                </div>
              ) : (
                <div className="py-5 space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                    <QrCodeIcon size={26} />
                  </div>
                  <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                    Use your phone camera to scan the physical QR stand on your table:
                  </p>
                  <button
                    type="button"
                    onClick={() => setCameraActive(true)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition"
                  >
                    <QrCodeIcon size={15} />
                    <span>Open Camera QR Scanner</span>
                  </button>
                </div>
              )}
              {cameraError && (
                <p className="mt-2 text-xs font-semibold text-amber-300">{cameraError}</p>
              )}
            </div>

            {/* Direct Table Selector */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <label htmlFor="manual-table-select" className="block text-xs font-black uppercase tracking-wider text-slate-700">
                Or Select Your Table Number Directly:
              </label>
              <div className="flex gap-2">
                <select
                  id="manual-table-select"
                  value={selectedCheckInTable}
                  onChange={(e) => setSelectedCheckInTable(Number(e.target.value))}
                  className="min-h-12 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-900"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((num) => (
                    <option key={num} value={num}>
                      Table {num}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleSeatAtTable(selectedCheckInTable)}
                  className="min-h-12 rounded-xl bg-slate-900 px-5 text-xs font-black text-white hover:bg-slate-800 transition"
                >
                  Open Menu →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Free Café Wi-Fi Passcard & Auto-Connect QR */}
      {isWifiModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="wifi-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsWifiModalOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl space-y-5 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-left">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <WifiIcon size={20} />
                </span>
                <div>
                  <h3 id="wifi-modal-title" className="font-display text-lg font-bold text-slate-900">
                    Free Guest Wi-Fi
                  </h3>
                  <p className="text-xs text-slate-500">{restaurantName} High-Speed Lounge</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close Wi-Fi modal"
                onClick={() => setIsWifiModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 space-y-3 text-left">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
                  Wi-Fi Network Name (SSID)
                </span>
                <p className="font-mono text-base font-black text-slate-900 mt-0.5">
                  {wifiSsid}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-sky-200/70 pt-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
                    Wi-Fi Password
                  </span>
                  <p className="font-mono text-base font-black text-slate-900 mt-0.5">
                    {wifiPassword}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyWifiPassword}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                >
                  {wifiCopied ? <CheckCircleIcon size={14} /> : <CopyIcon size={14} />}
                  <span>{wifiCopied ? "Copied!" : "Copy Code"}</span>
                </button>
              </div>
            </div>

            {/* Scannable Wi-Fi Join QR Code */}
            <div className="space-y-2">
              <div className="mx-auto inline-block rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-md">
                <QRCodeView value={wifiQrString} size={160} />
              </div>
              <p className="text-xs text-slate-500">
                Or point a friend&apos;s camera at this QR code to join Wi-Fi automatically
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsWifiModalOpen(false)}
              className="min-h-11 w-full rounded-full bg-slate-900 py-2.5 text-xs font-black text-white hover:bg-slate-800 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Modal 3: Café Arcade & Live Restaurant Leaderboard */}
      <CafeArcadeModal
        isOpen={isArcadeModalOpen}
        onClose={() => setIsArcadeModalOpen(false)}
        restaurantName={restaurantName}
        prizeText={geoConfig.arcadePrizeText}
        tableNumber={tableNumber}
        leaderboard={leaderboard}
        onSubmitScore={handleSubmitArcadeScore}
      />
    </main>
  );
}
