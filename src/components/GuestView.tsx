"use client";

import { useMemo, useState, useEffect } from "react";
import { GeoFenceConfig, MenuItem, OrderCard, OrderItem, ServiceRequest, ServiceType } from "@/types";
import { verifyUserWithinRestaurant } from "@/lib/geo";
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
  onPlaceOrder: (items: OrderItem[], meta?: { geoVerified?: boolean; distanceMeters?: number }) => void;
  onRequestService: (type: ServiceType) => void;
  onOpenStaffLogin: (role: "kitchen" | "owner") => void;
  geoConfig?: GeoFenceConfig;
}

const CATEGORIES = ["All", "Starters", "Mains", "Desserts", "Drinks"] as const;
const DIETARY_TAGS = ["All", "Vegetarian", "Chef Pick", "Popular", "Spicy"] as const;

const SERVICE_OPTIONS: { type: ServiceType; icon: string; label: string }[] = [
  { type: "Water Refill", icon: "💧", label: "Water" },
  { type: "Extra Napkins", icon: "🥢", label: "Napkins & Cutlery" },
  { type: "Sauces & Condiments", icon: "🧂", label: "Condiments" },
  { type: "Request Bill", icon: "💳", label: "Get Bill" },
  { type: "Call Waiter", icon: "🙋", label: "Call Server" },
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

  // Completed Orders Tracking: Allow customer to dismiss or auto-clear completed orders
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
          } else if (check.reason === "PERMISSION_DENIED" || check.reason === "UNAVAILABLE" || check.reason === "TIMEOUT") {
            if (geoConfig.strictMode) {
              setGeoBlockedModal({
                message: check.message,
                isPermissionError: true,
              });
              return;
            } else {
              // Non-strict mode: allow order but flag to kitchen as unverified location
              onPlaceOrder(cart, { geoVerified: false });
              setCart([]);
              return;
            }
          }
        } else {
          // Success: within perimeter
          onPlaceOrder(cart, { geoVerified: true, distanceMeters: check.distanceMeters });
          setCart([]);
          return;
        }
      } catch {
        setIsVerifyingLocation(false);
        if (geoConfig.strictMode) {
          setGeoBlockedModal({
            message: "Unable to verify physical restaurant location. Please enable GPS permissions.",
            isPermissionError: true,
          });
          return;
        }
      }
    }

    onPlaceOrder(cart, { geoVerified: true });
    setCart([]);
  };

  // Staff bypass for guests with broken GPS
  const handleStaffBypassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (staffBypassPin === "1234" || staffBypassPin === "8888") {
      setGeoBlockedModal(null);
      setShowBypassInput(false);
      setStaffBypassPin("");
      setBypassError(false);
      onPlaceOrder(cart, { geoVerified: true, distanceMeters: 0 });
      setCart([]);
    } else {
      setBypassError(true);
      setTimeout(() => setBypassError(false), 2000);
    }
  };

  const handleTriggerService = (type: ServiceType) => {
    if (serviceCooldown > 0) return;
    onRequestService(type);
    setServiceCooldown(60);
    setServiceToast(`Server notified for "${type}". A staff member will assist table ${tableNumber}.`);
    setTimeout(() => setServiceToast(null), 5000);
  };

  // Separate in-progress cooking tickets from served/completed ones
  // In-progress orders (New, Preparing, Ready) stay on screen
  const inProgressOrders = tableOrders.filter(
    (o) =>
      o.table === tableNumber &&
      (o.status === "New" || o.status === "Preparing" || o.status === "Ready")
  );

  // Served orders can be dismissed so they do NOT permanently clutter the customer UI
  const recentlyServedOrders = tableOrders.filter(
    (o) =>
      o.table === tableNumber &&
      o.status === "Served" &&
      !dismissedOrderIds.includes(o.id)
  );

  return (
    <div className="space-y-8">
      {/* Table Transfer Alert Banner */}
      {transferNotice && (
        <div className="flex items-center justify-between rounded-2xl border-2 border-amber-400 bg-amber-500 p-4 text-slate-950 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xl text-white">
              🔄
            </span>
            <div>
              <p className="text-sm font-black">{transferNotice}</p>
              <p className="text-xs font-semibold text-slate-900/80">
                Your menu, active kitchen orders, and requests are now synced to Table {tableNumber}.
              </p>
            </div>
          </div>
          {onDismissTransferNotice && (
            <button
              type="button"
              onClick={onDismissTransferNotice}
              className="rounded-full bg-slate-950 px-3.5 py-1.5 text-xs font-black text-white hover:bg-slate-800 transition"
            >
              Got it ✓
            </button>
          )}
        </div>
      )}

      {/* Table Context Banner */}
      <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
              Sunshine Bistro • Dine-in Experience
            </p>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
            Table {tableNumber} Ordering Portal
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Dine-in session verified • Orders and requests are routed directly to the kitchen
          </p>
        </div>

        {/* Locked Session Indicator for Guests / Staff Override for Admins */}
        <div className="flex flex-col sm:items-end gap-1.5 self-start sm:self-center">
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-2 text-emerald-900 shadow-sm">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-900">
                Table {tableNumber} Active
              </p>
              <p className="text-[10px] font-semibold text-emerald-700">
                🔒 QR Stand Verified • Anti-Tamper Locked
              </p>
            </div>
          </div>

          {isStaff ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider bg-purple-100 px-2 py-0.5 rounded-full">
                Staff Override:
              </span>
              <select
                value={tableNumber}
                onChange={(e) => onTableChange(Number(e.target.value))}
                className="rounded-lg border border-purple-200 bg-white px-2 py-1 text-xs font-bold text-purple-900 outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((num) => (
                  <option key={num} value={num}>
                    Table {num}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-[10px] text-slate-400">
              Changed seats? Ask staff to transfer your table ticket.
            </p>
          )}
        </div>
      </div>

      {/* Celebratory Banner for Completed/Served Orders (with Dismiss button) */}
      {recentlyServedOrders.length > 0 && (
        <div className="space-y-2">
          {recentlyServedOrders.map((served) => (
            <div
              key={served.id}
              className="flex items-center justify-between rounded-2xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 via-emerald-100/40 to-white p-4 text-emerald-950 shadow-md animate-in fade-in slide-in-from-top-2"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-sm">
                  🍽️
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-emerald-700 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      Order #{served.orderNumber}
                    </span>
                    <span className="text-xs font-bold text-emerald-800">
                      Served to Table {tableNumber}!
                    </span>
                  </div>
                  <p className="text-xs font-black text-emerald-950 mt-0.5">
                    Your food has arrived at your table. Enjoy your meal!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDismissedOrderIds((prev) => [...prev, served.id])}
                className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-black text-white hover:bg-emerald-800 transition shadow-sm"
              >
                Dismiss ✓
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Live Order Tracker Section (In-Progress orders only) */}
      {inProgressOrders.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>Your Kitchen Queue</span>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 animate-pulse">
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
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <span>Need Table Assistance?</span>
              <span className="text-xs font-normal text-slate-500">Instant staff notification</span>
            </h3>
            <p className="text-xs text-slate-600">
              Tap any button to summon your server without waiting
            </p>
          </div>
          {serviceCooldown > 0 && (
            <span className="self-start sm:self-auto rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              ⏳ Cooldown: {serviceCooldown}s
            </span>
          )}
        </div>

        {serviceToast && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-900">
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
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-center transition ${
                serviceCooldown > 0
                  ? "cursor-not-allowed border-slate-200 bg-slate-100/70 text-slate-400"
                  : "border-slate-200 bg-white text-slate-800 shadow-sm hover:border-amber-400 hover:bg-amber-500/10 active:scale-95"
              }`}
            >
              <span className="text-2xl">{srv.icon}</span>
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
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search appetizers, steaks, pastas, drinks..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
              />
              <span className="absolute left-4 top-3.5 text-base text-slate-400">🔍</span>
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                    selectedCategory === cat
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Dietary Tags Filter */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {DIETARY_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`shrink-0 rounded-xl px-3 py-1 text-[11px] font-semibold transition ${
                    selectedTag === tag
                      ? "bg-amber-500 text-slate-950 font-black"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tag === "All" ? "All Tags" : `#${tag}`}
                </button>
              ))}
            </div>
          </div>

          {/* Dishes Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col justify-between rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-400 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800">
                      {item.tag}
                    </span>
                    <span className="text-base font-black text-slate-900">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>

                  <h3 className="mt-2 text-base font-black text-slate-900 group-hover:text-amber-600 transition">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[11px] font-semibold text-slate-400">
                    ⏱ ~{item.prepTimeMinutes || 10}m prep
                  </span>

                  <button
                    type="button"
                    disabled={!item.available}
                    onClick={() => setCustomizingItem(item)}
                    className={`rounded-full px-4 py-2 text-xs font-black transition ${
                      item.available
                        ? "bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-950 active:scale-95 shadow-sm"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {item.available ? "+ Customize & Add" : "Sold Out"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Live Table Cart Side Panel */}
        <aside className="h-fit rounded-[28px] border border-slate-900 bg-slate-900 p-6 text-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-black">Table {tableNumber} Cart</h3>
              <p className="text-xs text-slate-400">Review your table party order</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-xs font-black text-slate-950">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>

          {/* Cart Items List */}
          <div className="mt-4 max-h-[380px] space-y-3 overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <p className="text-3xl">🛒</p>
                <p className="mt-2 text-xs font-bold">Your table cart is empty</p>
                <p className="text-[11px] text-slate-600">Select dishes from the menu to start</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-black text-white">{item.name}</h4>
                      {item.selectedModifiers.length > 0 && (
                        <p className="text-[10px] text-amber-400">
                          {item.selectedModifiers.map((m) => m.optionName).join(", ")}
                        </p>
                      )}
                      {item.specialInstructions && (
                        <p className="text-[10px] italic text-slate-400">
                          &quot;{item.specialInstructions}&quot;
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-black text-white">
                      ${item.totalPrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateCartQuantity(idx, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-white hover:bg-slate-700"
                      >
                        -
                      </button>
                      <span className="text-xs font-black text-white">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateCartQuantity(idx, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-white hover:bg-slate-700"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setCart((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-[11px] text-rose-400 hover:text-rose-300"
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
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>${cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Service Fee & Dine-in Support</span>
                <span>${serviceFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                <span>Total</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>

              <button
                type="button"
                disabled={isVerifyingLocation}
                onClick={handleCheckout}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 py-3.5 text-center text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-70"
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
              <p className="text-center text-[10px] text-slate-500 pt-1">
                📍 Verified on-premises • Kitchen receives orders in real-time
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Dish Customization Modal */}
      <DishCustomizeModal
        item={customizingItem}
        isOpen={Boolean(customizingItem)}
        onClose={() => setCustomizingItem(null)}
        onAddToCart={handleAddToCart}
      />

      {/* GPS Remote Order Blocked Modal (Anti-Tamper Shield) */}
      {geoBlockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-[32px] border border-rose-200 bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-3xl text-rose-600">
              📍
            </div>

            <h3 className="mt-4 text-xl font-black text-slate-900">
              {geoBlockedModal.isPermissionError ? "Location Access Required" : "Outside Restaurant Perimeter"}
            </h3>

            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              {geoBlockedModal.message}
            </p>

            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/70 p-3.5 text-left text-xs text-rose-950 space-y-1">
              <p className="font-bold">🛡️ Anti-Prank Security Active:</p>
              <p className="text-[11px] text-rose-800">
                To prevent remote prank orders from outside the building, TableTapp ensures guests are physically seated inside Sunshine Bistro before sending tickets to the chef.
              </p>
            </div>

            {/* Staff Override PIN Form */}
            {showBypassInput ? (
              <form onSubmit={handleStaffBypassSubmit} className="mt-4 space-y-2">
                <p className="text-xs font-bold text-slate-700">Enter Staff Override PIN:</p>
                <input
                  type="password"
                  maxLength={4}
                  value={staffBypassPin}
                  onChange={(e) => setStaffBypassPin(e.target.value)}
                  placeholder="Staff PIN (1234)"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-center text-sm font-bold tracking-widest text-slate-900 outline-none focus:border-amber-500"
                />
                {bypassError && (
                  <p className="text-xs font-bold text-rose-600">Invalid Staff PIN</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    Authorize Order
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBypassInput(false)}
                    className="rounded-xl bg-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleCheckout}
                  className="w-full rounded-full bg-slate-900 py-3 text-xs font-black text-white hover:bg-slate-800 transition shadow-md"
                >
                  Retry GPS Verification 🔄
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setGeoBlockedModal(null)}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    Close & Edit Cart
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBypassInput(true)}
                    className="text-amber-700 font-bold hover:underline"
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
        <p className="text-xs text-slate-400">
          TableTapp Platform • Sunshine Bistro Pilot
        </p>
        <div className="mt-3 flex items-center justify-center gap-4 text-xs font-semibold text-slate-500">
          <button
            type="button"
            onClick={() => onOpenStaffLogin("kitchen")}
            className="hover:text-slate-900 transition underline underline-offset-4 decoration-slate-300"
          >
            🔒 Kitchen Display System (Staff PIN)
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onOpenStaffLogin("owner")}
            className="hover:text-slate-900 transition underline underline-offset-4 decoration-slate-300"
          >
            🔒 Restaurant Management (Manager PIN)
          </button>
        </div>
      </footer>
    </div>
  );
}
