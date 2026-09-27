"use client";

import { useState } from "react";
import { GeoFenceConfig, MenuCategory, MenuItem, OrderCard, ServiceRequest } from "@/types";
import { getTokenForTable, rotateTokenForTable } from "@/lib/tables";
import { calculateDistanceMeters, DEFAULT_GEO_CONFIG } from "@/lib/geo";
import QRCodeView from "./QRCodeView";

interface OwnerViewProps {
  menu: MenuItem[];
  orders: OrderCard[];
  services: ServiceRequest[];
  geoConfig?: GeoFenceConfig;
  onUpdateMenu: (menu: MenuItem[]) => void;
  onUpdateGeoConfig?: (config: GeoFenceConfig) => void;
  onLockSession: () => void;
}

export default function OwnerView({
  menu,
  orders,
  services,
  geoConfig = DEFAULT_GEO_CONFIG,
  onUpdateMenu,
  onUpdateGeoConfig,
  onLockSession,
}: OwnerViewProps) {
  // Navigation subtabs inside Owner
  const [subTab, setSubTab] = useState<"menu" | "qr" | "analytics" | "security">("menu");

  // Selected table for QR code generator
  const [selectedTableForQr, setSelectedTableForQr] = useState<number>(1);
  const [domainUrl, setDomainUrl] = useState<string>("https://sunshinebistro.com");
  const [tokenVersion, setTokenVersion] = useState<number>(0);

  // GPS Security State
  const [geoForm, setGeoForm] = useState<GeoFenceConfig>(geoConfig);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsToast, setGpsToast] = useState<string | null>(null);
  const [testDistanceResult, setTestDistanceResult] = useState<string | null>(null);

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
  const totalSales = orders.reduce((sum, o) => sum + (o.status !== "Archived" && o.status !== "Rejected" ? o.total : 0), 0);
  const completedOrders = orders.filter((o) => o.status === "Served");
  const aov = orders.length > 0 ? totalSales / orders.length : 0;
  const activeTablesCount = new Set(orders.filter((o) => o.status !== "Served" && o.status !== "Archived" && o.status !== "Rejected").map((o) => o.table)).size;

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

  // Save edited item
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updated = menu.map((item) =>
      item.id === editingItem.id ? editingItem : item
    );
    onUpdateMenu(updated);
    setEditingItem(null);
  };

  // GPS Handlers
  const handleCaptureCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsCapturingGps(false);
        const { latitude, longitude } = pos.coords;
        setGeoForm((prev) => ({
          ...prev,
          latitude: Number(latitude.toFixed(6)),
          longitude: Number(longitude.toFixed(6)),
        }));
        setGpsToast(`Captured current coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setTimeout(() => setGpsToast(null), 4000);
      },
      (err) => {
        setIsCapturingGps(false);
        alert(`Failed to get location: ${err.message}. Ensure location permissions are granted.`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSaveGeoSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateGeoConfig) {
      onUpdateGeoConfig(geoForm);
      setGpsToast("GPS Geofence security settings updated successfully!");
      setTimeout(() => setGpsToast(null), 4000);
    }
  };

  const handleTestDistance = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const dist = calculateDistanceMeters(
        pos.coords.latitude,
        pos.coords.longitude,
        geoForm.latitude,
        geoForm.longitude
      );
      if (dist <= geoForm.radiusMeters) {
        setTestDistanceResult(`✅ You are WITHIN the geofence! (Distance: ${dist} meters, Limit: ${geoForm.radiusMeters}m)`);
      } else {
        setTestDistanceResult(`❌ You are OUTSIDE the geofence! (Distance: ${dist >= 1000 ? (dist / 1000).toFixed(2) + " km" : dist + " meters"})`);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Owner Header */}
      <header className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-amber-500" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
              Sunshine Bistro • Executive Management
            </p>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
            Restaurant Owner Suite
          </h2>
          <p className="text-xs text-slate-500">
            Control live menu pricing, stock availability, table QR stands, and anti-tamper geofencing
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
              onClick={() => setSubTab("security")}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                subTab === "security" ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📍 GPS & Anti-Tamper
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
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Live Revenue</p>
          <p className="mt-2 text-3xl font-black text-slate-900">${totalSales.toFixed(2)}</p>
          <span className="mt-1 text-[11px] font-semibold text-emerald-600">Active dining session</span>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Orders Placed</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{orders.length}</p>
          <span className="mt-1 text-[11px] font-semibold text-slate-500">{completedOrders.length} completed</span>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Order Value (AOV)</p>
          <p className="mt-2 text-3xl font-black text-slate-900">${aov.toFixed(2)}</p>
          <span className="mt-1 text-[11px] font-semibold text-slate-500">Per table order</span>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Occupied Tables</p>
          <p className="mt-2 text-3xl font-black text-amber-600">{activeTablesCount} / 16</p>
          <span className="mt-1 text-[11px] font-semibold text-slate-500">{16 - activeTablesCount} available</span>
        </div>
      </div>

      {/* Subtab 1: Menu Manager */}
      {subTab === "menu" && (
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Menu Items Table */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Live Restaurant Menu</h3>
                <p className="text-xs text-slate-500">Toggle availability or modify dish specs</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {menu.length} Dishes Registered
              </span>
            </div>

            <div className="mt-6 divide-y divide-slate-100">
              {menu.map((dish) => (
                <div key={dish.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 font-black text-sm">
                      {dish.category[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900">{dish.name}</h4>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {dish.category}
                        </span>
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          {dish.tag}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{dish.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm font-black text-slate-900">
                      ${dish.price.toFixed(2)}
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleAvailability(dish.id)}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                        dish.available
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                      }`}
                    >
                      {dish.available ? "In Stock" : "Sold Out"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingItem(dish)}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(dish.id)}
                      className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Add Dish Form */}
          <div className="h-fit rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-slate-900">Add New Dish</h3>
            <p className="text-xs text-slate-500">Instantly publishes to guest menus</p>

            <form onSubmit={handleAddItem} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Dish Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Truffle Mushroom Risotto"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                    placeholder="18.50"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Tag / Badge</label>
                  <input
                    type="text"
                    placeholder="Chef Pick"
                    value={form.tag}
                    onChange={(e) => setForm({ ...form, tag: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Prep Time (mins)</label>
                  <input
                    type="number"
                    value={form.prepTime}
                    onChange={(e) => setForm({ ...form, prepTime: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  placeholder="Ingredients, preparation style..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-slate-900 py-3 text-xs font-black text-white hover:bg-slate-800 transition shadow-md"
              >
                + Add Dish to Live Menu
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Subtab 2: QR Generator & Stands */}
      {subTab === "qr" && (
        <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-slate-900">QR Code Customizer</h3>
            <p className="text-xs text-slate-500">
              Generate cryptographic QR codes with tamper-resistant tokens
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700">Select Table Stand</label>
              <select
                value={selectedTableForQr}
                onChange={(e) => setSelectedTableForQr(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900 outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((num) => (
                  <option key={num} value={num}>
                    Table {num} Stand
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Production Base URL</label>
              <input
                type="text"
                value={domainUrl}
                onChange={(e) => setDomainUrl(e.target.value)}
                placeholder="https://yourdomain.com"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono text-slate-900 outline-none focus:border-amber-500"
              />
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 space-y-1 text-xs">
              <span className="font-bold text-slate-700">Active QR Stand Token:</span>
              <p className="font-mono text-[11px] text-amber-700 break-all">{currentToken}</p>
              <p className="text-[10px] text-slate-400 pt-1">
                Resolved URL: <span className="font-mono">{currentQrUrl}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleRotateToken}
              className="w-full rounded-full border border-amber-300 bg-amber-50 py-2.5 text-xs font-black text-amber-900 hover:bg-amber-100 transition"
            >
              🔄 Rotate Token (Invalidates Old Stand)
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="w-full rounded-full bg-slate-900 py-3 text-xs font-black text-white hover:bg-slate-800 transition shadow-md"
            >
              🖨️ Print Acrylic Stand Card
            </button>
          </div>

          {/* Scannable Physical Tent Card Preview */}
          <div className="space-y-4">
            <div className="rounded-[28px] border-2 border-dashed border-amber-300 bg-gradient-to-b from-[#fffaf1] to-white p-8 text-center shadow-lg">
              <div className="inline-block rounded-2xl bg-amber-500 px-4 py-1 text-xs font-black uppercase tracking-widest text-slate-950 mb-4">
                Sunshine Bistro Table Stand
              </div>

              <h2 className="text-3xl font-black tracking-tight text-slate-900">
                TABLE {selectedTableForQr}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Scan with your smartphone camera to view live menu & order
              </p>

              <div className="my-6 flex justify-center">
                <div className="rounded-3xl border-4 border-slate-900 bg-white p-6 shadow-2xl">
                  <QRCodeView value={currentQrUrl} size={220} />
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700">
                <span>🔒 Cryptographically Locked Stand</span>
                <span>•</span>
                <span className="font-mono text-[10px]">{currentToken}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
              <p className="font-bold">💡 Production Deployment Tip:</p>
              <p className="mt-1 leading-relaxed">
                When deploying live on Vercel, set your Vercel URL above (e.g. <code className="font-mono">https://tabletapp-xxx.vercel.app</code>) and print your batch of table stands.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 3: GPS Geofence & Anti-Tamper Security */}
      {subTab === "security" && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-xl font-black text-slate-900">📍 GPS Geofencing & Anti-Tamper Security</h3>
              <p className="text-xs text-slate-500">
                Prevents remote prank orders from outside the restaurant by verifying the guest is physically seated on-premises
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                geoForm.enabled
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {geoForm.enabled ? "Geofence ACTIVE" : "Geofence DISABLED"}
            </span>
          </div>

          {gpsToast && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-900">
              {gpsToast}
            </div>
          )}

          <form onSubmit={handleSaveGeoSettings} className="space-y-6 max-w-2xl">
            {/* Geofence Toggle */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-black text-slate-900">Enable GPS Geofencing Guard</p>
                <p className="text-xs text-slate-500">
                  When enabled, customers must be within the restaurant perimeter to place orders.
                </p>
              </div>
              <input
                type="checkbox"
                checked={geoForm.enabled}
                onChange={(e) => setGeoForm({ ...geoForm, enabled: e.target.checked })}
                className="h-6 w-6 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
            </div>

            {/* Strict Mode Toggle */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-black text-slate-900">Strict Enforcement Mode</p>
                <p className="text-xs text-slate-500">
                  {geoForm.strictMode
                    ? "Strict: Completely block orders from outside perimeter."
                    : "Permissive: Allow orders but flag ticket in KDS with ⚠️ Remote Order warning."}
                </p>
              </div>
              <input
                type="checkbox"
                checked={geoForm.strictMode}
                onChange={(e) => setGeoForm({ ...geoForm, strictMode: e.target.checked })}
                className="h-6 w-6 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
            </div>

            {/* Coordinates Config */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700">Restaurant Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={geoForm.latitude}
                  onChange={(e) => setGeoForm({ ...geoForm, latitude: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-mono outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Restaurant Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={geoForm.longitude}
                  onChange={(e) => setGeoForm({ ...geoForm, longitude: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-mono outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Allowed Perimeter Radius */}
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Allowed Radius: {geoForm.radiusMeters} meters
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Distance radius from restaurant center (covers tables, patio, and terrace)
              </p>
              <div className="flex gap-2">
                {[50, 100, 150, 250, 500].map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    onClick={() => setGeoForm({ ...geoForm, radiusMeters: radius })}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                      geoForm.radiusMeters === radius
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {radius}m
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Location Capture & Test Tools */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                disabled={isCapturingGps}
                onClick={handleCaptureCurrentLocation}
                className="flex items-center gap-2 rounded-full border border-amber-400 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-950 hover:bg-amber-100 transition shadow-sm"
              >
                <span>🎯</span>
                <span>{isCapturingGps ? "Capturing GPS..." : "Set to My Current GPS Location"}</span>
              </button>

              <button
                type="button"
                onClick={handleTestDistance}
                className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition"
              >
                <span>📏</span>
                <span>Test My Distance Now</span>
              </button>
            </div>

            {testDistanceResult && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-bold text-blue-900">
                {testDistanceResult}
              </div>
            )}

            <div className="border-t border-slate-100 pt-4">
              <button
                type="submit"
                className="rounded-full bg-slate-900 px-6 py-3 text-xs font-black text-white hover:bg-slate-800 transition shadow-md"
              >
                Save Geofence Settings ✓
              </button>
            </div>
          </form>

          {/* Explanation Banner */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950 space-y-2">
            <p className="font-bold">🛡️ How This Solves The "Photo of QR Code" Prank:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700 leading-relaxed">
              <li>When a customer scans a table QR code and takes a photo home, they are miles away from the restaurant.</li>
              <li>When they tap "Place Order" from home, their phone&apos;s GPS reports their location, TableTapp detects they are outside the {geoForm.radiusMeters}m perimeter, and blocks the order ticket.</li>
              <li>You never have to reprint physical acrylic stand QR codes!</li>
            </ul>
          </div>
        </div>
      )}

      {/* Subtab 4: Analytics */}
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
                        : order.status === "Rejected"
                          ? "bg-rose-100 text-rose-800"
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
