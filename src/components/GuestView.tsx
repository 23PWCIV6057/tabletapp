"use client";

import { useMemo, useState, useEffect } from "react";
import { MenuItem, OrderCard, OrderItem, ServiceRequest, ServiceType } from "@/types";
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
  onPlaceOrder: (items: OrderItem[]) => void;
  onRequestService: (type: ServiceType) => void;
  onOpenStaffLogin: (role: "kitchen" | "owner") => void;
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

  // Filtered menu
  const filteredMenu = useMemo(() => {
    return menu.filter((item) => {
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;
      const matchesTag =
        selectedTag === "All" ||
        item.tag.toLowerCase().includes(selectedTag.toLowerCase());
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesTag && matchesSearch;
    });
  }, [menu, selectedCategory, selectedTag, searchQuery]);

  // Cart operations
  const handleAddToCart = (orderItem: OrderItem) => {
    setCart((prev) => [...prev, orderItem]);
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

  const handleCheckout = () => {
    if (cart.length === 0) return;
    onPlaceOrder(cart);
    setCart([]);
  };

  const handleTriggerService = (type: ServiceType) => {
    if (serviceCooldown > 0) return;
    onRequestService(type);
    setServiceCooldown(60);
    setServiceToast(`Server notified for "${type}". A staff member will assist table ${tableNumber}.`);
    setTimeout(() => setServiceToast(null), 5000);
  };

  const activeOrdersForTable = tableOrders.filter(
    (o) => o.table === tableNumber && o.status !== "Archived"
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

      {/* Live Order Tracker Section (if guest placed orders) */}
      {activeOrdersForTable.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>Your Placed Orders</span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                Live Kitchen Sync
              </span>
            </h3>
          </div>
          <LiveOrderTracker orders={activeOrdersForTable} />
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
            <span className="self-start rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
              ⏳ Cooldown: {serviceCooldown}s left
            </span>
          )}
        </div>

        {serviceToast && (
          <div className="mt-3 rounded-2xl bg-emerald-600 p-3 text-xs font-bold text-white shadow-md transition-all">
            {serviceToast}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {SERVICE_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              disabled={serviceCooldown > 0}
              onClick={() => handleTriggerService(opt.type)}
              className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition ${
                serviceCooldown > 0
                  ? "border-slate-200 bg-slate-100/60 opacity-60 cursor-not-allowed"
                  : "border-amber-300/60 bg-white hover:border-amber-500 hover:bg-amber-50/50 hover:shadow-sm active:scale-95"
              }`}
            >
              <span className="text-xl">{opt.icon}</span>
              <span className="mt-1 text-xs font-bold text-slate-800">{opt.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Menu & Cart Grid */}
      <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
        {/* Left Column: Menu Browsing */}
        <div className="space-y-6">
          {/* Search & Category Pills */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes, burgers, pasta, drinks..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-amber-500 focus:bg-white"
              />
              <span className="absolute left-4 top-3.5 text-slate-400 text-sm">🔍</span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-3 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                    selectedCategory === cat
                      ? "bg-slate-900 text-white shadow"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Dietary Filter Chips */}
            <div className="flex items-center gap-2 border-t border-slate-100 pt-3 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Filter:
              </span>
              {DIETARY_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`rounded-full px-3 py-1 font-semibold transition shrink-0 ${
                    selectedTag === tag
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Dishes List */}
          <div className="space-y-4">
            {filteredMenu.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-3xl">🍽️</p>
                <p className="mt-2 text-base font-bold text-slate-700">No dishes found</p>
                <p className="text-xs text-slate-400">
                  Try clearing your search query or dietary filters
                </p>
              </div>
            ) : (
              filteredMenu.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-[26px] border p-4 sm:p-5 transition ${
                    item.available
                      ? "border-slate-200 bg-white shadow-sm hover:border-amber-300 hover:shadow-md"
                      : "border-slate-200 bg-slate-50/80 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {/* Visual Dish Accent Box */}
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 text-2xl text-white shadow-sm font-black">
                      {item.category === "Drinks"
                        ? "🍹"
                        : item.category === "Desserts"
                          ? "🍰"
                          : item.category === "Starters"
                            ? "🥗"
                            : "🥩"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-black text-slate-900">{item.name}</h4>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {item.tag}
                        </span>
                        {!item.available && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            Sold Out
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                      {item.prepTimeMinutes && (
                        <p className="mt-1 text-[11px] font-medium text-slate-400">
                          ⏱ Prep time: ~{item.prepTimeMinutes} mins
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full sm:w-auto sm:flex-col sm:items-end gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    <span className="text-xl font-black text-slate-900">
                      ${item.price.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      disabled={!item.available}
                      onClick={() => setCustomizingItem(item)}
                      className={`rounded-full px-4 py-2 text-xs font-black shadow-sm transition ${
                        item.available
                          ? "bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95"
                          : "bg-slate-200 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      {item.modifierGroups && item.modifierGroups.length > 0
                        ? "+ Customize"
                        : "+ Add to Cart"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Sticky Cart Drawer */}
        <aside className="h-fit rounded-[32px] border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl lg:sticky lg:top-8">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-black tracking-tight">Your Table Order</h3>
              <p className="text-xs text-slate-400">Table {tableNumber}</p>
            </div>
            <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-400">
              {cart.reduce((s, i) => s + i.quantity, 0)} items
            </span>
          </div>

          <div className="mt-4 max-h-[420px] overflow-y-auto space-y-3 pr-1">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <span className="text-3xl">🛒</span>
                <p className="mt-2 text-sm font-semibold">Your cart is empty</p>
                <p className="text-xs text-slate-500">
                  Select dishes from the menu to start ordering
                </p>
              </div>
            ) : (
              cart.map((item, index) => (
                <div key={index} className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="text-sm font-bold text-white">{item.name}</h5>
                      {item.selectedModifiers.length > 0 && (
                        <p className="text-[11px] text-amber-400/90">
                          {item.selectedModifiers.map((m) => m.optionName).join(", ")}
                        </p>
                      )}
                      {item.specialInstructions && (
                        <p className="text-[10px] italic text-slate-400">
                          &quot;{item.specialInstructions}&quot;
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-white">
                      ${item.totalPrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                    <div className="flex items-center gap-2 rounded-full bg-slate-800 px-2 py-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateCartQuantity(index, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white hover:bg-slate-600"
                      >
                        −
                      </button>
                      <span className="min-w-4 text-center text-xs font-bold text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateCartQuantity(index, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white hover:bg-slate-600"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpdateCartQuantity(index, -item.quantity)}
                      className="text-[11px] text-slate-500 hover:text-rose-400"
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
                onClick={handleCheckout}
                className="mt-4 w-full rounded-full bg-emerald-500 py-3.5 text-center text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400 active:scale-[0.99]"
              >
                Place Table Order • ${cartTotal.toFixed(2)}
              </button>
              <p className="text-center text-[10px] text-slate-500 pt-1">
                Orders are sent directly to the kitchen. Pay at counter or upon bill request.
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
