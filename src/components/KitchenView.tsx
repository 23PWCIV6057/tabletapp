"use client";

import { useEffect, useState } from "react";
import { OrderCard, OrderStatus, ServiceRequest, TableOccupancyStatus, TableSession } from "@/types";
import { playAlertChime, playOrderChime, unlockAudio } from "@/lib/sound";

interface KitchenViewProps {
  orders: OrderCard[];
  serviceRequests: ServiceRequest[];
  tableSessions?: Record<number, TableSession>;
  onUpdateOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
  onResolveService: (requestId: string) => void;
  onTransferOrder: (orderId: string, newTable: number) => void;
  onUpdateTableStatus?: (tableNumber: number, status: TableOccupancyStatus) => void;
  onClearTable?: (tableNumber: number) => void;
  onRejectOrder?: (orderId: string, reason: string) => void;
  onLockSession: () => void;
}

export default function KitchenView({
  orders,
  serviceRequests,
  tableSessions = {},
  onUpdateOrderStatus,
  onResolveService,
  onTransferOrder,
  onUpdateTableStatus,
  onClearTable,
  onRejectOrder,
  onLockSession,
}: KitchenViewProps) {
  const [filterTab, setFilterTab] = useState<"active" | "history">("active");
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [transferringOrderId, setTransferringOrderId] = useState<string | null>(null);
  const [selectedFloorTable, setSelectedFloorTable] = useState<number | null>(null);

  // Update timer every 10 seconds to keep elapsed minutes fresh
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const activeOrders = orders.filter((o) => o.status !== "Served" && o.status !== "Archived" && o.status !== "Rejected");
  const historyOrders = orders.filter((o) => o.status === "Served" || o.status === "Archived" || o.status === "Rejected");
  const pendingRequests = serviceRequests.filter((r) => r.status === "Pending");

  const getElapsedMinutes = (timestamp: number) => {
    return Math.max(0, Math.floor((currentTime - timestamp) / (60 * 1000)));
  };

  const handleTestSound = () => {
    unlockAudio();
    playOrderChime();
  };

  return (
    <div className="space-y-6">
      {/* KDS Staff Header */}
      <header className="flex flex-col gap-4 rounded-[28px] border border-slate-800 bg-slate-950 p-5 text-white shadow-xl md:flex-row md:items-center md:justify-between sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-2xl font-black text-slate-950 shadow-md">
            🍳
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                Kitchen Display System (KDS)
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Station Tablet • Real-time Order Expediting & Floor Management
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Audio Chime Controls */}
          <button
            type="button"
            onClick={() => {
              unlockAudio();
              setAudioEnabled(!audioEnabled);
            }}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
              audioEnabled
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            <span>{audioEnabled ? "🔔 Audio: ON" : "🔕 Audio: OFF"}</span>
          </button>

          <button
            type="button"
            onClick={handleTestSound}
            className="rounded-full bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
          >
            Test Chime
          </button>

          {/* Session Lock Button */}
          <button
            type="button"
            onClick={onLockSession}
            className="rounded-full bg-rose-500/10 border border-rose-500/30 px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20"
          >
            🔒 Lock KDS
          </button>
        </div>
      </header>

      {/* Table Floor Lifecycle Strip (Tables 1 - 16) */}
      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-slate-900">🍽️ Dining Floor Table Lifecycle</span>
            <span className="text-xs font-bold text-slate-400">(16 Tables)</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-2 rounded-full bg-slate-300" /> Vacant
            </span>
            <span className="flex items-center gap-1.5 text-blue-600">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> Seated
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Cooking
            </span>
            <span className="flex items-center gap-1.5 text-purple-600">
              <span className="h-2 w-2 rounded-full bg-purple-500" /> Bill Due
            </span>
          </div>
        </div>

        {/* 16 Table Buttons */}
        <div className="mt-3.5 grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-16">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((num) => {
            const session = tableSessions[num];
            const hasActiveOrders = orders.some((o) => o.table === num && (o.status === "New" || o.status === "Preparing" || o.status === "Ready"));
            const hasBillRequest = serviceRequests.some((r) => r.table === num && r.status === "Pending" && r.type === "Request Bill");

            const derivedStatus: TableOccupancyStatus = hasBillRequest
              ? "BILL_REQUESTED"
              : hasActiveOrders
                ? "ACTIVE_ORDER"
                : session?.status || "VACANT";

            const isSelected = selectedFloorTable === num;

            return (
              <button
                key={num}
                type="button"
                onClick={() => setSelectedFloorTable(isSelected ? null : num)}
                className={`relative flex flex-col items-center justify-center rounded-xl border p-2 transition text-center ${
                  derivedStatus === "BILL_REQUESTED"
                    ? "border-purple-300 bg-purple-50 text-purple-950 font-black ring-2 ring-purple-400"
                    : derivedStatus === "ACTIVE_ORDER"
                      ? "border-amber-300 bg-amber-50 text-amber-950 font-black ring-2 ring-amber-400"
                      : derivedStatus === "SEATED"
                        ? "border-blue-300 bg-blue-50 text-blue-950 font-bold"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                } ${isSelected ? "scale-105 shadow-md" : ""}`}
              >
                <span className="text-xs font-black">T{num}</span>
                <span
                  className={`mt-1 h-1.5 w-1.5 rounded-full ${
                    derivedStatus === "BILL_REQUESTED"
                      ? "bg-purple-600 animate-pulse"
                      : derivedStatus === "ACTIVE_ORDER"
                        ? "bg-amber-500 animate-ping"
                        : derivedStatus === "SEATED"
                          ? "bg-blue-500"
                          : "bg-slate-300"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Selected Table Quick Actions Bar */}
        {selectedFloorTable !== null && (
          <div className="mt-4 flex flex-wrap items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900">Table {selectedFloorTable} Selected:</span>
              <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold uppercase text-slate-700">
                Current: {tableSessions[selectedFloorTable]?.status || "VACANT"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onUpdateTableStatus && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateTableStatus(selectedFloorTable, "SEATED");
                    setSelectedFloorTable(null);
                  }}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 font-bold text-white hover:bg-blue-500 transition"
                >
                  Seat Table
                </button>
              )}

              {onClearTable && (
                <button
                  type="button"
                  onClick={() => {
                    onClearTable(selectedFloorTable);
                    setSelectedFloorTable(null);
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-500 transition"
                >
                  Clear Table / Mark Vacant
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedFloorTable(null)}
                className="rounded-lg bg-slate-200 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Main Grid: Active Orders + Service Alert Side Rail */}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        {/* Left Column: Tickets */}
        <div className="space-y-4">
          {/* Sub Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFilterTab("active")}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  filterTab === "active"
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                Active Kitchen Queue ({activeOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("history")}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  filterTab === "history"
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                Completed & Served ({historyOrders.length})
              </button>
            </div>
          </div>

          {filterTab === "active" && activeOrders.length === 0 && (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="text-3xl">👨‍🍳</p>
              <p className="mt-2 text-base font-bold text-slate-800">All caught up!</p>
              <p className="text-xs text-slate-500">
                No orders waiting in the active queue.
              </p>
            </div>
          )}

          {/* Ticket Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {(filterTab === "active" ? activeOrders : historyOrders).map((order) => {
              const elapsedMins = getElapsedMinutes(order.createdAt);
              const isUrgent = elapsedMins >= 10;
              const isWarning = elapsedMins >= 5 && elapsedMins < 10;
              const isVacantWarning = order.tableWasVacant;

              return (
                <div
                  key={order.id}
                  className={`flex flex-col justify-between rounded-[26px] border bg-white p-5 shadow-sm transition hover:shadow-md ${
                    isVacantWarning
                      ? "border-rose-400 ring-2 ring-rose-400/40"
                      : isUrgent
                        ? "border-rose-300 ring-2 ring-rose-500/20"
                        : isWarning
                          ? "border-amber-300"
                          : "border-slate-200"
                  }`}
                >
                  <div>
                    {/* Vacant Table Security Alert */}
                    {isVacantWarning && order.status === "New" && (
                      <div className="mb-3 rounded-xl border border-rose-300 bg-rose-50 p-2.5 text-xs text-rose-950">
                        <div className="flex items-center gap-1.5 font-black text-rose-700">
                          <span>⚠️</span>
                          <span>Table was VACANT when ordered!</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-rose-800">
                          Verify physical guests are seated at Table {order.table} before firing ticket.
                        </p>
                        <div className="mt-2 flex gap-2">
                          {onUpdateTableStatus && (
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateTableStatus(order.table, "SEATED");
                                onUpdateOrderStatus(order.id, "Preparing");
                              }}
                              className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-700"
                            >
                              Verify & Seat Table ✓
                            </button>
                          )}
                          {onRejectOrder && (
                            <button
                              type="button"
                              onClick={() => onRejectOrder(order.id, "Table was vacant / prank order")}
                              className="rounded-lg bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-300"
                            >
                              Reject Ticket ✕
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Ticket Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-white">
                          T{order.table}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-black text-slate-900">
                              #{order.orderNumber}
                            </h4>
                            {/* Staff Table Transfer Trigger */}
                            <button
                              type="button"
                              onClick={() =>
                                setTransferringOrderId(
                                  transferringOrderId === order.id ? null : order.id
                                )
                              }
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-amber-100 hover:text-amber-800"
                              title="Move ticket to another table"
                            >
                              ⇄ Move
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(order.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isUrgent
                                ? "bg-rose-100 text-rose-800 animate-pulse"
                                : isWarning
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            ⏱ {elapsedMins}m
                          </span>

                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              order.status === "New"
                                ? "bg-rose-100 text-rose-700 font-black"
                                : order.status === "Preparing"
                                  ? "bg-amber-100 text-amber-700 font-black"
                                  : order.status === "Ready"
                                    ? "bg-blue-100 text-blue-700 font-black"
                                    : order.status === "Rejected"
                                      ? "bg-rose-100 text-rose-800 font-black"
                                      : "bg-emerald-100 text-emerald-700 font-black"
                            }`}
                          >
                            {order.status === "Archived" ? "Fulfilled & Cleared ✅" : order.status === "Served" ? "Served ✅" : order.status}
                          </span>
                        </div>

                        {/* Location Verification Tag */}
                        {order.geoVerified !== undefined && (
                          <span
                            className={`text-[9px] font-bold ${
                              order.geoVerified
                                ? "text-emerald-600"
                                : "text-rose-600 font-black animate-pulse"
                            }`}
                          >
                            {order.geoVerified
                              ? `📍 On-Premises (${order.distanceMeters ?? 15}m)`
                              : `⚠️ Remote/Unverified (${order.distanceMeters ?? "?"}m)`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Transfer Dropdown Strip */}
                    {transferringOrderId === order.id && (
                      <div className="my-2.5 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs">
                        <p className="font-bold text-amber-900 mb-1.5">
                          Reassign Ticket #{order.orderNumber} to:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
                            .filter((num) => num !== order.table)
                            .map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => {
                                  onTransferOrder(order.id, num);
                                  setTransferringOrderId(null);
                                }}
                                className="rounded-md bg-white border border-amber-300 px-2 py-1 font-black text-amber-900 hover:bg-amber-500 hover:text-white transition"
                              >
                                T{num}
                              </button>
                            ))}
                          <button
                            type="button"
                            onClick={() => setTransferringOrderId(null)}
                            className="rounded-md bg-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-300"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Order Line Items */}
                    <div className="mt-4 space-y-2.5">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="border-b border-slate-50 pb-2 text-sm last:border-0 last:pb-0">
                          <div className="flex items-start justify-between">
                            <div className="font-extrabold text-slate-900">
                              <span className="text-amber-600 mr-1.5">{item.quantity}×</span>
                              {item.name}
                            </div>
                            <span className="text-xs font-semibold text-slate-400">
                              ${item.totalPrice.toFixed(2)}
                            </span>
                          </div>

                          {/* Selected Custom Modifiers */}
                          {item.selectedModifiers.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1 pl-5">
                              {item.selectedModifiers.map((mod, mi) => (
                                <span
                                  key={mi}
                                  className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700"
                                >
                                  +{mod.optionName}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Special Chef Instructions */}
                          {item.specialInstructions && (
                            <div className="mt-1 rounded-md bg-amber-50/80 px-2 py-1 text-[11px] font-semibold text-amber-900">
                              ⚠️ Note: {item.specialInstructions}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Bar (Bumping tickets) */}
                  <div className="mt-5 border-t border-slate-100 pt-3">
                    {order.status === "New" && (
                      <button
                        type="button"
                        onClick={() => onUpdateOrderStatus(order.id, "Preparing")}
                        className="w-full rounded-2xl bg-amber-500 py-2.5 text-xs font-black text-slate-950 shadow-sm transition hover:bg-amber-400 active:scale-95"
                      >
                        Start Preparing 👨‍🍳
                      </button>
                    )}

                    {order.status === "Preparing" && (
                      <button
                        type="button"
                        onClick={() => onUpdateOrderStatus(order.id, "Ready")}
                        className="w-full rounded-2xl bg-blue-600 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-500 active:scale-95"
                      >
                        Mark Ready to Serve 🛎️
                      </button>
                    )}

                    {order.status === "Ready" && (
                      <button
                        type="button"
                        onClick={() => onUpdateOrderStatus(order.id, "Served")}
                        className="w-full rounded-2xl bg-emerald-600 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-500 active:scale-95"
                      >
                        Complete / Handed Off ✅
                      </button>
                    )}

                    {order.status === "Served" && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-emerald-600">
                          Served at {new Date(order.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {onClearTable && (
                          <button
                            type="button"
                            onClick={() => onClearTable(order.table)}
                            className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-200"
                          >
                            Clear Table {order.table}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Service Calls Side Rail */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>Service Alerts</span>
              {pendingRequests.length > 0 && (
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
                  {pendingRequests.length} Pending
                </span>
              )}
            </h3>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">
              <p className="text-2xl">✨</p>
              <p className="mt-1 text-xs font-bold text-slate-600">All tables happy</p>
              <p className="text-[10px]">No pending waiter or refill requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-2xl border-2 border-amber-400 bg-amber-50/70 p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white">
                      T{req.table}
                    </span>
                    <div>
                      <p className="text-sm font-black text-slate-900">{req.type}</p>
                      <p className="text-[10px] text-slate-500">
                        Requested {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onResolveService(req.id)}
                    className="rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition"
                  >
                    Resolve ✓
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
