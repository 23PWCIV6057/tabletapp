"use client";

import React from "react";
import { CurrencyCode, OrderCard, OrderStatus } from "@/types";
import { formatPrice } from "@/lib/geo";
import {
  BellIcon,
  CheckCircleIcon,
  ChefHatIcon,
  InboxIcon,
  UtensilsIcon,
} from "./Icons";

interface LiveOrderTrackerProps {
  orders: OrderCard[];
  currency?: CurrencyCode;
  onDismissOrder?: (orderId: string) => void;
}

const STEPS: {
  status: OrderStatus;
  label: string;
  renderIcon: () => React.ReactNode;
  desc: string;
}[] = [
  { status: "New", label: "Received", renderIcon: () => <InboxIcon size={15} />, desc: "Sent to kitchen" },
  { status: "Preparing", label: "In Kitchen", renderIcon: () => <ChefHatIcon size={15} />, desc: "Chef is cooking" },
  { status: "Ready", label: "Ready", renderIcon: () => <BellIcon size={15} />, desc: "Plated & ready" },
  { status: "Served", label: "Served", renderIcon: () => <CheckCircleIcon size={15} />, desc: "At your table" },
];

function getStepIndex(status: OrderStatus): number {
  switch (status) {
    case "New":
      return 0;
    case "Preparing":
      return 1;
    case "Ready":
      return 2;
    case "Served":
    case "Archived":
      return 3;
    default:
      return 0;
  }
}

export default function LiveOrderTracker({
  orders,
  currency = "PKR",
  onDismissOrder,
}: LiveOrderTrackerProps) {
  if (orders.length === 0) return null;

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const currentIdx = getStepIndex(order.status);
        const isDone = order.status === "Served" || order.status === "Archived";

        return (
          <div
            key={order.id}
            className={`overflow-hidden rounded-[26px] border bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)] transition-all ${
              isDone ? "border-emerald-300 ring-2 ring-emerald-500/20" : "border-slate-200"
            }`}
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between border-b p-4 sm:px-6 ${
                isDone
                  ? "border-emerald-100 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent"
                  : "border-slate-100 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="tabular-nums flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-white">
                  #{order.orderNumber}
                </span>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Table {order.table} {isDone ? "Completed Order" : "Active Order"}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Placed{" "}
                    {new Date(order.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                    order.status === "New"
                      ? "bg-rose-100 text-rose-800 animate-pulse"
                      : order.status === "Preparing"
                        ? "bg-amber-100 text-amber-800"
                        : order.status === "Ready"
                          ? "bg-blue-100 text-blue-800 ring-2 ring-blue-500/30"
                          : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {order.status === "New" ? "Kitchen Queued" : order.status}
                </span>

                {isDone && onDismissOrder && (
                  <button
                    type="button"
                    onClick={() => onDismissOrder(order.id)}
                    className="min-h-10 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white hover:bg-emerald-500 shadow-sm transition"
                    title="Dismiss served order"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Stepper */}
            <div className="p-4 sm:p-6">
              <div className="relative mb-6">
                <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-100" />
                <div
                  className={`absolute top-4 left-6 h-0.5 transition-all duration-500 ${
                    isDone ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${(currentIdx / (STEPS.length - 1)) * 100}%` }}
                />

                <div className="relative flex justify-between">
                  {STEPS.map((step, idx) => {
                    const isPassed = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;

                    return (
                      <div key={step.status} className="flex flex-col items-center">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                            isPassed
                              ? isDone
                                ? "bg-emerald-500 text-white ring-4 ring-emerald-500/20 shadow"
                                : "bg-amber-500 text-slate-950 ring-4 ring-amber-500/20 shadow"
                              : "border-2 border-slate-200 bg-white text-slate-400"
                          } ${isCurrent && !isDone ? "scale-110" : ""}`}
                        >
                          {step.renderIcon()}
                        </div>
                        <span
                          className={`mt-2 text-xs font-bold tracking-tight ${
                            isCurrent
                              ? "text-slate-900"
                              : isPassed
                                ? "text-slate-600"
                                : "text-slate-400"
                          }`}
                        >
                          {step.label}
                        </span>
                        <span className="hidden text-xs text-slate-500 sm:inline">
                          {step.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Items summary */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Order Breakdown
                </p>
                <div className="space-y-1.5">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="text-slate-700">
                        <span className="font-bold text-slate-900">{item.quantity}×</span>{" "}
                        {item.name}
                        {item.selectedModifiers.length > 0 && (
                          <span className="text-xs text-slate-500 ml-1.5">
                            ({item.selectedModifiers.map((m) => m.optionName).join(", ")})
                          </span>
                        )}
                        {item.specialInstructions && (
                          <p className="text-xs italic text-amber-800 ml-4">
                            Note: &quot;{item.specialInstructions}&quot;
                          </p>
                        )}
                      </div>
                      <span className="tabular-nums font-semibold text-slate-800">
                        {formatPrice(item.totalPrice, currency)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="tabular-nums mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs font-bold text-slate-900">
                  <span>Total</span>
                  <span>{formatPrice(order.total, currency)}</span>
                </div>
              </div>

              {/* Dismiss Banner when Served */}
              {isDone && (
                <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-900">
                  <div className="flex items-center gap-2.5">
                    <UtensilsIcon size={18} className="text-emerald-700" />
                    <p className="text-xs font-bold">
                      Your food has been served to Table {order.table}! Enjoy!
                    </p>
                  </div>
                  {onDismissOrder && (
                    <button
                      type="button"
                      onClick={() => onDismissOrder(order.id)}
                      className="min-h-10 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                    >
                      Dismiss Tracker
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
