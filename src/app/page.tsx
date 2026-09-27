"use client";

import { useEffect, useState } from "react";
import { MenuItem, OrderCard, OrderItem, OrderStatus, ServiceRequest, ServiceType, UserRole } from "@/types";
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
import { clearAuthSession, getAuthState, verifyPin } from "@/lib/auth";
import { getActiveGuestSession, getTableByToken, getTokenForTable, setActiveGuestSession } from "@/lib/tables";
import {
  fetchOrdersFromSupabase,
  fetchServicesFromSupabase,
  isSupabaseConfigured,
  subscribeToSupabaseRealtime,
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
        setTableNumber(Number(urlTable));
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

    // Hydrate latest state from Supabase Cloud if configured
    if (isSupabaseConfigured()) {
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
    }

    // Listen for broadcast sync from other browser tabs / devices
    const unsubscribe = subscribeToSyncEvents((event) => {
      switch (event.type) {
        case "NEW_ORDER": {
          setOrders((prev) => [event.payload, ...prev]);
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
        case "NEW_SERVICE_REQUEST": {
          setServiceRequests((prev) => [event.payload, ...prev]);
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
      unsubscribe();
      unsubscribeSupabase();
    };
  }, []);

  // Sync state changes to storage whenever they change locally
  const handleUpdateMenu = (newMenu: MenuItem[]) => {
    setMenu(newMenu);
    saveStoredMenu(newMenu);
    broadcastSyncEvent({ type: "MENU_UPDATED", payload: newMenu });
  };

  const handlePlaceOrder = (items: OrderItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const serviceFee = subtotal > 0 ? 1.5 : 0;
    const total = subtotal + serviceFee;

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
    };

    const nextOrders = [newOrder, ...orders];
    setOrders(nextOrders);
    saveStoredOrders(nextOrders);
    broadcastSyncEvent({ type: "NEW_ORDER", payload: newOrder });
    syncOrderToSupabase(newOrder);
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
      <OfflineBanner />

      <div className="mx-auto max-w-7xl">
        {/* Global Navigation Bar */}
        <header className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white/80 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-lg font-black text-slate-950 shadow-md">
              TT
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-700">
                TableTapp Platform
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <h1 className="text-xl font-black text-slate-900 sm:text-2xl">
                  Sunshine Bistro
                </h1>
                <span
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    isSupabaseConfigured()
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isSupabaseConfigured() ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    }`}
                  />
                  {isSupabaseConfigured() ? "Supabase Cloud Live" : "Local Sync Active"}
                </span>
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
            />
          )}

          {activeRole === "kitchen" && (
            <KitchenView
              orders={orders}
              serviceRequests={serviceRequests}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onResolveService={handleResolveService}
              onTransferOrder={handleTransferOrder}
              onLockSession={handleLockSession}
            />
          )}

          {activeRole === "owner" && (
            <OwnerView
              menu={menu}
              orders={orders}
              services={serviceRequests}
              onUpdateMenu={handleUpdateMenu}
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
