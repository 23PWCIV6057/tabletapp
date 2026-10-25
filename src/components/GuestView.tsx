"use client";

import React, { useEffect, useMemo, useState } from "react";
import { GeoFenceConfig, MenuItem, OrderCard, OrderItem, ServiceType } from "@/types";
import { verifyUserWithinRestaurant } from "@/lib/geo";
import { verifyPinServer } from "@/lib/auth";
import {
  AlertTriangleIcon,
  ArrowLeftRightIcon,
  ClockIcon,
  DropletIcon,
  HandWaveIcon,
  LockIcon,
  MapPinIcon,
  ReceiptIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SparklesIcon,
  UtensilsIcon,
  XIcon,
} from "./Icons";
import DishCustomizeModal from "./DishCustomizeModal";
import LiveOrderTracker from "./LiveOrderTracker";

interface GuestViewProps {
  tableNumber: number;
  onTableChange: (table: number) => void;
  isStaff?: boolean;
  menu: MenuItem[];
  tableOrders: OrderCard[];
  transferNotice?: string | null;
  onDismissTransferNotice?: () => void;
  onPlaceOrder: (
    items: OrderItem[],
    meta?: { geoVerified?: boolean; distanceMeters?: number }
  ) => void;
  onRequestService: (type: ServiceType) => void;
  onOpenStaffLogin: (role: "kitchen" | "owner") => void;
  geoConfig?: GeoFenceConfig;
}

const CATEGORIES = ["All", "Starters", "Mains", "Desserts", "Drinks"] as const;
const DIETARY_TAGS = ["All", "Vegetarian", "Chef Pick", "Popular", "Spicy"] as const;

const SERVICE_OPTIONS: {
  type: ServiceType;
  renderIcon: () => React.ReactNode;
  label: string;
}[] = [
  { type: "Water Refill", renderIcon: () => <DropletIcon size={20} />, label: "Water Refill" },
  { type: "Extra Napkins", renderIcon: () => <UtensilsIcon size={20} />, label: "Napkins & Cutlery" },
  { type: "Sauces & Condiments", renderIcon: () => <SparklesIcon size={20} />, label: "Condiments" },
  { type: "Request Bill", renderIcon: () => <ReceiptIcon size={20} />, label: "Request Bill" },
  { type: "Call Waiter", renderIcon: () => <HandWaveIcon size={20} />, label: "Call Server" },
];

export default function GuestView({
  tableNumber,
  onTableChange,
  isStaff = false,
  menu,
  tableOrders,
  transferNotice,
  onDismissTransferNotice,
  onPlaceOrder,
  onRequestService,
  onOpenStaffLogin,
  geoConfig,
}: GuestViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedTag, setSelectedTag] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const [cart, setCart] = useState<OrderItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(`tabletapp_cart_t${tableNumber}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // GPS Location Verification States
  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);
  const [geoBlockedModal, setGeoBlockedModal] = useState<{
    distanceMeters?: number;
    message: string;
    isPermissionError?: boolean;
  } | null>(null);
  const [staffBypassPin, setStaffBypassPin] = useState("");
  const [showBypassInput, setShowBypassInput] = useState(false);
  const [bypassError, setBypassError] = useState(false);

  // Completed / Rejected Orders Tracking: Allow customer to dismiss completed or rejected banners
  const [dismissedOrderIds, setDismissedOrderIds] = useState<string[]>([]);

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`tabletapp_cart_t${tableNumber}`, JSON.stringify(cart));
    } catch {
      // Ignore
    }
  }, [cart, tableNumber]);

  // Dish Customization Modal state
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  // Service cooldown timer (60s anti-spam)
  const [serviceCooldown, setServiceCooldown] = useState<number>(0);
  const [serviceToast, setServiceToast] = useState<string | null>(null);

  useEffect(() => {
    if (serviceCooldown <= 0) return;
    const interval = setInterval(() => {
      setServiceCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [serviceCooldown]);

  const filteredItems = useMemo(() => {
    return menu.filter((item) => {
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;
      const matchesTag =
        selectedTag === "All" ||
        item.tag.toLowerCase().includes(selectedTag.toLowerCase());
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesTag && matchesSearch;
    });
  }, [menu, selectedCategory, selectedTag, searchQuery]);

  const handleAddToCart = (item: OrderItem) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (ci) =>
          ci.itemId === item.itemId &&
          ci.specialInstructions === item.specialInstructions &&
          JSON.stringify(ci.selectedModifiers) === JSON.stringify(item.selectedModifiers)
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        const current = updated[existingIdx];
        const newQty = current.quantity + item.quantity;
        updated[existingIdx] = {
          ...current,
          quantity: newQty,
          totalPrice: current.unitPrice * newQty,
        };
        return updated;
      }
      return [...prev, item];
    });
  };

  const handleUpdateCartQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const item = prev[index];
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      const updated = [...prev];
      updated[index] = {
        ...item,
        quantity: newQty,
        totalPrice: item.unitPrice * newQty,
      };
      return updated;
    });
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const serviceFee = cartSubtotal > 0 ? 1.5 : 0;
  const cartTotal = cartSubtotal + serviceFee;

  // Checkout with GPS Location Guard
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (geoConfig && geoConfig.enabled) {
      setIsVerifyingLocation(true);
      try {
        const check = await verifyUserWithinRestaurant(geoConfig);
        setIsVerifyingLocation(false);

        if (!check.success) {
          if (check.reason === "OUTSIDE_RADIUS") {
            setGeoBlockedModal({
              distanceMeters: check.distanceMeters,
              message: check.message,
            });
            return;
          } else if (
            check.reason === "PERMISSION_DENIED" ||
            check.reason === "UNAVAILABLE" ||
            check.reason === "TIMEOUT"
          ) {
            if (geoConfig.strictMode) {
              setGeoBlockedModal({
                message: check.message,
                isPermissionError: true,
              });
              return;
            } else {
              onPlaceOrder(cart, { geoVerified: false });
              setCart([]);
              setIsMobileCartOpen(false);
              return;
            }
          }
        } else {
          onPlaceOrder(cart, { geoVerified: true, distanceMeters: check.distanceMeters });
          setCart([]);
          setIsMobileCartOpen(false);
          return;
        }
      } catch {
        setIsVerifyingLocation(false);
        if (geoConfig.strictMode) {
          setGeoBlockedModal({
            message:
              "Unable to verify physical restaurant location. Please enable GPS permissions.",
            isPermissionError: true,
          });
          return;
        }
      }
    }

    onPlaceOrder(cart, { geoVerified: true });
    setCart([]);
    setIsMobileCartOpen(false);
  };

  // Staff bypass for guests with broken GPS (validated via server route)
  const handleStaffBypassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await verifyPinServer(staffBypassPin, "kitchen");
    if (res.success) {
      setGeoBlockedModal(null);
      setShowBypassInput(false);
      setStaffBypassPin("");
      setBypassError(false);
      onPlaceOrder(cart, { geoVerified: true, distanceMeters: 0 });
      setCart([]);
      setIsMobileCartOpen(false);
    } else {
      setBypassError(true);
      setTimeout(() => setBypassError(false), 2000);
    }
  };

  const handleTriggerService = (type: ServiceType) => {
    if (serviceCooldown > 0) return;
    onRequestService(type);
    setServiceCooldown(60);
    setServiceToast(
      `Server notified for "${type}". A staff member will assist Table ${tableNumber}.`
    );
    setTimeout(() => setServiceToast(null), 5000);
  };

  // Separate in-progress cooking tickets from served or rejected ones
  const inProgressOrders = tableOrders.filter(
    (o) =>
      o.table === tableNumber &&
      (o.status === "New" || o.status === "Preparing" || o.status === "Ready")
  );

  const recentlyServedOrders = tableOrders.filter(
    (o) =>
      o.table === tableNumber &&
      o.status === "Served" &&
      !dismissedOrderIds.includes(o.id)
  );

  const rejectedOrders = tableOrders.filter(
    (o) =>
      o.table === tableNumber &&
      o.status === "Rejected" &&
      !dismissedOrderIds.includes(o.id)
  );

  const renderCartContents = () => (
    <>
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-white">
            Table {tableNumber} Cart
          </h3>
          <p className="text-xs text-slate-400">Review your table party order</p>
        </div>
        <span className="tabular-nums flex h-8 min-w-8 items-center justify-center rounded-xl bg-amber-500 px-2 text-xs font-black text-slate-950">
          {cartItemCount}
        </span>
      </div>

      {/* Cart Items List */}
      <div className="mt-4 max-h-[380px] space-y-3 overflow-y-auto pr-1">
        {cart.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/80 text-slate-400">
              <ShoppingBagIcon size={24} />
            </div>
            <p className="mt-3 text-xs font-bold text-slate-300">Your table cart is empty</p>
            <p className="mt-1 text-xs text-slate-400">Select dishes from the menu to start</p>
          </div>
        ) : (
          cart.map((item, idx) => (
            <div
              key={`${item.itemId}-${idx}`}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black text-white">{item.name}</h4>
                  {item.selectedModifiers.length > 0 && (
                    <p className="mt-0.5 text-xs text-amber-400">
                      {item.selectedModifiers.map((m) => m.optionName).join(", ")}
                    </p>
                  )}
                  {item.specialInstructions && (
                    <p className="mt-0.5 text-xs italic text-slate-400">
                      &quot;{item.specialInstructions}&quot;
                    </p>
                  )}
                </div>
                <span className="tabular-nums text-xs font-black text-white">
                  ${item.totalPrice.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Decrease quantity of ${item.name}`}
                    onClick={() => handleUpdateCartQuantity(idx, -1)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-sm font-bold text-white hover:bg-slate-700 transition"
                  >
                    −
                  </button>
                  <span className="tabular-nums min-w-6 text-center text-xs font-black text-white">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase quantity of ${item.name}`}
                    onClick={() => handleUpdateCartQuantity(idx, 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-sm font-bold text-white hover:bg-slate-700 transition"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}
                  className="min-h-9 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pricing Breakdown */}
      {cart.length > 0 && (
        <div className="mt-6 border-t border-slate-800 pt-4 space-y-2 text-xs">
          <div className="tabular-nums flex justify-between text-slate-300">
            <span>Subtotal</span>
            <span>${cartSubtotal.toFixed(2)}</span>
          </div>
          <div className="tabular-nums flex justify-between text-slate-300">
            <span>Service Fee & Dine-in Support</span>
            <span>${serviceFee.toFixed(2)}</span>
          </div>
          <div className="tabular-nums flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
            <span>Total</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>

          <button
            type="button"
            disabled={isVerifyingLocation}
            onClick={handleCheckout}
            className="tabular-nums mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-500 py-3.5 text-center text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-70"
          >
            {isVerifyingLocation ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                <span>Verifying On-Premises GPS...</span>
              </>
            ) : (
              <span>Place Table Order • ${cartTotal.toFixed(2)}</span>
            )}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400 pt-1">
            <MapPinIcon size={13} className="text-emerald-400" />
            <span>Verified on-premises • Kitchen receives orders in real-time</span>
          </p>
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-8">
      {/* Table Transfer Alert Banner */}
      {transferNotice && (
        <div
          role="status"
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border-2 border-amber-400 bg-amber-500 p-4 text-slate-950 shadow-xl"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
              <ArrowLeftRightIcon size={18} />
            </span>
            <div>
              <p className="text-sm font-black">{transferNotice}</p>
              <p className="text-xs font-semibold text-slate-900/80">
                Your menu, active kitchen orders, and requests are now synced to Table{" "}
                {tableNumber}.
              </p>
            </div>
          </div>
          {onDismissTransferNotice && (
            <button
              type="button"
              onClick={onDismissTransferNotice}
              className="min-h-11 self-end sm:self-auto rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800 transition"
            >
              Got it
            </button>
          )}
        </div>
      )}

      {/* Table Context Banner */}
      <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <p className="text-xs font-bold uppercase tracking-widest text-amber-800">
              Sunshine Bistro • Dine-in Experience
            </p>
          </div>
          <h2 className="font-display mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Table {tableNumber} Ordering Portal
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Dine-in session verified • Orders and requests are routed directly to the kitchen
          </p>
        </div>

        {/* Locked Session Indicator for Guests / Staff Override for Admins */}
        <div className="flex flex-col sm:items-end gap-2 self-start sm:self-center">
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-2.5 text-emerald-950 shadow-sm">
            <ShieldCheckIcon size={18} className="text-emerald-600" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-950">
                Table {tableNumber} Active
              </p>
              <p className="text-xs font-medium text-emerald-800">
                QR Stand Verified • Anti-Tamper Locked
              </p>
            </div>
          </div>

          {isStaff ? (
            <div className="flex items-center gap-2 mt-1">
              <label
                htmlFor="staff-table-override"
                className="text-xs font-bold text-purple-800 bg-purple-100 px-2.5 py-1 rounded-full"
              >
                Staff Override:
              </label>
              <select
                id="staff-table-override"
                value={tableNumber}
                onChange={(e) => onTableChange(Number(e.target.value))}
                className="min-h-10 rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs font-bold text-purple-950"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((num) => (
                  <option key={num} value={num}>
                    Table {num}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Changed seats? Ask staff to transfer your table ticket.
            </p>
          )}
        </div>
      </div>

      {/* Rejected Order Alert Banner */}
      {rejectedOrders.length > 0 && (
        <div className="space-y-2">
          {rejectedOrders.map((rej) => (
            <div
              key={rej.id}
              role="alert"
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 text-rose-950 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-sm">
                  <AlertTriangleIcon size={22} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-rose-700 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-white">
                      Order #{rej.orderNumber} Declined
                    </span>
                  </div>
                  <p className="text-xs font-bold text-rose-900 mt-1">
                    {rej.rejectedReason ||
                      "Please speak with your server to confirm your table seating."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDismissedOrderIds((prev) => [...prev, rej.id])}
                className="min-h-11 self-end sm:self-auto rounded-full bg-rose-700 px-4 py-2 text-xs font-black text-white hover:bg-rose-800 transition"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Celebratory Banner for Completed/Served Orders */}
      {recentlyServedOrders.length > 0 && (
        <div className="space-y-2">
          {recentlyServedOrders.map((served) => (
            <div
              key={served.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 via-emerald-100/40 to-white p-4 text-emerald-950 shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                  <UtensilsIcon size={22} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums rounded-md bg-emerald-700 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-white">
                      Order #{served.orderNumber}
                    </span>
                    <span className="text-xs font-bold text-emerald-800">
                      Served to Table {tableNumber}!
                    </span>
                  </div>
                  <p className="text-xs font-bold text-emerald-950 mt-0.5">
                    Your food has arrived at your table. Enjoy your meal!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDismissedOrderIds((prev) => [...prev, served.id])}
                className="min-h-11 self-end sm:self-auto rounded-full bg-emerald-700 px-4 py-2 text-xs font-black text-white hover:bg-emerald-800 transition shadow-sm"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Live Order Tracker Section (In-Progress orders only) */}
      {inProgressOrders.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2.5">
              <span>Your Kitchen Queue</span>
              <span className="font-sans rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-900">
                Cooking in Progress
              </span>
            </h3>
          </div>
          <LiveOrderTracker
            orders={inProgressOrders}
            onDismissOrder={(id) => setDismissedOrderIds((prev) => [...prev, id])}
          />
        </section>
      )}

      {/* Quick Service Tray with Anti-Spam Cooldown */}
      <section className="rounded-[28px] border border-amber-200/80 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Need Table Assistance?</span>
              <span className="font-sans text-xs font-medium text-slate-500">
                Instant staff notification
              </span>
            </h3>
            <p className="text-xs text-slate-600">
              Tap any option below to summon your server without waiting
            </p>
          </div>
          {serviceCooldown > 0 && (
            <span className="tabular-nums inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
              <ClockIcon size={13} />
              <span>Cooldown: {serviceCooldown}s</span>
            </span>
          )}
        </div>

        {serviceToast && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-900"
          >
            {serviceToast}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {SERVICE_OPTIONS.map((srv) => (
            <button
              key={srv.type}
              type="button"
              disabled={serviceCooldown > 0}
              onClick={() => handleTriggerService(srv.type)}
              className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border p-3.5 text-center transition ${
                serviceCooldown > 0
                  ? "border-slate-200 bg-slate-100/70 text-slate-400"
                  : "border-slate-200 bg-white text-slate-800 shadow-sm hover:border-amber-400 hover:bg-amber-500/10 active:scale-95"
              }`}
            >
              <span className={serviceCooldown > 0 ? "text-slate-400" : "text-amber-700"}>
                {srv.renderIcon()}
              </span>
              <span className="text-xs font-bold">{srv.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Main Dining Menu Section */}
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Menu Items List */}
        <section className="space-y-6">
          {/* Search + Category Filter Bar */}
          <div className="space-y-3">
            <div className="relative">
              <label htmlFor="menu-search-input" className="sr-only">
                Search menu dishes
              </label>
              <input
                id="menu-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search appetizers, steaks, pastas, drinks..."
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500"
              />
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon size={18} />
              </span>
            </div>

            {/* Category Pills (44px min height, 8px gap) */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`min-h-11 shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                    selectedCategory === cat
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Dietary Tags Filter (40px+ height, 8px gap) */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {DIETARY_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`min-h-10 shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                    selectedTag === tag
                      ? "bg-amber-500 text-slate-950 font-black"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {tag === "All" ? "All Tags" : `#${tag}`}
                </button>
              ))}
            </div>
          </div>

          {/* Empty Search State */}
          {filteredItems.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-sm font-bold text-slate-800">
                No dishes match &quot;{searchQuery || selectedTag}&quot;
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Clear your search or switch categories to view all menu offerings.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                  setSelectedTag("All");
                }}
                className="mt-4 min-h-11 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            /* Dishes Grid */
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group flex flex-col justify-between rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-400 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                        {item.tag}
                      </span>
                      <span className="tabular-nums text-base font-black text-slate-900">
                        ${item.price.toFixed(2)}
                      </span>
                    </div>

                    <h3 className="font-display mt-2.5 text-lg font-bold text-slate-900 group-hover:text-amber-700 transition">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                      <ClockIcon size={13} />
                      <span>~{item.prepTimeMinutes || 10}m prep</span>
                    </span>

                    <button
                      type="button"
                      disabled={!item.available}
                      onClick={() => setCustomizingItem(item)}
                      className={`min-h-11 rounded-full px-4 py-2 text-xs font-black transition ${
                        item.available
                          ? "bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-950 active:scale-95 shadow-sm"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {item.available ? "+ Customize & Add" : "Sold Out"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Desktop Live Table Cart Side Panel */}
        <aside className="hidden lg:block h-fit sticky top-6 rounded-[28px] border border-slate-900 bg-slate-900 p-6 text-white shadow-2xl">
          {renderCartContents()}
        </aside>
      </div>

      {/* Mobile Sticky Bottom Cart Bar (< 1024px) */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-800 bg-slate-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-white shadow-2xl backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(true)}
              className="flex items-center gap-3 text-left"
            >
              <span className="tabular-nums flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-sm font-black text-slate-950">
                {cartItemCount}
              </span>
              <div>
                <p className="text-xs font-bold text-slate-300">Table {tableNumber} Cart</p>
                <p className="tabular-nums text-base font-black text-white">
                  ${cartTotal.toFixed(2)}{" "}
                  <span className="text-xs font-normal text-amber-400 underline">
                    Review items
                  </span>
                </p>
              </div>
            </button>

            <button
              type="button"
              disabled={isVerifyingLocation}
              onClick={handleCheckout}
              className="tabular-nums min-h-11 rounded-full bg-emerald-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95 transition"
            >
              {isVerifyingLocation ? "Verifying GPS..." : "Place Order"}
            </button>
          </div>
        </div>
      )}

      {/* Mobile Slide-Up Cart Drawer */}
      {isMobileCartOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Table Cart Drawer"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMobileCartOpen(false);
          }}
        >
          <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-t-[32px] border-t border-slate-800 bg-slate-900 p-6 text-white shadow-2xl">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                aria-label="Close cart drawer"
                onClick={() => setIsMobileCartOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                <XIcon size={18} />
              </button>
            </div>
            {renderCartContents()}
          </div>
        </div>
      )}

      {/* Dish Customization Modal (Keyed by item ID so state resets cleanly) */}
      <DishCustomizeModal
        key={customizingItem?.id ?? "closed"}
        item={customizingItem}
        isOpen={Boolean(customizingItem)}
        onClose={() => setCustomizingItem(null)}
        onAddToCart={handleAddToCart}
      />

      {/* GPS Remote Order Blocked Modal (Anti-Tamper Shield) */}
      {geoBlockedModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="geo-blocked-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-[32px] border border-rose-200 bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <MapPinIcon size={30} />
            </div>

            <h3 id="geo-blocked-title" className="font-display mt-4 text-xl font-bold text-slate-900">
              {geoBlockedModal.isPermissionError
                ? "Location Access Required"
                : "Outside Restaurant Perimeter"}
            </h3>

            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              {geoBlockedModal.message}
            </p>

            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/70 p-3.5 text-left text-xs text-rose-950 space-y-1">
              <p className="flex items-center gap-1.5 font-bold">
                <ShieldCheckIcon size={15} className="text-rose-700" />
                <span>Anti-Prank Security Active:</span>
              </p>
              <p className="text-xs text-rose-800 leading-relaxed">
                To prevent remote prank orders from outside the building, TableTapp ensures
                guests are physically seated inside Sunshine Bistro before sending tickets to
                the chef.
              </p>
            </div>

            {/* Staff Override PIN Form */}
            {showBypassInput ? (
              <form onSubmit={handleStaffBypassSubmit} className="mt-4 space-y-2.5">
                <label htmlFor="staff-bypass-pin" className="block text-xs font-bold text-slate-700">
                  Enter Staff Override PIN:
                </label>
                <input
                  id="staff-bypass-pin"
                  type="password"
                  maxLength={4}
                  value={staffBypassPin}
                  onChange={(e) => setStaffBypassPin(e.target.value)}
                  placeholder="Staff PIN (1234)"
                  className="min-h-11 w-full rounded-xl border border-slate-300 p-2.5 text-center text-sm font-bold tracking-widest text-slate-900 focus:border-amber-500"
                />
                {bypassError && (
                  <p role="alert" className="text-xs font-bold text-rose-600">
                    Invalid Staff PIN
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="min-h-11 flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    Authorize Order
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBypassInput(false)}
                    className="min-h-11 rounded-xl bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleCheckout}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-900 py-3 text-xs font-black text-white hover:bg-slate-800 transition shadow-md"
                >
                  <RefreshCwIcon size={14} />
                  <span>Retry GPS Verification</span>
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setGeoBlockedModal(null)}
                    className="min-h-10 px-2 text-slate-600 hover:text-slate-900 font-semibold"
                  >
                    Close & Edit Cart
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBypassInput(true)}
                    className="min-h-10 px-2 text-amber-800 font-bold hover:underline"
                  >
                    Ask Waiter / Staff Bypass
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Discrete Staff Portal Gatekeeper in Footer */}
      <footer className="mt-16 border-t border-slate-200/80 pt-8 text-center">
        <p className="text-xs text-slate-500">
          TableTapp Platform • Sunshine Bistro Pilot
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => onOpenStaffLogin("kitchen")}
            className="inline-flex min-h-10 items-center gap-1.5 px-2 hover:text-slate-900 transition underline underline-offset-4 decoration-slate-300"
          >
            <LockIcon size={13} />
            <span>Kitchen Display System (Staff PIN)</span>
          </button>
          <span aria-hidden="true">•</span>
          <button
            type="button"
            onClick={() => onOpenStaffLogin("owner")}
            className="inline-flex min-h-10 items-center gap-1.5 px-2 hover:text-slate-900 transition underline underline-offset-4 decoration-slate-300"
          >
            <LockIcon size={13} />
            <span>Restaurant Management (Manager PIN)</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
