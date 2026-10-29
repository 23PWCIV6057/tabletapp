"use client";

import { useEffect, useState } from "react";
import {
  GeoFenceConfig,
  OrderCard,
  OrderStatus,
  ServiceRequest,
  TableOccupancyStatus,
  TableSession,
} from "@/types";
import {
  DEFAULT_GEO_CONFIG,
  formatPrice,
} from "@/lib/geo";
import {
  connectThermalPrinter,
  disconnectThermalPrinter,
  isThermalPrinterConnected,
  isWebSerialSupported,
  printOrderViaEscPos,
} from "@/lib/printer";
import {
  isAudioMuted,
  playOrderChime,
  setAudioMuted,
  unlockAudio,
} from "@/lib/sound";
import {
  AlertTriangleIcon,
  ArrowLeftRightIcon,
  BellIcon,
  BellOffIcon,
  CheckCircleIcon,
  ChefHatIcon,
  ClockIcon,
  LockIcon,
  MapPinIcon,
  PrinterIcon,
  SparklesIcon,
  UtensilsIcon,
  XIcon,
} from "./Icons";

interface KitchenViewProps {
  orders: OrderCard[];
  serviceRequests: ServiceRequest[];
  tableSessions?: Record<number, TableSession>;
  geoConfig?: GeoFenceConfig;
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
  geoConfig,
  onUpdateOrderStatus,
  onResolveService,
  onTransferOrder,
  onUpdateTableStatus,
  onClearTable,
  onRejectOrder,
  onLockSession,
}: KitchenViewProps) {
  const currency = geoConfig?.currency || "PKR";
  const dailyCode = geoConfig?.dailyDineInCode || "42";
  const [filterTab, setFilterTab] = useState<"active" | "history">("active");
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [audioEnabled, setAudioEnabled] = useState(() => !isAudioMuted());
  const [transferringOrderId, setTransferringOrderId] = useState<string | null>(null);
  const [selectedFloorTable, setSelectedFloorTable] = useState<number | null>(null);

  // Thermal Receipt Printer States
  const [printerConnected, setPrinterConnected] = useState(() => isThermalPrinterConnected());
  const [autoPrintOnAccept, setAutoPrintOnAccept] = useState(true);
  const [printingSlip, setPrintingSlip] = useState<{
    order: OrderCard;
    mode: "kot" | "bill";
  } | null>(null);
  const [printerToast, setPrinterToast] = useState<string | null>(null);

  const handleConnectPrinter = async () => {
    if (printerConnected) {
      await disconnectThermalPrinter();
      setPrinterConnected(false);
      setPrinterToast("Direct USB Thermal Printer disconnected. Using standard 80mm print dialog.");
      setTimeout(() => setPrinterToast(null), 3500);
      return;
    }

    if (!isWebSerialSupported()) {
      setPrinterToast(
        "Direct USB Serial requires Chrome/Edge on Desktop. Standard 1-click 80mm receipt printing is active!"
      );
      setTimeout(() => setPrinterToast(null), 4000);
      return;
    }

    const ok = await connectThermalPrinter();
    setPrinterConnected(ok);
    if (ok) {
      setPrinterToast("Thermal Receipt Printer connected! 1-click instant ESC/POS printing enabled.");
    } else {
      setPrinterToast("No USB serial printer selected. Standard 80mm receipt printing remains active.");
    }
    setTimeout(() => setPrinterToast(null), 4000);
  };

  const handlePrintTicket = async (order: OrderCard, mode: "kot" | "bill") => {
    const cfg = geoConfig || DEFAULT_GEO_CONFIG;
    if (isThermalPrinterConnected()) {
      const sent = await printOrderViaEscPos(order, cfg, mode);
      if (sent) {
        setPrinterToast(
          `Printed ${mode === "kot" ? "Kitchen Ticket (KOT)" : "Customer Bill"} for Table ${order.table} (#${order.orderNumber})`
        );
        setTimeout(() => setPrinterToast(null), 3000);
        return;
      }
    }

    // Universal 80mm Thermal Slip Fallback via OS Print
    setPrintingSlip({ order, mode });
    setTimeout(() => {
      window.print();
    }, 80);
  };

  // Update timer every 10 seconds to keep elapsed minutes fresh
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const activeOrders = orders.filter(
    (o) => o.status !== "Served" && o.status !== "Archived" && o.status !== "Rejected"
  );
  const historyOrders = orders.filter(
    (o) => o.status === "Served" || o.status === "Archived" || o.status === "Rejected"
  );
  const pendingRequests = serviceRequests.filter((r) => r.status === "Pending");

  const getElapsedMinutes = (timestamp: number) => {
    return Math.max(0, Math.floor((currentTime - timestamp) / (60 * 1000)));
  };

  const handleToggleAudio = () => {
    unlockAudio();
    const nextEnabled = !audioEnabled;
    setAudioEnabled(nextEnabled);
    setAudioMuted(!nextEnabled);
  };

  const handleTestSound = () => {
    unlockAudio();
    playOrderChime(true);
  };

  return (
    <div className="space-y-6">
      {/* KDS Staff Header */}
      <header className="flex flex-col gap-4 rounded-[28px] border border-slate-800 bg-slate-950 p-5 text-white shadow-xl md:flex-row md:items-center md:justify-between sm:p-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-md">
            <ChefHatIcon size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                Kitchen Display System (KDS)
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Station Tablet • Real-time Order Expediting & Floor Management
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Today's Dine-In Code Badge for Staff Reference */}
          <span className="tabular-nums inline-flex min-h-11 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-3.5 py-2 text-xs font-black text-amber-300">
            <span>Dine-In Code:</span>
            <span className="rounded bg-amber-500 px-1.5 py-0.5 text-slate-950">{dailyCode}</span>
          </span>

          {/* Direct Thermal Receipt Printer Connection */}
          <button
            type="button"
            onClick={handleConnectPrinter}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold transition ${
              printerConnected
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
            }`}
            title="Pair USB/Serial 80mm ESC/POS Thermal Receipt Printer"
          >
            <PrinterIcon size={15} />
            <span>{printerConnected ? "Printer Ready (USB)" : "Connect Printer"}</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoPrintOnAccept((v) => !v)}
            aria-pressed={autoPrintOnAccept}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition ${
              autoPrintOnAccept
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
            title="Automatically print Kitchen Order Ticket when clicking Start Preparing"
          >
            <span>Auto-KOT: {autoPrintOnAccept ? "ON" : "OFF"}</span>
          </button>

          {/* Audio Chime Controls */}
          <button
            type="button"
            onClick={handleToggleAudio}
            aria-pressed={audioEnabled}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
              audioEnabled
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            {audioEnabled ? <BellIcon size={15} /> : <BellOffIcon size={15} />}
            <span>{audioEnabled ? "Audio: ON" : "Audio: OFF"}</span>
          </button>

          <button
            type="button"
            onClick={handleTestSound}
            className="min-h-11 rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            Test Chime
          </button>

          {/* Session Lock Button */}
          <button
            type="button"
            onClick={onLockSession}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition"
          >
            <LockIcon size={14} />
            <span>Lock KDS</span>
          </button>
        </div>
      </header>

      {printerToast && (
        <div
          role="status"
          className="flex items-center justify-between rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-950 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <PrinterIcon size={16} className="text-emerald-700" />
            <span>{printerToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setPrinterToast(null)}
            className="rounded-lg px-2 py-1 text-emerald-800 hover:bg-emerald-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Table Floor Lifecycle Strip (Tables 1 - 16) */}
      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <UtensilsIcon size={18} className="text-amber-700" />
            <h3 className="font-display text-base font-bold text-slate-900">
              Dining Floor Table Lifecycle
            </h3>
            <span className="text-xs font-bold text-slate-500">(16 Tables)</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Vacant
            </span>
            <span className="flex items-center gap-1.5 text-blue-700">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Seated
            </span>
            <span className="flex items-center gap-1.5 text-amber-800">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Cooking
            </span>
            <span className="flex items-center gap-1.5 text-purple-800">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> Bill Due
            </span>
          </div>
        </div>

        {/* 16 Table Buttons (44px+ touch targets) */}
        <div className="mt-3.5 grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-16">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((num) => {
            const session = tableSessions[num];
            const hasActiveOrders = orders.some(
              (o) =>
                o.table === num &&
                (o.status === "New" || o.status === "Preparing" || o.status === "Ready")
            );
            const hasBillRequest = serviceRequests.some(
              (r) => r.table === num && r.status === "Pending" && r.type === "Request Bill"
            );

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
                aria-label={`Table ${num} (${derivedStatus})`}
                aria-pressed={isSelected}
                onClick={() => setSelectedFloorTable(isSelected ? null : num)}
                className={`relative flex min-h-12 flex-col items-center justify-center rounded-xl border p-2 transition text-center ${
                  derivedStatus === "BILL_REQUESTED"
                    ? "border-purple-300 bg-purple-50 text-purple-950 font-black ring-2 ring-purple-400"
                    : derivedStatus === "ACTIVE_ORDER"
                      ? "border-amber-300 bg-amber-50 text-amber-950 font-black ring-2 ring-amber-400"
                      : derivedStatus === "SEATED"
                        ? "border-blue-300 bg-blue-50 text-blue-950 font-bold"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                } ${isSelected ? "scale-105 shadow-md" : ""}`}
              >
                <span className="tabular-nums text-xs font-black">T{num}</span>
                <span
                  className={`mt-1 h-2 w-2 rounded-full ${
                    derivedStatus === "BILL_REQUESTED"
                      ? "bg-purple-600 animate-pulse"
                      : derivedStatus === "ACTIVE_ORDER"
                        ? "bg-amber-500 animate-pulse"
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
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900">
                Table {selectedFloorTable} Selected:
              </span>
              <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold uppercase text-slate-700">
                Current: {tableSessions[selectedFloorTable]?.status || "VACANT"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onUpdateTableStatus && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateTableStatus(selectedFloorTable, "SEATED");
                    setSelectedFloorTable(null);
                  }}
                  className="min-h-10 rounded-xl bg-blue-600 px-3.5 py-2 font-bold text-white hover:bg-blue-500 transition"
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
                  className="min-h-10 rounded-xl bg-emerald-600 px-3.5 py-2 font-bold text-white hover:bg-emerald-500 transition"
                >
                  Clear Table / Mark Vacant
                </button>
              )}

              <button
                type="button"
                aria-label="Close table action bar"
                onClick={() => setSelectedFloorTable(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 font-bold text-slate-700 hover:bg-slate-300"
              >
                <XIcon size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Main Grid: Active Orders + Service Alert Side Rail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        {/* Left Column: Tickets */}
        <div className="min-w-0 space-y-4">
          {/* Sub Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilterTab("active")}
                className={`min-h-11 rounded-full px-4 py-2 text-xs font-bold transition ${
                  filterTab === "active"
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                Active Kitchen Queue ({activeOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("history")}
                className={`min-h-11 rounded-full px-4 py-2 text-xs font-bold transition ${
                  filterTab === "history"
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                Completed & Served ({historyOrders.length})
              </button>
            </div>
          </div>

          {filterTab === "active" && activeOrders.length === 0 && (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <ChefHatIcon size={24} />
              </div>
              <p className="font-display mt-3 text-base font-bold text-slate-900">
                All caught up!
              </p>
              <p className="mt-1 text-xs text-slate-500">
                No orders waiting in the active kitchen queue.
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
                      <div className="mb-3 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-950">
                        <div className="flex items-center gap-1.5 font-black text-rose-700">
                          <AlertTriangleIcon size={15} />
                          <span>Table was VACANT when ordered!</span>
                        </div>
                        <p className="mt-1 text-xs text-rose-800">
                          Verify physical guests are seated at Table {order.table} before
                          firing ticket.
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {onUpdateTableStatus && (
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateTableStatus(order.table, "SEATED");
                                onUpdateOrderStatus(order.id, "Preparing");
                              }}
                              className="min-h-10 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition"
                            >
                              Verify & Seat Table
                            </button>
                          )}
                          {onRejectOrder && (
                            <button
                              type="button"
                              onClick={() =>
                                onRejectOrder(order.id, "Table was vacant / prank order")
                              }
                              className="min-h-10 rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-300 transition"
                            >
                              Reject Ticket
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Ticket Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="tabular-nums flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-white">
                          T{order.table}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="tabular-nums text-sm font-black text-slate-900">
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
                              className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-amber-100 hover:text-amber-900 transition"
                              title="Move ticket to another table"
                            >
                              <ArrowLeftRightIcon size={12} />
                              <span>Move</span>
                            </button>
                          </div>
                          <span className="text-xs text-slate-500">
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
                            className={`tabular-nums inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              isUrgent
                                ? "bg-rose-100 text-rose-800 animate-pulse"
                                : isWarning
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            <ClockIcon size={12} />
                            <span>{elapsedMins}m</span>
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wider ${
                              order.status === "New"
                                ? "bg-rose-100 text-rose-800"
                                : order.status === "Preparing"
                                  ? "bg-amber-100 text-amber-900"
                                  : order.status === "Ready"
                                    ? "bg-blue-100 text-blue-800"
                                    : order.status === "Rejected"
                                      ? "bg-rose-100 text-rose-800"
                                      : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {order.status === "Archived"
                              ? "Cleared"
                              : order.status === "Served"
                                ? "Served"
                                : order.status}
                          </span>
                        </div>

                        {/* Location Verification Tag */}
                        {order.geoVerified !== undefined && (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold ${
                              order.geoVerified
                                ? "text-emerald-700"
                                : "text-rose-700 font-black animate-pulse"
                            }`}
                          >
                            <MapPinIcon size={12} />
                            <span>
                              {order.geoVerified
                                ? `On-Premises (${order.distanceMeters ?? 15}m)`
                                : `Remote/Unverified (${order.distanceMeters ?? "?"}m)`}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Transfer Dropdown Strip */}
                    {transferringOrderId === order.id && (
                      <div className="my-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs">
                        <p className="font-bold text-amber-950 mb-2">
                          Reassign Ticket #{order.orderNumber} to:
                        </p>
                        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8">
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
                                className="tabular-nums min-h-9 rounded-lg bg-white border border-amber-300 px-2 py-1.5 font-black text-amber-950 hover:bg-amber-500 hover:text-slate-950 transition"
                              >
                                T{num}
                              </button>
                            ))}
                          <button
                            type="button"
                            aria-label="Cancel transfer"
                            onClick={() => setTransferringOrderId(null)}
                            className="flex min-h-9 items-center justify-center rounded-lg bg-slate-200 px-2 py-1.5 text-slate-700 hover:bg-slate-300"
                          >
                            <XIcon size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Order Line Items */}
                    <div className="mt-4 space-y-2.5">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="border-b border-slate-100 pb-2.5 text-sm last:border-0 last:pb-0"
                        >
                          <div className="flex items-start justify-between">
                            <div className="font-extrabold text-slate-900">
                              <span className="tabular-nums text-amber-700 mr-1.5">
                                {item.quantity}×
                              </span>
                              {item.name}
                            </div>
                            <span className="tabular-nums text-xs font-semibold text-slate-500">
                              {formatPrice(item.totalPrice, currency)}
                            </span>
                          </div>

                          {/* Selected Custom Modifiers */}
                          {item.selectedModifiers.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1.5 pl-5">
                              {item.selectedModifiers.map((mod, mi) => (
                                <span
                                  key={mi}
                                  className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700"
                                >
                                  +{mod.optionName}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Special Chef Instructions */}
                          {item.specialInstructions && (
                            <div className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-950">
                              <AlertTriangleIcon size={13} className="text-amber-700" />
                              <span>Note: {item.specialInstructions}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Bar (Bumping tickets + 1-Click Thermal Receipt Printing) */}
                  <div className="mt-5 border-t border-slate-100 pt-3.5 space-y-2.5">
                    {order.status === "New" && (
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateOrderStatus(order.id, "Preparing");
                          if (autoPrintOnAccept) {
                            handlePrintTicket(order, "kot");
                          }
                        }}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-2.5 text-xs font-black text-slate-950 shadow-sm transition hover:bg-amber-400 active:scale-95"
                      >
                        <ChefHatIcon size={16} />
                        <span>
                          {autoPrintOnAccept
                            ? "Accept & Print Kitchen Ticket"
                            : "Start Preparing"}
                        </span>
                      </button>
                    )}

                    {order.status === "Preparing" && (
                      <button
                        type="button"
                        onClick={() => onUpdateOrderStatus(order.id, "Ready")}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-500 active:scale-95"
                      >
                        <BellIcon size={16} />
                        <span>Mark Ready to Serve</span>
                      </button>
                    )}

                    {order.status === "Ready" && (
                      <button
                        type="button"
                        onClick={() => onUpdateOrderStatus(order.id, "Served")}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-500 active:scale-95"
                      >
                        <CheckCircleIcon size={16} />
                        <span>Complete / Handed Off</span>
                      </button>
                    )}

                    {order.status === "Served" && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-emerald-700">
                          Served at{" "}
                          {new Date(order.updatedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {onClearTable && (
                          <button
                            type="button"
                            onClick={() => onClearTable(order.table)}
                            className="min-h-10 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                          >
                            Clear Table {order.table}
                          </button>
                        )}
                      </div>
                    )}

                    {/* 1-Click Thermal Receipt & KOT Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handlePrintTicket(order, "kot")}
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                        title="Print Kitchen Order Ticket (KOT)"
                      >
                        <PrinterIcon size={13} />
                        <span>Print KOT</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrintTicket(order, "bill")}
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-950 hover:bg-amber-100 transition"
                        title="Print Customer Table Bill Receipt"
                      >
                        <PrinterIcon size={13} />
                        <span>Print Bill ({formatPrice(order.total, currency)})</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Service Calls Side Rail */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Service Alerts</span>
              {pendingRequests.length > 0 && (
                <span className="font-sans rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-bold text-white animate-pulse">
                  {pendingRequests.length} Pending
                </span>
              )}
            </h3>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <SparklesIcon size={20} />
              </div>
              <p className="mt-2 text-xs font-bold text-slate-700">All tables happy</p>
              <p className="mt-0.5 text-xs text-slate-500">
                No pending waiter or refill requests.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50/70 p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-white">
                      T{req.table}
                    </span>
                    <div>
                      <p className="text-sm font-black text-slate-900">{req.type}</p>
                      <p className="text-xs text-slate-600">
                        Requested{" "}
                        {new Date(req.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onResolveService(req.id)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                  >
                    <CheckCircleIcon size={14} />
                    <span>Resolve</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 80mm Thermal Receipt Slip (Hidden on screen, isolated during @media print) */}
      {printingSlip && (
        <div
          id="printable-receipt-slip"
          className="hidden print:block text-black font-mono text-xs leading-snug"
        >
          <div className="text-center border-b border-dashed border-black pb-2 mb-2">
            <p className="text-base font-black uppercase">
              {geoConfig?.restaurantName || "Sunshine Bistro"}
            </p>
            <p className="text-[11px]">
              {printingSlip.mode === "kot"
                ? "*** KITCHEN ORDER TICKET (KOT) ***"
                : "*** CUSTOMER TABLE BILL ***"}
            </p>
          </div>

          <div className="flex justify-between font-bold text-xs border-b border-dashed border-black pb-2 mb-2">
            <span>TABLE #{printingSlip.order.table}</span>
            <span>ORDER #{printingSlip.order.orderNumber}</span>
          </div>

          <p className="text-[11px] mb-2">
            Date:{" "}
            {new Date(printingSlip.order.createdAt).toLocaleString([], {
              month: "short",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          <div className="border-t border-b border-dashed border-black py-2 space-y-1.5">
            {printingSlip.order.items.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between font-bold">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  {printingSlip.mode === "bill" && (
                    <span>{formatPrice(item.totalPrice, currency)}</span>
                  )}
                </div>
                {item.selectedModifiers.length > 0 && (
                  <p className="pl-3 text-[11px]">
                    + {item.selectedModifiers.map((m) => m.optionName).join(", ")}
                  </p>
                )}
                {item.specialInstructions && (
                  <p className="pl-3 text-[11px] font-bold">
                    NOTE: {item.specialInstructions}
                  </p>
                )}
              </div>
            ))}
          </div>

          {printingSlip.mode === "bill" && (
            <div className="py-2 border-b border-dashed border-black space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatPrice(printingSlip.order.subtotal, currency)}</span>
              </div>
              {printingSlip.order.serviceFee > 0 && (
                <div className="flex justify-between">
                  <span>Service Fee:</span>
                  <span>{formatPrice(printingSlip.order.serviceFee, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black pt-1">
                <span>TOTAL DUE:</span>
                <span>{formatPrice(printingSlip.order.total, currency)}</span>
              </div>
            </div>
          )}

          <div className="pt-3 text-center text-[11px]">
            <p>Thank you for dining with us!</p>
            <p>Powered by TableTapp</p>
          </div>
        </div>
      )}
    </div>
  );
}
