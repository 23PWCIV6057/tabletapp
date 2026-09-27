"use client";

import { useState } from "react";
import { MenuCategory, MenuItem, OrderCard, ServiceRequest } from "@/types";
import { getTokenForTable, rotateTokenForTable } from "@/lib/tables";
import QRCodeView from "./QRCodeView";

interface OwnerViewProps {
  menu: MenuItem[];
  orders: OrderCard[];
  services: ServiceRequest[];
  onUpdateMenu: (menu: MenuItem[]) => void;
  onLockSession: () => void;
}

export default function OwnerView({
  menu,
  orders,
  services,
  onUpdateMenu,
  onLockSession,
}: OwnerViewProps) {
  // Navigation subtabs inside Owner
  const [subTab, setSubTab] = useState<"menu" | "qr" | "analytics">("menu");

  // Selected table for QR code generator
  const [selectedTableForQr, setSelectedTableForQr] = useState<number>(1);
  const [domainUrl, setDomainUrl] = useState<string>("https://sunshinebistro.com");
  const [tokenVersion, setTokenVersion] = useState<number>(0);

  const currentToken = getTokenForTable(selectedTableForQr);
  const currentQrUrl = `${domainUrl}/t/${currentToken}`;

  const handleRotateToken = () => {
    if (confirm(`Rotate security token for Table ${selectedTableForQr}? Any previously photographed QR codes will immediately become invalid.`)) {
      rotateTokenForTable(selectedTableForQr);
      setTokenVersion((v) => v + 1);
    }
  };

  // Add Item Form State
  const [form, setForm] = useState({
    name: "",
    category: "Starters" as MenuCategory,
    price: "",
    tag: "Popular",
    description: "",
    prepTime: "10",
  });

  // Edit Item Modal State
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Dynamic Metrics Calculation
  const totalSales = orders.reduce((sum, o) => sum + (o.status !== "Archived" ? o.total : 0), 0);
  const completedOrders = orders.filter((o) => o.status === "Served" || o.status === "Ready");
  const aov = orders.length > 0 ? totalSales / orders.length : 0;
  const activeTablesCount = new Set(orders.filter((o) => o.status !== "Served" && o.status !== "Archived").map((o) => o.table)).size;

  // Toggle availability
  const toggleAvailability = (itemId: number) => {
    const updated = menu.map((item) =>
      item.id === itemId ? { ...item, available: !item.available } : item
    );
    onUpdateMenu(updated);
  };

  // Delete item
  const handleDeleteItem = (itemId: number) => {
    if (confirm("Are you sure you want to remove this dish from the active menu?")) {
      const updated = menu.filter((item) => item.id !== itemId);
      onUpdateMenu(updated);
    }
  };

  // Add new item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) return;

    const newItem: MenuItem = {
      id: Date.now(),
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price),
      tag: form.tag.trim() || "New",
      description: form.description.trim() || "Chef's specialty made fresh daily.",
      prepTimeMinutes: Number(form.prepTime) || 10,
      available: true,
    };

    onUpdateMenu([newItem, ...menu]);
    setForm({
      name: "",
      category: "Starters",
      price: "",
      tag: "Popular",
      description: "",
      prepTime: "10",
    });
  };

  // Save Edit Item
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updated = menu.map((m) => (m.id === editingItem.id ? editingItem : m));
    onUpdateMenu(updated);
    setEditingItem(null);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with Navigation and Lock */}
      <header className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-black text-purple-800">
              Manager Authenticated
            </span>
            <span className="text-xs font-bold text-slate-400">Sunshine Bistro System</span>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
            Restaurant Owner Suite
          </h2>
          <p className="text-xs text-slate-500">
            Control live menu pricing, stock availability, and table QR code generation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setSubTab("menu")}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                subTab === "menu" ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Menu Manager
            </button>
            <button
              type="button"
              onClick={() => setSubTab("qr")}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                subTab === "qr" ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              QR Generator & Stands
            </button>
            <button
              type="button"
              onClick={() => setSubTab("analytics")}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                subTab === "analytics" ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Analytics
            </button>
          </div>

          <button
            type="button"
            onClick={onLockSession}
            className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
          >
            🔒 Lock Suite
          </button>
        </div>
      </header>

      {/* Overview Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Today&apos;s Gross Sales</p>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900">${totalSales.toFixed(2)}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
              Live
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">From {orders.length} table orders</p>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Avg. Order Value (AOV)</p>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900">${aov.toFixed(2)}</span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
              Target $30+
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Average ticket per dining table</p>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Tables Dining</p>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900">{activeTablesCount}</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              Dining now
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Tables with unarchived tickets</p>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Menu Offerings</p>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900">{menu.length} Dishes</span>
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800">
              {menu.filter((m) => m.available).length} In Stock
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {menu.filter((m) => !m.available).length} Marked Sold Out
          </p>
        </div>
      </div>

      {/* Subtab 1: Menu Management */}
      {subTab === "menu" && (
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Active Dishes List */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Active Menu Items</h3>
                <p className="text-xs text-slate-500">
                  Manage live prices and instant &quot;Sold Out&quot; status for guests
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {menu.length} total
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {menu.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-slate-200 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900">{item.name}</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {item.category}
                      </span>
                      <span className="text-xs font-bold text-emerald-700">
                        ${item.price.toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-1">{item.description}</p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Availability Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleAvailability(item.id)}
                      className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider transition ${
                        item.available
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                      }`}
                    >
                      {item.available ? "In Stock ✓" : "Sold Out ✕"}
                    </button>

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => setEditingItem(item)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Delete dish"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Dish Form */}
          <div className="h-fit rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-black text-slate-900">Add New Dish</h3>
            <p className="text-xs text-slate-500">
              Instantly publishes to all guest phones in real time
            </p>

            <form onSubmit={handleAddItem} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Dish Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Black Truffle Risotto"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as MenuCategory })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:border-amber-500"
                  >
                    <option value="Starters">Starters</option>
                    <option value="Mains">Mains</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Drinks">Drinks</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Price ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="18.50"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Tag / Badge</label>
                  <input
                    type="text"
                    value={form.tag}
                    onChange={(e) => setForm({ ...form, tag: e.target.value })}
                    placeholder="Popular, Chef Pick, etc."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Est. Prep Time (min)</label>
                  <input
                    type="number"
                    value={form.prepTime}
                    onChange={(e) => setForm({ ...form, prepTime: e.target.value })}
                    placeholder="12"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ingredients, preparation details, flavor profile..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-slate-900 py-3 text-sm font-black text-white shadow-md transition hover:bg-slate-800 active:scale-95"
              >
                + Add Dish to Live Menu
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Subtab 2: Dynamic QR Generator & Print Stands */}
      {subTab === "qr" && (
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* QR Stand Preview */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Table QR Stand Preview</h3>
                <p className="text-xs text-slate-500">
                  Ready to print for acrylic table tents or laminated cards
                </p>
              </div>
              <button
                type="button"
                onClick={handlePrint}
                className="rounded-full bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 shadow transition hover:bg-amber-400 active:scale-95"
              >
                🖨️ Print Table Stand
              </button>
            </div>

            {/* Tent Card Display */}
            <div className="mt-8 flex justify-center">
              <div
                id="printable-qr-stand"
                className="w-full max-w-sm rounded-[32px] border-4 border-slate-900 bg-white p-8 text-center shadow-xl"
              >
                <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-600">
                  Sunshine Bistro
                </p>
                <h1 className="mt-1 text-3xl font-black text-slate-950">
                  Table {selectedTableForQr}
                </h1>
                <p className="mt-1 text-xs text-slate-500">
                  Scan with your smartphone camera to browse menu & order directly
                </p>

                <div className="my-6 flex justify-center">
                  <QRCodeView
                    value={currentQrUrl}
                    size={220}
                    label={`Token: ${currentToken}`}
                  />
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-600 font-semibold">
                  ✨ Encrypted Table Stand • Anti-Tamper Token Protected
                </div>
              </div>
            </div>
          </div>

          {/* QR Configuration Controls */}
          <div className="h-fit rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <h3 className="text-xl font-black text-slate-900">QR Configuration</h3>

            <div>
              <label className="block text-xs font-bold text-slate-700">Select Table Number</label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSelectedTableForQr(num)}
                    className={`rounded-xl py-2.5 text-xs font-black transition ${
                      selectedTableForQr === num
                        ? "bg-slate-900 text-white shadow"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Table {num}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Restaurant Web Domain</label>
              <input
                type="text"
                value={domainUrl}
                onChange={(e) => setDomainUrl(e.target.value)}
                placeholder="https://sunshinebistro.com"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:border-amber-500 focus:bg-white"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                This URL is encoded into each table&apos;s physical QR code stand.
              </p>
            </div>

            {/* Anti-Prank Security Controls */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Table {selectedTableForQr} Security Token
                  </h4>
                  <p className="text-[11px] font-mono text-amber-700 font-bold mt-0.5">
                    {currentToken}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRotateToken}
                  className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition shadow-sm"
                  title="Generate a new unguessable token for this table"
                >
                  🔄 Rotate Token
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Rotating invalidates any previously photographed QR codes. Guests cannot tamper with URLs to order from another table.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
              <p className="font-bold">💡 Production Deployment Tip:</p>
              <p className="mt-1 leading-relaxed">
                When deploying live on Vercel or your custom domain, set the domain above and print a batch of stands for your tables. Guests scanning will automatically open with their table pre-selected.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 3: Analytics */}
      {subTab === "analytics" && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-xl font-black text-slate-900">Real-Time Dining Analytics</h3>
              <p className="text-xs text-slate-500">
                Live performance metrics from today&apos;s service
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              {completedOrders.length} Fulfilled Orders
            </span>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Recent Table Orders
            </h4>
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-xs"
              >
                <div>
                  <span className="font-black text-slate-900">Table {order.table}</span> •{" "}
                  <span className="text-slate-500">#{order.orderNumber}</span> •{" "}
                  <span className="text-slate-700">
                    {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">${order.total.toFixed(2)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      order.status === "Served"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Edit Dish</h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Name</label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Price ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Tag</label>
                  <input
                    type="text"
                    value={editingItem.tag}
                    onChange={(e) => setEditingItem({ ...editingItem, tag: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows={3}
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div className="mt-5 flex gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 rounded-full border border-slate-200 bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-full bg-slate-900 py-2.5 text-xs font-black text-white hover:bg-slate-800"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
