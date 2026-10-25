"use client";

import { useEffect, useState } from "react";
import { GeoFenceConfig, MenuCategory, MenuItem, OrderCard, ServiceRequest } from "@/types";
import { getTokenForTable, rotateTokenForTable } from "@/lib/tables";
import { calculateDistanceMeters, DEFAULT_GEO_CONFIG } from "@/lib/geo";
import {
  CheckCircleIcon,
  LockIcon,
  MapPinIcon,
  PrinterIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  XIcon,
} from "./Icons";
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
  geoConfig = DEFAULT_GEO_CONFIG,
  onUpdateMenu,
  onUpdateGeoConfig,
  onLockSession,
}: OwnerViewProps) {
  const [subTab, setSubTab] = useState<"menu" | "qr" | "analytics" | "security">("menu");

  // Selected table for QR code generator
  const [selectedTableForQr, setSelectedTableForQr] = useState<number>(1);
  const [domainUrl, setDomainUrl] = useState<string>("https://sunshinebistro.com");
  const [, setTokenVersion] = useState<number>(0);

  // GPS Security State
  const [geoForm, setGeoForm] = useState<GeoFenceConfig>(geoConfig);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsToast, setGpsToast] = useState<string | null>(null);
  const [testDistanceResult, setTestDistanceResult] = useState<{
    within: boolean;
    text: string;
  } | null>(null);

  const currentToken = getTokenForTable(selectedTableForQr);
  const currentQrUrl = `${domainUrl.replace(/\/$/, "")}/t/${currentToken}`;

  const handleRotateToken = () => {
    if (
      confirm(
        `Rotate security token for Table ${selectedTableForQr}? Any previously photographed QR codes will immediately become invalid.`
      )
    ) {
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

  useEffect(() => {
    if (!editingItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditingItem(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingItem]);

  // Dynamic Metrics Calculation: All non-rejected orders count towards revenue
  const validOrders = orders.filter((o) => o.status !== "Rejected");
  const totalSales = validOrders.reduce((sum, o) => sum + o.total, 0);
  const completedOrders = orders.filter(
    (o) => o.status === "Served" || o.status === "Archived"
  );
  const aov = validOrders.length > 0 ? totalSales / validOrders.length : 0;
  const activeTablesCount = new Set(
    orders
      .filter(
        (o) => o.status !== "Served" && o.status !== "Archived" && o.status !== "Rejected"
      )
      .map((o) => o.table)
  ).size;

  const toggleAvailability = (itemId: number) => {
    const updated = menu.map((item) =>
      item.id === itemId ? { ...item, available: !item.available } : item
    );
    onUpdateMenu(updated);
  };

  const handleDeleteItem = (itemId: number) => {
    if (confirm("Are you sure you want to remove this dish from the active menu?")) {
      const updated = menu.filter((item) => item.id !== itemId);
      onUpdateMenu(updated);
    }
  };

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
        setGpsToast(
          `Captured current coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        );
        setTimeout(() => setGpsToast(null), 4000);
      },
      (err) => {
        setIsCapturingGps(false);
        alert(
          `Failed to get location: ${err.message}. Ensure location permissions are granted.`
        );
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
        setTestDistanceResult({
          within: true,
          text: `You are WITHIN the geofence! (Distance: ${dist} meters, Limit: ${geoForm.radiusMeters}m)`,
        });
      } else {
        setTestDistanceResult({
          within: false,
          text: `You are OUTSIDE the geofence! (Distance: ${
            dist >= 1000 ? (dist / 1000).toFixed(2) + " km" : dist + " meters"
          })`,
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Owner Header */}
      <header className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500" />
            <p className="text-xs font-bold uppercase tracking-widest text-amber-800">
              Sunshine Bistro • Executive Management
            </p>
          </div>
          <h2 className="font-display mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Restaurant Owner Suite
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Control live menu pricing, stock availability, table QR stands, and anti-tamper
            geofencing
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap rounded-2xl bg-slate-100 p-1 gap-1">
            <button
              type="button"
              onClick={() => setSubTab("menu")}
              className={`min-h-10 rounded-xl px-4 py-2 text-xs font-bold transition ${
                subTab === "menu"
                  ? "bg-slate-900 text-white shadow"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Menu Manager
            </button>
            <button
              type="button"
              onClick={() => setSubTab("qr")}
              className={`min-h-10 rounded-xl px-4 py-2 text-xs font-bold transition ${
                subTab === "qr"
                  ? "bg-slate-900 text-white shadow"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              QR Generator & Stands
            </button>
            <button
              type="button"
              onClick={() => setSubTab("security")}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                subTab === "security"
                  ? "bg-slate-900 text-white shadow"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <MapPinIcon size={13} />
              <span>GPS & Anti-Tamper</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab("analytics")}
              className={`min-h-10 rounded-xl px-4 py-2 text-xs font-bold transition ${
                subTab === "analytics"
                  ? "bg-slate-900 text-white shadow"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Analytics
            </button>
          </div>

          <button
            type="button"
            onClick={onLockSession}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
          >
            <LockIcon size={13} />
            <span>Lock Suite</span>
          </button>
        </div>
      </header>

      {/* Overview Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Live Revenue
          </p>
          <p className="tabular-nums mt-2 text-3xl font-black text-slate-900">
            ${totalSales.toFixed(2)}
          </p>
          <span className="mt-1 inline-block text-xs font-semibold text-emerald-700">
            Active dining session
          </span>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Orders Placed
          </p>
          <p className="tabular-nums mt-2 text-3xl font-black text-slate-900">
            {validOrders.length}
          </p>
          <span className="mt-1 inline-block text-xs font-semibold text-slate-600">
            {completedOrders.length} completed
          </span>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Average Order Value (AOV)
          </p>
          <p className="tabular-nums mt-2 text-3xl font-black text-slate-900">
            ${aov.toFixed(2)}
          </p>
          <span className="mt-1 inline-block text-xs font-semibold text-slate-600">
            Per table order
          </span>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Occupied Tables
          </p>
          <p className="tabular-nums mt-2 text-3xl font-black text-amber-700">
            {activeTablesCount} / 16
          </p>
          <span className="mt-1 inline-block text-xs font-semibold text-slate-600">
            {16 - activeTablesCount} available
          </span>
        </div>
      </div>

      {/* Subtab 1: Menu Manager */}
      {subTab === "menu" && (
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Menu Items Table */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900">
                  Live Restaurant Menu
                </h3>
                <p className="text-xs text-slate-600">
                  Toggle availability or modify dish specifications
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {menu.length} Dishes Registered
              </span>
            </div>

            <div className="mt-6 divide-y divide-slate-100">
              {menu.map((dish) => (
                <div
                  key={dish.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-800 font-black text-sm">
                      {dish.category[0]}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900">{dish.name}</h4>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                          {dish.category}
                        </span>
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                          {dish.tag}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600 line-clamp-1">
                        {dish.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="tabular-nums text-sm font-black text-slate-900 mr-1">
                      ${dish.price.toFixed(2)}
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleAvailability(dish.id)}
                      className={`min-h-10 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                        dish.available
                          ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                          : "bg-rose-100 text-rose-900 hover:bg-rose-200"
                      }`}
                    >
                      {dish.available ? "In Stock" : "Sold Out"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingItem(dish)}
                      className="min-h-10 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(dish.id)}
                      className="min-h-10 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
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
            <h3 className="font-display text-lg font-bold text-slate-900">Add New Dish</h3>
            <p className="text-xs text-slate-600">Instantly publishes to guest menus</p>

            <form onSubmit={handleAddItem} className="mt-5 space-y-4">
              <div>
                <label htmlFor="add-dish-name" className="block text-xs font-bold text-slate-700">
                  Dish Name
                </label>
                <input
                  id="add-dish-name"
                  type="text"
                  required
                  placeholder="e.g. Truffle Mushroom Risotto"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="add-dish-cat" className="block text-xs font-bold text-slate-700">
                    Category
                  </label>
                  <select
                    id="add-dish-cat"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value as MenuCategory })
                    }
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm focus:border-amber-500"
                  >
                    <option value="Starters">Starters</option>
                    <option value="Mains">Mains</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Drinks">Drinks</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="add-dish-price"
                    className="block text-xs font-bold text-slate-700"
                  >
                    Price ($)
                  </label>
                  <input
                    id="add-dish-price"
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    placeholder="18.50"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="add-dish-tag" className="block text-xs font-bold text-slate-700">
                    Tag / Badge
                  </label>
                  <input
                    id="add-dish-tag"
                    type="text"
                    placeholder="Chef Pick"
                    value={form.tag}
                    onChange={(e) => setForm({ ...form, tag: e.target.value })}
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm focus:border-amber-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="add-dish-prep"
                    className="block text-xs font-bold text-slate-700"
                  >
                    Prep Time (mins)
                  </label>
                  <input
                    id="add-dish-prep"
                    type="number"
                    min="1"
                    value={form.prepTime}
                    onChange={(e) => setForm({ ...form, prepTime: e.target.value })}
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="add-dish-desc" className="block text-xs font-bold text-slate-700">
                  Description
                </label>
                <textarea
                  id="add-dish-desc"
                  rows={2}
                  placeholder="Ingredients, preparation style..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="min-h-11 w-full rounded-full bg-slate-900 py-3 text-xs font-black text-white hover:bg-slate-800 transition shadow-md"
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
            <h3 className="font-display text-lg font-bold text-slate-900">
              QR Code Customizer
            </h3>
            <p className="text-xs text-slate-600">
              Generate cryptographic QR codes with tamper-resistant tokens
            </p>

            <div>
              <label htmlFor="qr-table-select" className="block text-xs font-bold text-slate-700">
                Select Table Stand
              </label>
              <select
                id="qr-table-select"
                value={selectedTableForQr}
                onChange={(e) => setSelectedTableForQr(Number(e.target.value))}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((num) => (
                  <option key={num} value={num}>
                    Table {num} Stand
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="qr-domain-url" className="block text-xs font-bold text-slate-700">
                Production Base URL
              </label>
              <input
                id="qr-domain-url"
                type="url"
                value={domainUrl}
                onChange={(e) => setDomainUrl(e.target.value)}
                placeholder="https://yourdomain.com"
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono text-slate-900 focus:border-amber-500"
              />
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 space-y-1 text-xs">
              <span className="font-bold text-slate-700">Active QR Stand Token:</span>
              <p className="font-mono text-xs text-amber-800 break-all">{currentToken}</p>
              <p className="text-xs text-slate-500 pt-1">
                Resolved URL: <span className="font-mono">{currentQrUrl}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleRotateToken}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-amber-300 bg-amber-50 py-2.5 text-xs font-black text-amber-950 hover:bg-amber-100 transition"
            >
              <RefreshCwIcon size={14} />
              <span>Rotate Token (Invalidates Old Stand)</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-900 py-3 text-xs font-black text-white hover:bg-slate-800 transition shadow-md"
            >
              <PrinterIcon size={15} />
              <span>Print Acrylic Stand Card</span>
            </button>
          </div>

          {/* Scannable Physical Tent Card Preview (Isolated for @media print) */}
          <div className="space-y-4">
            <div
              id="printable-qr-stand"
              className="rounded-[28px] border-2 border-dashed border-amber-300 bg-gradient-to-b from-[#fffaf1] to-white p-8 text-center shadow-lg"
            >
              <div className="inline-block rounded-2xl bg-amber-500 px-4 py-1 text-xs font-black uppercase tracking-widest text-slate-950 mb-4">
                Sunshine Bistro Table Stand
              </div>

              <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900">
                TABLE {selectedTableForQr}
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Scan with your smartphone camera to view live menu & order
              </p>

              <div className="my-6 flex justify-center">
                <div className="rounded-3xl border-4 border-slate-900 bg-white p-6 shadow-2xl">
                  <QRCodeView value={currentQrUrl} size={220} />
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700">
                <LockIcon size={13} />
                <span>Cryptographically Locked Stand</span>
                <span aria-hidden="true">•</span>
                <span className="font-mono text-xs">{currentToken}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950">
              <p className="font-bold">Production Deployment Tip:</p>
              <p className="mt-1 leading-relaxed">
                When deploying live on Vercel, set your Vercel URL above (e.g.{" "}
                <code className="font-mono">https://tabletapp-xxx.vercel.app</code>) and print
                your batch of table stands.
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
              <h3 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                <MapPinIcon size={20} className="text-amber-700" />
                <span>GPS Geofencing & Anti-Tamper Security</span>
              </h3>
              <p className="mt-0.5 text-xs text-slate-600">
                Prevents remote prank orders from outside the restaurant by verifying the guest
                is physically seated on-premises
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                geoForm.enabled
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {geoForm.enabled ? "Geofence ACTIVE" : "Geofence DISABLED"}
            </span>
          </div>

          {gpsToast && (
            <div
              role="status"
              className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-900"
            >
              {gpsToast}
            </div>
          )}

          <form onSubmit={handleSaveGeoSettings} className="space-y-6 max-w-2xl">
            {/* Geofence Toggle */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <label
                  htmlFor="geo-enabled-toggle"
                  className="text-sm font-black text-slate-900 cursor-pointer"
                >
                  Enable GPS Geofencing Guard
                </label>
                <p className="text-xs text-slate-600">
                  When enabled, customers must be within the restaurant perimeter to place
                  orders.
                </p>
              </div>
              <input
                id="geo-enabled-toggle"
                type="checkbox"
                checked={geoForm.enabled}
                onChange={(e) => setGeoForm({ ...geoForm, enabled: e.target.checked })}
                className="h-6 w-6 rounded border-slate-300 text-amber-600 cursor-pointer"
              />
            </div>

            {/* Strict Mode Toggle */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <label
                  htmlFor="geo-strict-toggle"
                  className="text-sm font-black text-slate-900 cursor-pointer"
                >
                  Strict Enforcement Mode
                </label>
                <p className="text-xs text-slate-600">
                  {geoForm.strictMode
                    ? "Strict: Completely block orders from outside perimeter."
                    : "Permissive: Allow orders but flag ticket in KDS with Remote Order warning."}
                </p>
              </div>
              <input
                id="geo-strict-toggle"
                type="checkbox"
                checked={geoForm.strictMode}
                onChange={(e) => setGeoForm({ ...geoForm, strictMode: e.target.checked })}
                className="h-6 w-6 rounded border-slate-300 text-amber-600 cursor-pointer"
              />
            </div>

            {/* Coordinates Config */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="geo-lat-input" className="block text-xs font-bold text-slate-700">
                  Restaurant Latitude
                </label>
                <input
                  id="geo-lat-input"
                  type="number"
                  step="0.000001"
                  required
                  value={geoForm.latitude}
                  onChange={(e) =>
                    setGeoForm({ ...geoForm, latitude: Number(e.target.value) })
                  }
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-mono focus:border-amber-500"
                />
              </div>

              <div>
                <label htmlFor="geo-lng-input" className="block text-xs font-bold text-slate-700">
                  Restaurant Longitude
                </label>
                <input
                  id="geo-lng-input"
                  type="number"
                  step="0.000001"
                  required
                  value={geoForm.longitude}
                  onChange={(e) =>
                    setGeoForm({ ...geoForm, longitude: Number(e.target.value) })
                  }
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-mono focus:border-amber-500"
                />
              </div>
            </div>

            {/* Allowed Perimeter Radius */}
            <div>
              <p className="block text-xs font-bold text-slate-700">
                Allowed Radius: {geoForm.radiusMeters} meters
              </p>
              <p className="text-xs text-slate-600 mb-2">
                Distance radius from restaurant center (covers tables, patio, and terrace)
              </p>
              <div className="flex flex-wrap gap-2">
                {[50, 100, 150, 250, 500].map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    onClick={() => setGeoForm({ ...geoForm, radiusMeters: radius })}
                    className={`min-h-10 rounded-xl px-4 py-2 text-xs font-bold transition ${
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
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-400 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-950 hover:bg-amber-100 transition shadow-sm"
              >
                <MapPinIcon size={15} />
                <span>
                  {isCapturingGps ? "Capturing GPS..." : "Set to My Current GPS Location"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleTestDistance}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition"
              >
                <ShieldCheckIcon size={15} />
                <span>Test My Distance Now</span>
              </button>
            </div>

            {testDistanceResult && (
              <div
                role="status"
                className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-bold ${
                  testDistanceResult.within
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-rose-200 bg-rose-50 text-rose-900"
                }`}
              >
                <CheckCircleIcon size={16} />
                <span>{testDistanceResult.text}</span>
              </div>
            )}

            <div className="border-t border-slate-100 pt-4">
              <button
                type="submit"
                className="min-h-11 rounded-full bg-slate-900 px-6 py-3 text-xs font-black text-white hover:bg-slate-800 transition shadow-md"
              >
                Save Geofence Settings
              </button>
            </div>
          </form>

          {/* Explanation Banner */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950 space-y-2">
            <p className="flex items-center gap-1.5 font-bold">
              <ShieldCheckIcon size={16} className="text-amber-800" />
              <span>How This Solves The &quot;Photo of QR Code&quot; Prank:</span>
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700 leading-relaxed">
              <li>
                When a customer scans a table QR code and takes a photo home, they are miles
                away from the restaurant.
              </li>
              <li>
                When they tap &quot;Place Order&quot; from home, their phone&apos;s GPS reports
                their location, TableTapp detects they are outside the {geoForm.radiusMeters}m
                perimeter, and blocks the order ticket.
              </li>
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
              <h3 className="font-display text-xl font-bold text-slate-900">
                Real-Time Dining Analytics
              </h3>
              <p className="text-xs text-slate-600">
                Live performance metrics from today&apos;s service
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
              {completedOrders.length} Fulfilled Orders
            </span>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Recent Table Orders
            </h4>
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 text-xs"
              >
                <div>
                  <span className="font-black text-slate-900">Table {order.table}</span> •{" "}
                  <span className="tabular-nums text-slate-500">#{order.orderNumber}</span> •{" "}
                  <span className="text-slate-700">
                    {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums font-bold text-slate-900">
                    ${order.total.toFixed(2)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      order.status === "Served" || order.status === "Archived"
                        ? "bg-emerald-100 text-emerald-900"
                        : order.status === "Rejected"
                          ? "bg-rose-100 text-rose-900"
                          : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {order.status === "Archived"
                      ? "Fulfilled & Cleared"
                      : order.status === "Served"
                        ? "Served"
                        : order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-dish-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingItem(null);
          }}
        >
          <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 id="edit-dish-modal-title" className="font-display text-lg font-bold text-slate-900">
                Edit Dish
              </h3>
              <button
                type="button"
                aria-label="Close edit dish modal"
                onClick={() => setEditingItem(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3.5">
              <div>
                <label htmlFor="edit-dish-name" className="block text-xs font-bold text-slate-700">
                  Name
                </label>
                <input
                  id="edit-dish-name"
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="edit-dish-price"
                    className="block text-xs font-bold text-slate-700"
                  >
                    Price ($)
                  </label>
                  <input
                    id="edit-dish-price"
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={editingItem.price}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, price: Number(e.target.value) })
                    }
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm focus:border-amber-500"
                  />
                </div>

                <div>
                  <label htmlFor="edit-dish-tag" className="block text-xs font-bold text-slate-700">
                    Tag
                  </label>
                  <input
                    id="edit-dish-tag"
                    type="text"
                    value={editingItem.tag}
                    onChange={(e) => setEditingItem({ ...editingItem, tag: e.target.value })}
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-dish-desc" className="block text-xs font-bold text-slate-700">
                  Description
                </label>
                <textarea
                  id="edit-dish-desc"
                  rows={3}
                  value={editingItem.description}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, description: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm focus:border-amber-500"
                />
              </div>

              <div className="mt-5 flex gap-2 border-t border-slate-100 pt-3.5">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="min-h-11 flex-1 rounded-full border border-slate-200 bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-11 flex-1 rounded-full bg-slate-900 py-2.5 text-xs font-black text-white hover:bg-slate-800"
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
