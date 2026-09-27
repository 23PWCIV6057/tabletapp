"use client";

import { useEffect, useState } from "react";
import { OrderCard, OrderStatus, ServiceRequest } from "@/types";
import { playAlertChime, playOrderChime, unlockAudio } from "@/lib/sound";

interface KitchenViewProps {
  orders: OrderCard[];
  serviceRequests: ServiceRequest[];
  onUpdateOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
  onResolveService: (requestId: string) => void;
  onTransferOrder: (orderId: string, newTable: number) => void;
  onLockSession: () => void;
}

export default function KitchenView({
  orders,
  serviceRequests,
  onUpdateOrderStatus,
  onResolveService,
  onTransferOrder,
  onLockSession,
}: KitchenViewProps) {
  const [filterTab, setFilterTab] = useState<"active" | "history">("active");
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [transferringOrderId, setTransferringOrderId] = useState<string | null>(null);

  // Update timer every 10 seconds to keep elapsed minutes fresh
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const activeOrders = orders.filter((o) => o.status !== "Served" && o.status !== "Archived");
  const historyOrders = orders.filter((o) => o.status === "Served" || o.status === "Archived");
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
              Station Tablet • Real-time Order Expediting
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
              <p className="text-xs text-slate-400">
                New incoming orders will appear here automatically with sound.
              </p>
            </div>
          )}

          {/* Ticket Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {(filterTab === "active" ? activeOrders : historyOrders).map((order) => {
              const elapsedMins = getElapsedMinutes(order.createdAt);
              const isUrgent = elapsedMins >= 10 && order.status !== "Served";
              const isWarning = elapsedMins >= 5 && elapsedMins < 10 && order.status !== "Served";

              return (
                <div
                  key={order.id}
                  className={`flex flex-col justify-between rounded-[26px] border bg-white p-5 shadow-sm transition ${
                    isUrgent
                      ? "border-rose-400 ring-2 ring-rose-400/20 shadow-rose-100"
                      : isWarning
                        ? "border-amber-300 ring-1 ring-amber-300/30"
                        : "border-slate-200"
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-xl bg-slate-900 px-2.5 py-1 text-xs font-black text-white">
                            Table {order.table}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setTransferringOrderId(
                                transferringOrderId === order.id ? null : order.id
                              )
                            }
                            className="rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-200 transition"
                            title="Transfer order to another table"
                          >
                            ⇄ Move
                          </button>
                        </div>
                        <span className="text-xs font-bold text-slate-400">
                          #{order.orderNumber}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
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
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                            order.status === "New"
                              ? "bg-rose-100 text-rose-700 font-black"
                              : order.status === "Preparing"
                                ? "bg-amber-100 text-amber-700 font-black"
                                : order.status === "Ready"
                                  ? "bg-blue-100 text-blue-700 font-black"
                                  : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>

                    {/* Transfer Dropdown Modal/Strip */}
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
                          </div>
                          {item.selectedModifiers.length > 0 && (
                            <div className="mt-0.5 text-xs font-medium text-slate-600 pl-5">
                              {item.selectedModifiers.map((m) => m.optionName).join(" • ")}
                            </div>
                          )}
                          {item.specialInstructions && (
                            <div className="mt-1 rounded-lg bg-amber-50 p-1.5 text-xs font-bold text-amber-800 pl-3 border-l-2 border-amber-500">
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
                      <span className="block text-center text-xs font-bold text-emerald-600">
                        Completed at {new Date(order.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Table Service Calls */}
        <aside className="h-fit rounded-[32px] border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-black tracking-tight">Table Service Calls</h3>
              <p className="text-xs text-slate-400">Guest requests queue</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                pendingRequests.length > 0
                  ? "bg-rose-500/20 text-rose-400 animate-pulse"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {pendingRequests.length} Pending
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {pendingRequests.length === 0 ? (
              <div className="py-10 text-center text-slate-500">
                <span className="text-3xl">🛎️</span>
                <p className="mt-2 text-xs font-semibold">No pending table calls</p>
                <p className="text-[11px] text-slate-600">
                  When guests tap help on their phone, alerts pop up here.
                </p>
              </div>
            ) : (
              pendingRequests.map((req) => {
                const elapsed = getElapsedMinutes(req.createdAt);
                return (
                  <div
                    key={req.id}
                    className="rounded-2xl border border-amber-500/30 bg-slate-900/90 p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500 text-xs font-black text-slate-950">
                          T{req.table}
                        </span>
                        <h4 className="text-sm font-bold text-white">{req.type}</h4>
                      </div>
                      <span className="text-xs font-bold text-amber-400">
                        {elapsed} min ago
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onResolveService(req.id)}
                      className="mt-3 w-full rounded-xl bg-emerald-500/20 border border-emerald-500/30 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/30 active:scale-95"
                    >
                      Mark Resolved / Done ✓
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
