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

type TableShape = "booth" | "rect" | "round" | "large";

interface TableMeta {
  num: number;
  label: string;
  zone: "window" | "main" | "patio";
  zoneTitle: string;
  shape: TableShape;
  capacity: number;
}

const TABLE_METAS: TableMeta[] = [
  // Zone 1: Window Bay Booths (1 - 4)
  { num: 1, label: "T1", zone: "window", zoneTitle: "Window Bay", shape: "booth", capacity: 4 },
  { num: 2, label: "T2", zone: "window", zoneTitle: "Window Bay", shape: "booth", capacity: 4 },
  { num: 3, label: "T3", zone: "window", zoneTitle: "Window Bay", shape: "booth", capacity: 4 },
  { num: 4, label: "T4", zone: "window", zoneTitle: "Window Bay", shape: "booth", capacity: 4 },

  // Zone 2: Main Dining Floor (5 - 12)
  { num: 5, label: "T5", zone: "main", zoneTitle: "Main Hall (2-Top)", shape: "rect", capacity: 2 },
  { num: 6, label: "T6", zone: "main", zoneTitle: "Main Hall (2-Top)", shape: "rect", capacity: 2 },
  { num: 7, label: "T7", zone: "main", zoneTitle: "Main Hall", shape: "rect", capacity: 4 },
  { num: 8, label: "T8", zone: "main", zoneTitle: "Main Hall", shape: "rect", capacity: 4 },
  { num: 9, label: "T9", zone: "main", zoneTitle: "Main Hall", shape: "rect", capacity: 4 },
  { num: 10, label: "T10", zone: "main", zoneTitle: "Main Hall", shape: "rect", capacity: 4 },
  { num: 11, label: "T11", zone: "main", zoneTitle: "Main Hall (Banquet)", shape: "large", capacity: 6 },
  { num: 12, label: "T12", zone: "main", zoneTitle: "Main Hall (Banquet)", shape: "large", capacity: 6 },

  // Zone 3: Garden Patio & Terrace (13 - 16)
  { num: 13, label: "T13", zone: "patio", zoneTitle: "Garden Patio", shape: "round", capacity: 4 },
  { num: 14, label: "T14", zone: "patio", zoneTitle: "Garden Patio", shape: "round", capacity: 4 },
  { num: 15, label: "T15", zone: "patio", zoneTitle: "Garden Patio", shape: "round", capacity: 2 },
  { num: 16, label: "T16", zone: "patio", zoneTitle: "Garden Patio", shape: "round", capacity: 2 },
];

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
  const [floorViewMode, setFloorViewMode] = useState<"map" | "grid">("map");
  const [floorFilterStatus, setFloorFilterStatus] = useState<"ALL" | TableOccupancyStatus>("ALL");

  // Thermal Receipt Printer States
  const [printerConnected, setPrinterConnected] = useState(() => isThermalPrinterConnected());
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
    const getDerivedTableStatus = (tableNum: number): TableOccupancyStatus => {
    const hasBillRequest = serviceRequests.some(
      (r) => r.table === tableNum && r.status === "Pending" && r.type === "Request Bill"
    );
    if (hasBillRequest) return "BILL_REQUESTED";

    const hasActiveOrders = orders.some(
      (o) =>
        o.table === tableNum &&
        (o.status === "New" || o.status === "Preparing" || o.status === "Ready")
    );
    if (hasActiveOrders) return "ACTIVE_ORDER";

    const session = tableSessions[tableNum];
    return session?.status || "VACANT";
  };

  const tableStatusCounts = {
    ALL: 16,
    VACANT: 0,
    SEATED: 0,
    ACTIVE_ORDER: 0,
    BILL_REQUESTED: 0,
  };
  for (let i = 1; i <= 16; i++) {
    const st = getDerivedTableStatus(i);
    if (st in tableStatusCounts) {
      tableStatusCounts[st as keyof typeof tableStatusCounts]++;
    }
  }

  const renderTableMapCard = (meta: TableMeta, isCompact = false) => {
    const num = meta.num;
    const derivedStatus = getDerivedTableStatus(num);
    const isSelected = selectedFloorTable === num;
    const isFilteredOut = floorFilterStatus !== "ALL" && derivedStatus !== floorFilterStatus;

    const activeOrderCount = orders.filter(
      (o) => o.table === num && o.status !== "Served" && o.status !== "Archived" && o.status !== "Rejected"
    ).length;

    return (
      <button
        key={num}
        type="button"
        aria-label={`Table ${num} (${derivedStatus})`}
        aria-pressed={isSelected}
        onClick={() => setSelectedFloorTable(isSelected ? null : num)}
        className={`group relative flex flex-col items-center justify-between rounded-2xl border transition-all duration-150 ${
          isCompact ? "p-2 min-h-12" : "p-3 min-h-[96px]"
        } ${
          derivedStatus === "BILL_REQUESTED"
            ? "border-purple-300 bg-purple-50/90 text-purple-950 shadow-xs ring-1 ring-purple-300/60"
            : derivedStatus === "ACTIVE_ORDER"
              ? "border-amber-300 bg-amber-50/90 text-amber-950 shadow-xs ring-1 ring-amber-300/60"
              : derivedStatus === "SEATED"
                ? "border-blue-300 bg-blue-50/90 text-blue-950 shadow-xs ring-1 ring-blue-300/60"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 shadow-xs"
        } ${isSelected ? "scale-[1.03] ring-4 ring-amber-500 shadow-lg z-10" : "hover:scale-[1.02]"} ${
          isFilteredOut ? "opacity-30 scale-95" : "opacity-100"
        }`}
      >
        <div className="flex w-full items-center justify-between">
          <span className="font-display tabular-nums text-sm font-black tracking-tight">
            T{num}
          </span>
          <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600">
            {meta.capacity}p
          </span>
        </div>

        {!isCompact && (
          <div className="my-1.5 flex flex-col items-center">
            {meta.shape === "booth" && (
              <div className="flex flex-col items-center">
                <div className="h-1.5 w-9 rounded-full bg-slate-300/80" />
                <div className="my-0.5 h-4 w-7 rounded-md border border-slate-300 bg-slate-100" />
                <div className="h-1.5 w-9 rounded-full bg-slate-300/80" />
              </div>
            )}
            {meta.shape === "round" && (
              <div className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-100">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
              </div>
            )}
            {meta.shape === "rect" && (
              <div className="flex flex-col items-center">
                <div className="flex gap-2">
                  <span className="h-1 w-2 rounded-full bg-slate-300" />
                  <span className="h-1 w-2 rounded-full bg-slate-300" />
                </div>
                <div className="my-0.5 h-3.5 w-8 rounded-md border border-slate-300 bg-slate-100" />
                <div className="flex gap-2">
                  <span className="h-1 w-2 rounded-full bg-slate-300" />
                  <span className="h-1 w-2 rounded-full bg-slate-300" />
                </div>
              </div>
            )}
            {meta.shape === "large" && (
              <div className="flex flex-col items-center">
                <div className="flex gap-1.5">
                  <span className="h-1 w-1.5 rounded-full bg-slate-300" />
                  <span className="h-1 w-1.5 rounded-full bg-slate-300" />
                  <span className="h-1 w-1.5 rounded-full bg-slate-300" />
                </div>
                <div className="my-0.5 h-3.5 w-10 rounded-md border border-slate-300 bg-slate-100" />
                <div className="flex gap-1.5">
                  <span className="h-1 w-1.5 rounded-full bg-slate-300" />
                  <span className="h-1 w-1.5 rounded-full bg-slate-300" />
                  <span className="h-1 w-1.5 rounded-full bg-slate-300" />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-1 flex items-center gap-1">
          <span
            className={`h-2 w-2 rounded-full ${
              derivedStatus === "BILL_REQUESTED"
                ? "bg-purple-600 animate-pulse"
                : derivedStatus === "ACTIVE_ORDER"
                  ? "bg-amber-500 animate-pulse"
                  : derivedStatus === "SEATED"
                    ? "bg-blue-500"
                    : "bg-slate-300"
            }`}
          />
          <span className="text-[10px] font-black uppercase">
            {derivedStatus === "BILL_REQUESTED"
              ? "Bill"
              : derivedStatus === "ACTIVE_ORDER"
                ? `Cook (${activeOrderCount})`
                : derivedStatus === "SEATED"
                  ? "Seat"
                  : "Open"}
          </span>
        </div>
      </button>
    );
  };

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

  const getDerivedTableStatus = (tableNum: number): TableOccupancyStatus => {
    const hasBillRequest = serviceRequests.some(
      (r) => r.table === tableNum && r.status === "Pending" && r.type === "Request Bill"
    );
    if (hasBillRequest) return "BILL_REQUESTED";

    const hasActiveOrders = orders.some(
      (o) =>
        o.table === tableNum &&
        (o.status === "New" || o.status === "Preparing" || o.status === "Ready")
    );
    if (hasActiveOrders) return "ACTIVE_ORDER";

    const session = tableSessions[tableNum];
    return session?.status || "VACANT";
  };

  const tableStatusCounts = {
    ALL: 16,
    VACANT: 0,
    SEATED: 0,
    ACTIVE_ORDER: 0,
    BILL_REQUESTED: 0,
  };
  for (let i = 1; i <= 16; i++) {
    const st = getDerivedTableStatus(i);
    if (st in tableStatusCounts) {
      tableStatusCounts[st as keyof typeof tableStatusCounts]++;
    }
  }

  const renderTableMapCard = (meta: TableMeta, isCompact = false) => {
    const num = meta.num;
    const derivedStatus = getDerivedTableStatus(num);
    const isSelected = selectedFloorTable === num;
    const isFilteredOut = floorFilterStatus !== "ALL" && derivedStatus !== floorFilterStatus;

    const activeOrderCount = orders.filter(
      (o) => o.table === num && o.status !== "Served" && o.status !== "Archived" && o.status !== "Rejected"
    ).length;

    return (
      <button
        key={num}
        type="button"
        aria-label={`Table ${num} (${derivedStatus})`}
        aria-pressed={isSelected}
        onClick={() => setSelectedFloorTable(isSelected ? null : num)}
        className={`group relative flex flex-col items-center justify-between rounded-2xl border transition-all duration-150 ${
          isCompact ? "p-2 min-h-12" : "p-3 min-h-[96px]"
        } ${
          derivedStatus === "BILL_REQUESTED"
            ? "border-purple-300 bg-purple-50/90 text-purple-950 shadow-xs ring-1 ring-purple-300/60"
            : derivedStatus === "ACTIVE_ORDER"
              ? "border-amber-300 bg-amber-50/90 text-amber-950 shadow-xs ring-1 ring-amber-300/60"
              : derivedStatus === "SEATED"
                ? "border-blue-300 bg-blue-50/90 text-blue-950 shadow-xs ring-1 ring-blue-300/60"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 shadow-xs"
        } ${isSelected ? "scale-[1.03] ring-4 ring-amber-500 shadow-lg z-10" : "hover:scale-[1.02]"} ${
          isFilteredOut ? "opacity-30 scale-95" : "opacity-100"
        }`}
      >
        <div className="flex w-full items-center justify-between">
          <span className="font-display tabular-nums text-sm font-black tracking-tight">
            T{num}
          </span>
          <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600">
            {meta.capacity}p
          </span>
        </div>

        {!isCompact && (
          <div className="my-1.5 flex flex-col items-center">
            {meta.shape === "booth" && (
              <div className="flex flex-col items-center">
                <div className="h-1.5 w-9 rounded-full bg-slate-300/80" />
                <div className="my-0.5 h-4 w-7 rounded-md border border-slate-300 bg-slate-100" />
                <div className="h-1.5 w-9 rounded-full bg-slate-300/80" />
              </div>
            )}
            {meta.shape === "round" && (
              <div className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-100">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
              </div>
            )}
            {meta.shape === "rect" && (
              <div className="flex flex-col items-center">
                <div className="flex gap-2">
                  <span className="h-1 w-2 rounded-full bg-slate-300" />
                  <span className="h-1 w-2 rounded-full bg-slate-300" />
                </div>
                <div className="my-0.5 h-3.5 w-8 rounded-md border border-slate-300 bg-slate-100" />
                <div className="flex gap-2">
                  <span className="h-1 w-2 rounded-full bg-slate-300" />
                  <span className="h-1 w-2 rounded-full bg-slate-300" />
                </div>
              </div>
            )}
            {meta.shape === "large" && (
              <div className="flex flex-col items-center">
                <div className="flex gap-1.5">
                  <span className="h-1 w-1.5 rounded-full bg-slate-300" />
                  <span className="h-1 w-1.5 rounded-full bg-slate-300" />
                  <span className="h-1 w-1.5 rounded-full bg-slate-300" />
                </div>
                <div className="my-0.5 h-3.5 w-10 rounded-md border border-slate-300 bg-slate-100" />
                <div className="flex gap-1.5">
                  <span className="h-1 w-1.5 rounded-full bg-slate-300" />
                  <span className="h-1 w-1.5 rounded-full bg-slate-300" />
                  <span className="h-1 w-1.5 rounded-full bg-slate-300" />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-1 flex items-center gap-1">
          <span
            className={`h-2 w-2 rounded-full ${
              derivedStatus === "BILL_REQUESTED"
                ? "bg-purple-600 animate-pulse"
                : derivedStatus === "ACTIVE_ORDER"
                  ? "bg-amber-500 animate-pulse"
                  : derivedStatus === "SEATED"
                    ? "bg-blue-500"
                    : "bg-slate-300"
            }`}
          />
          <span className="text-[10px] font-black uppercase">
            {derivedStatus === "BILL_REQUESTED"
              ? "Bill"
              : derivedStatus === "ACTIVE_ORDER"
                ? `Cook (${activeOrderCount})`
                : derivedStatus === "SEATED"
                  ? "Seat"
                  : "Open"}
          </span>
        </div>
      </button>
    );
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

      {/* Interactive Dining Floor Table Map (Tables 1 - 16) */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {/* Floor Map Header & Controls */}
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <UtensilsIcon size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-slate-900 sm:text-lg">
                  Dining Floor Plan &amp; Live Table Map
                </h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  16 Tables
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Click any table to inspect live orders, pending requests, or seat guests
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Live Filter Chips */}
            <div className="flex flex-wrap items-center rounded-2xl bg-slate-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFloorFilterStatus("ALL")}
                className={`min-h-8 rounded-xl px-2.5 py-1 transition ${
                  floorFilterStatus === "ALL"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All (16)
              </button>
              <button
                type="button"
                onClick={() => setFloorFilterStatus("VACANT")}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-xl px-2.5 py-1 transition ${
                  floorFilterStatus === "VACANT"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                <span>Vacant ({tableStatusCounts.VACANT})</span>
              </button>
              <button
                type="button"
                onClick={() => setFloorFilterStatus("SEATED")}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-xl px-2.5 py-1 transition ${
                  floorFilterStatus === "SEATED"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-blue-700 hover:text-blue-900"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span>Seated ({tableStatusCounts.SEATED})</span>
              </button>
              <button
                type="button"
                onClick={() => setFloorFilterStatus("ACTIVE_ORDER")}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-xl px-2.5 py-1 transition ${
                  floorFilterStatus === "ACTIVE_ORDER"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-amber-800 hover:text-amber-950"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Cooking ({tableStatusCounts.ACTIVE_ORDER})</span>
              </button>
              <button
                type="button"
                onClick={() => setFloorFilterStatus("BILL_REQUESTED")}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-xl px-2.5 py-1 transition ${
                  floorFilterStatus === "BILL_REQUESTED"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-purple-800 hover:text-purple-950"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                <span>Bill Due ({tableStatusCounts.BILL_REQUESTED})</span>
              </button>
            </div>

            {/* View Switcher: Interactive Map vs Compact Grid */}
            <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 text-xs font-bold shadow-xs">
              <button
                type="button"
                onClick={() => setFloorViewMode("map")}
                className={`min-h-8 rounded-lg px-2.5 py-1 transition ${
                  floorViewMode === "map"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Map View
              </button>
              <button
                type="button"
                onClick={() => setFloorViewMode("grid")}
                className={`min-h-8 rounded-lg px-2.5 py-1 transition ${
                  floorViewMode === "grid"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Quick Grid
              </button>
            </div>
          </div>
        </div>

        {/* View Mode 1: Interactive Floor Map */}
        {floorViewMode === "map" ? (
          <div className="mt-4 rounded-3xl border border-slate-200/90 bg-gradient-to-b from-[#fbfbfe] to-slate-50/60 p-4 sm:p-5">
            {/* Floor Spatial Cues / Landmark Indicators */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-500">
              <div className="flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-800">
                <span>🪟</span>
                <span>Street Glass Windows (Booths 1 - 4)</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-amber-900">
                <ChefHatIcon size={13} className="text-amber-700" />
                <span>Kitchen Expediter &amp; Service Pass</span>
              </div>
            </div>

            {/* Interactive Zones Container */}
            <div className="grid gap-4 lg:grid-cols-12">
              {/* Zone A: Window Booths (Tables 1 - 4) */}
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3.5 shadow-xs lg:col-span-4 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span>🪟</span> Window Bay Booths
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">4-Tops</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {TABLE_METAS.filter((t) => t.zone === "window").map((t) =>
                    renderTableMapCard(t)
                  )}
                </div>
              </div>

              {/* Zone B: Main Dining Hall (Tables 5 - 12) */}
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3.5 shadow-xs lg:col-span-5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span>🍽️</span> Main Dining Hall
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">2, 4 &amp; 6 Seats</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2.5">
                  {TABLE_METAS.filter((t) => t.zone === "main").map((t) =>
                    renderTableMapCard(t)
                  )}
                </div>
              </div>

              {/* Zone C: Garden Patio & Lounge (Tables 13 - 16) */}
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3.5 shadow-xs lg:col-span-3 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span>🌿</span> Garden Patio
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">Bistro Rounds</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {TABLE_METAS.filter((t) => t.zone === "patio").map((t) =>
                    renderTableMapCard(t)
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Floor Landmark Cue: Main Entrance */}
            <div className="mt-3.5 flex items-center justify-between text-[11px] font-bold text-slate-500 pt-2 border-t border-slate-200/60">
              <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700">
                <span>🚪</span>
                <span>Main Entrance &amp; Hostess Station</span>
              </div>
              <span className="text-slate-400">Physical Dining Layout Preview</span>
            </div>
          </div>
        ) : (
          /* View Mode 2: Quick Compact Grid */
          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-16">
            {TABLE_METAS.map((t) => renderTableMapCard(t, true))}
          </div>
        )}

        {/* Selected Table Interactive Inspector Drawer */}
        {selectedFloorTable !== null && (
          <div className="mt-4 rounded-2xl border-2 border-slate-900 bg-slate-950 p-4 text-white shadow-xl transition animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 font-black text-slate-950 text-base shadow">
                  T{selectedFloorTable}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-display text-base font-bold text-white sm:text-lg">
                      Table {selectedFloorTable}
                    </h4>
                    <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-slate-300">
                      {TABLE_METAS.find((m) => m.num === selectedFloorTable)?.zoneTitle || "Dining Room"} •{" "}
                      {TABLE_METAS.find((m) => m.num === selectedFloorTable)?.capacity || 4} Seats
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Status:</span>
                    <span
                      className={`font-black uppercase ${
                        getDerivedTableStatus(selectedFloorTable) === "BILL_REQUESTED"
                          ? "text-purple-400"
                          : getDerivedTableStatus(selectedFloorTable) === "ACTIVE_ORDER"
                            ? "text-amber-400"
                            : getDerivedTableStatus(selectedFloorTable) === "SEATED"
                              ? "text-blue-400"
                              : "text-slate-400"
                      }`}
                    >
                      {getDerivedTableStatus(selectedFloorTable).replace("_", " ")}
                    </span>
                  </p>
                </div>
              </div>

              {/* Table Action Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {onUpdateTableStatus && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateTableStatus(selectedFloorTable, "SEATED");
                    }}
                    className="min-h-10 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-500 transition shadow-sm"
                  >
                    Seat Table
                  </button>
                )}

                {onClearTable && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearTable(selectedFloorTable);
                    }}
                    className="min-h-10 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-sm"
                  >
                    Clear Table / Mark Vacant
                  </button>
                )}

                <button
                  type="button"
                  aria-label="Close table inspector"
                  onClick={() => setSelectedFloorTable(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                >
                  <XIcon size={16} />
                </button>
              </div>
            </div>

            {/* Inspector Details Grid */}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {/* Active Orders at this Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs">
                <span className="font-black text-slate-300 flex items-center gap-1.5 mb-2">
                  <ChefHatIcon size={14} className="text-amber-400" />
                  Active Kitchen Orders ({orders.filter((o) => o.table === selectedFloorTable && o.status !== "Served" && o.status !== "Archived" && o.status !== "Rejected").length})
                </span>
                {orders.filter((o) => o.table === selectedFloorTable && o.status !== "Served" && o.status !== "Archived" && o.status !== "Rejected").length === 0 ? (
                  <p className="text-slate-500 italic">No active food orders in queue for this table.</p>
                ) : (
                  <div className="space-y-2">
                    {orders
                      .filter((o) => o.table === selectedFloorTable && o.status !== "Served" && o.status !== "Archived" && o.status !== "Rejected")
                      .map((o) => (
                        <div key={o.id} className="flex items-center justify-between rounded-lg bg-slate-800/80 p-2.5">
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-amber-300">
                              #{o.orderNumber || o.id.slice(0, 6)} • {formatPrice(o.total, currency)}
                            </span>
                            <p className="truncate text-[11px] text-slate-400 mt-0.5">
                              {o.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById(`order-ticket-${o.id}`);
                              if (el) {
                                el.scrollIntoView({ behavior: "smooth", block: "center" });
                                el.classList.add("ring-4", "ring-amber-400");
                                setTimeout(() => el.classList.remove("ring-4", "ring-amber-400"), 2500);
                              }
                            }}
                            className="shrink-0 rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-black text-slate-950 hover:bg-amber-400 transition"
                          >
                            Inspect Ticket
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Pending Service Requests */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs">
                <span className="font-black text-slate-300 flex items-center gap-1.5 mb-2">
                  <BellIcon size={14} className="text-purple-400" />
                  Service Requests ({serviceRequests.filter((r) => r.table === selectedFloorTable && r.status === "Pending").length})
                </span>
                {serviceRequests.filter((r) => r.table === selectedFloorTable && r.status === "Pending").length === 0 ? (
                  <p className="text-slate-500 italic">No pending waiter or refill requests.</p>
                ) : (
                  <div className="space-y-2">
                    {serviceRequests
                      .filter((r) => r.table === selectedFloorTable && r.status === "Pending")
                      .map((req) => (
                        <div key={req.id} className="flex items-center justify-between rounded-lg bg-slate-800/80 p-2.5">
                          <div>
                            <span className="font-bold text-purple-300">{req.type}</span>
                            <span className="text-[11px] text-slate-400 block">`{getElapsedMinutes(req.createdAt)}m ago • Table ${req.table}`</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onResolveService(req.id)}
                            className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-500 transition"
                          >
                            Resolve
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
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

              const getDerivedTableStatus = (tableNum: number): TableOccupancyStatus => {
    const hasBillRequest = serviceRequests.some(
      (r) => r.table === tableNum && r.status === "Pending" && r.type === "Request Bill"
    );
    if (hasBillRequest) return "BILL_REQUESTED";

    const hasActiveOrders = orders.some(
      (o) =>
        o.table === tableNum &&
        (o.status === "New" || o.status === "Preparing" || o.status === "Ready")
    );
    if (hasActiveOrders) return "ACTIVE_ORDER";

    const session = tableSessions[tableNum];
    return session?.status || "VACANT";
  };

  const tableStatusCounts = {
    ALL: 16,
    VACANT: 0,
    SEATED: 0,
    ACTIVE_ORDER: 0,
    BILL_REQUESTED: 0,
  };
  for (let i = 1; i <= 16; i++) {
    const st = getDerivedTableStatus(i);
    if (st in tableStatusCounts) {
      tableStatusCounts[st as keyof typeof tableStatusCounts]++;
    }
  }

  const renderTableMapCard = (meta: TableMeta, isCompact = false) => {
    const num = meta.num;
    const derivedStatus = getDerivedTableStatus(num);
    const isSelected = selectedFloorTable === num;
    const isFilteredOut = floorFilterStatus !== "ALL" && derivedStatus !== floorFilterStatus;

    const activeOrderCount = orders.filter(
      (o) => o.table === num && o.status !== "Served" && o.status !== "Archived" && o.status !== "Rejected"
    ).length;

    return (
      <button
        key={num}
        type="button"
        aria-label={`Table ${num} (${derivedStatus})`}
        aria-pressed={isSelected}
        onClick={() => setSelectedFloorTable(isSelected ? null : num)}
        className={`group relative flex flex-col items-center justify-between rounded-2xl border transition-all duration-150 ${
          isCompact ? "p-2 min-h-12" : "p-3 min-h-[96px]"
        } ${
          derivedStatus === "BILL_REQUESTED"
            ? "border-purple-300 bg-purple-50/90 text-purple-950 shadow-xs ring-1 ring-purple-300/60"
            : derivedStatus === "ACTIVE_ORDER"
              ? "border-amber-300 bg-amber-50/90 text-amber-950 shadow-xs ring-1 ring-amber-300/60"
              : derivedStatus === "SEATED"
                ? "border-blue-300 bg-blue-50/90 text-blue-950 shadow-xs ring-1 ring-blue-300/60"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 shadow-xs"
        } ${isSelected ? "scale-[1.03] ring-4 ring-amber-500 shadow-lg z-10" : "hover:scale-[1.02]"} ${
          isFilteredOut ? "opacity-30 scale-95" : "opacity-100"
        }`}
      >
        <div className="flex w-full items-center justify-between">
          <span className="font-display tabular-nums text-sm font-black tracking-tight">
            T{num}
          </span>
          <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600">
            {meta.capacity}p
          </span>
        </div>

        {!isCompact && (
          <div className="my-1.5 flex flex-col items-center">
            {meta.shape === "booth" && (
              <div className="flex flex-col items-center">
                <div className="h-1.5 w-9 rounded-full bg-slate-300/80" />
                <div className="my-0.5 h-4 w-7 rounded-md border border-slate-300 bg-slate-100" />
                <div className="h-1.5 w-9 rounded-full bg-slate-300/80" />
              </div>
            )}
            {meta.shape === "round" && (
              <div className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-100">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
              </div>
            )}
            {meta.shape === "rect" && (
              <div className="flex flex-col items-center">
                <div className="flex gap-2">
                  <span className="h-1 w-2 rounded-full bg-slate-300" />
                  <span className="h-1 w-2 rounded-full bg-slate-300" />
                </div>
                <div className="my-0.5 h-3.5 w-8 rounded-md border border-slate-300 bg-slate-100" />
                <div className="flex gap-2">
                  <span className="h-1 w-2 rounded-full bg-slate-300" />
                  <span className="h-1 w-2 rounded-full bg-slate-300" />
                </div>
              </div>
            )}
            {meta.shape === "large" && (
              <div className="flex flex-col items-center">
                <div className="flex gap-1.5">
                  <span className="h-1 w-1.5 rounded-full bg-slate-300" />
                  <span className="h-1 w-1.5 rounded-full bg-slate-300" />
                  <span className="h-1 w-1.5 rounded-full bg-slate-300" />
                </div>
                <div className="my-0.5 h-3.5 w-10 rounded-md border border-slate-300 bg-slate-100" />
                <div className="flex gap-1.5">
                  <span className="h-1 w-1.5 rounded-full bg-slate-300" />
                  <span className="h-1 w-1.5 rounded-full bg-slate-300" />
                  <span className="h-1 w-1.5 rounded-full bg-slate-300" />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-1 flex items-center gap-1">
          <span
            className={`h-2 w-2 rounded-full ${
              derivedStatus === "BILL_REQUESTED"
                ? "bg-purple-600 animate-pulse"
                : derivedStatus === "ACTIVE_ORDER"
                  ? "bg-amber-500 animate-pulse"
                  : derivedStatus === "SEATED"
                    ? "bg-blue-500"
                    : "bg-slate-300"
            }`}
          />
          <span className="text-[10px] font-black uppercase">
            {derivedStatus === "BILL_REQUESTED"
              ? "Bill"
              : derivedStatus === "ACTIVE_ORDER"
                ? `Cook (${activeOrderCount})`
                : derivedStatus === "SEATED"
                  ? "Seat"
                  : "Open"}
          </span>
        </div>
      </button>
    );
  };

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

                  {/* Action Bar (Bumping tickets + Reject + 1-Click Receipt Printing) */}
                  <div className="mt-5 border-t border-slate-100 pt-3.5 space-y-2">
                    {order.status === "New" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateOrderStatus(order.id, "Preparing")}
                          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-3 py-2.5 text-xs font-black text-slate-950 shadow-sm transition hover:bg-amber-400 active:scale-95"
                        >
                          <ChefHatIcon size={16} />
                          <span>Accept &amp; Prepare</span>
                        </button>

                        {onRejectOrder && (
                          <button
                            type="button"
                            onClick={() =>
                              onRejectOrder(
                                order.id,
                                "Table was vacant or unverified by waiter"
                              )
                            }
                            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 active:scale-95 transition"
                            title="Reject order if table is empty"
                          >
                            <XIcon size={14} />
                            <span>Reject</span>
                          </button>
                        )}
                      </div>
                    )}

                    {order.status === "Preparing" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateOrderStatus(order.id, "Ready")}
                          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-3 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-500 active:scale-95"
                        >
                          <BellIcon size={16} />
                          <span>Mark Ready to Serve</span>
                        </button>

                        {onRejectOrder && (
                          <button
                            type="button"
                            onClick={() =>
                              onRejectOrder(
                                order.id,
                                "Order cancelled / table empty"
                              )
                            }
                            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                            title="Cancel / Reject order"
                          >
                            Reject
                          </button>
                        )}
                      </div>
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

                    {/* Single 1-Click Thermal Receipt Print Button */}
                    <button
                      type="button"
                      onClick={() => handlePrintTicket(order, "bill")}
                      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-amber-50 hover:border-amber-300 transition"
                      title="Print 80mm Customer & Kitchen Receipt"
                    >
                      <PrinterIcon size={14} className="text-amber-700" />
                      <span>Print Receipt ({formatPrice(order.total, currency)})</span>
                    </button>
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
              {geoConfig?.restaurantName || "Heat Box Pizza"}
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
