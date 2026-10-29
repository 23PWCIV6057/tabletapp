"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { MenuItem, Restaurant } from "@/types";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  DownloadIcon,
  LockIcon,
  MapPinIcon,
  PrinterIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrashIcon,
  UtensilsIcon,
  XIcon,
} from "@/components/Icons";
import { broadcastSyncEvent, getStoredOrders, saveStoredOrders } from "@/lib/sync";

export default function DeveloperPortalPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Fleet State
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoadingFleet, setIsLoadingFleet] = useState(false);
  const [activeTab, setActiveTab] = useState<"fleet" | "onboard">("fleet");

  // New Restaurant Onboarding Form State
  const [onboardForm, setOnboardForm] = useState({
    name: "",
    slug: "",
    tagline: "",
    city: "Peshawar",
    address: "",
    phone: "051 111 111 199",
    currency: "PKR" as "PKR" | "USD",
    staffPin: "1234",
    ownerPin: "8888",
    securityMode: "hybrid_gps" as "dine_in_code" | "hybrid_gps" | "kds_only",
    dailyDineInCode: "42",
    wifiSsid: "",
    wifiPassword: "",
    arcadePrizeText: "Free Dessert on #1 Daily Score!",
    tableCount: "16",
    serviceFeePercent: "0",
  });

  // Spreadsheet Menu Import State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isParsingSheet, setIsParsingSheet] = useState(false);
  const [parsedMenuItems, setParsedMenuItems] = useState<MenuItem[]>([]);
  const [parsedCategories, setParsedCategories] = useState<string[]>([]);
  const [sheetParseError, setSheetParseError] = useState<string | null>(null);
  const [isSubmittingRestaurant, setIsSubmittingRestaurant] = useState(false);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  // Menu Editor Drawer State
  const [drawerRestaurant, setDrawerRestaurant] = useState<Restaurant | null>(null);
  const [drawerMenuItems, setDrawerMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [menuFilterCategory, setMenuFilterCategory] = useState("All");
  const [menuSearchTerm, setMenuSearchTerm] = useState("");
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null);
  const [isAddingDish, setIsAddingDish] = useState(false);
  const [isSavingDish, setIsSavingDish] = useState(false);
  const [newDishForm, setNewDishForm] = useState({
    name: "",
    category: "Pizzas",
    price: "999",
    description: "",
    tag: "Popular",
    prepTimeMinutes: "15",
    available: true,
    imageUrl: "",
  });

  // Order Purge Modal State
  const [purgeRestaurant, setPurgeRestaurant] = useState<Restaurant | null>(null);
  const [purgeMode, setPurgeMode] = useState<"active_only" | "factory_reset">("factory_reset");
  const [purgeConfirmInput, setPurgeConfirmInput] = useState("");
  const [purgeOrderCount, setPurgeOrderCount] = useState<number | null>(null);
  const [isPurgingOrders, setIsPurgingOrders] = useState(false);

  // Check existing session on mount
  useEffect(() => {
    fetch("/api/dev/auth")
      .then((res) => {
        if (res.ok) {
          setIsAuthenticated(true);
          loadFleet();
        } else {
          setIsAuthenticated(false);
        }
      })
      .catch(() => setIsAuthenticated(false));
  }, []);

  const loadFleet = async () => {
    setIsLoadingFleet(true);
    try {
      const res = await fetch("/api/dev/restaurants");
      const data = await res.json();
      if (data.success && Array.isArray(data.restaurants)) {
        setRestaurants(data.restaurants);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoadingFleet(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const res = await fetch("/api/dev/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setPassword("");
        loadFleet();
      } else {
        setLoginError(data.error || "Incorrect master key.");
      }
    } catch {
      setLoginError("Failed to reach developer authentication service.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/dev/auth", { method: "DELETE" });
    setIsAuthenticated(false);
  };

  // Handle Excel / CSV File Drop & Parse
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsParsingSheet(true);
    setSheetParseError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/dev/import-menu", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setParsedMenuItems(data.items);
        setParsedCategories(data.categories);
        setActionSuccessToast(`Parsed ${data.count} dishes across ${data.categories.length} categories!`);
        setTimeout(() => setActionSuccessToast(null), 4000);
      } else {
        setSheetParseError(data.error || "Failed to parse spreadsheet.");
        setParsedMenuItems([]);
      }
    } catch {
      setSheetParseError("Upload failed. Verify the file format (.xlsx or .csv).");
    } finally {
      setIsParsingSheet(false);
    }
  };

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardForm.name.trim()) return;

    setIsSubmittingRestaurant(true);
    try {
      const res = await fetch("/api/dev/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...onboardForm,
          menuItems: parsedMenuItems,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setActionSuccessToast(`Restaurant "${data.restaurant.name}" is now live!`);
        setTimeout(() => setActionSuccessToast(null), 5000);
        setOnboardForm({
          name: "",
          slug: "",
          tagline: "",
          city: "Peshawar",
          address: "",
          phone: "051 111 111 199",
          currency: "PKR",
          staffPin: "1234",
          ownerPin: "8888",
          securityMode: "hybrid_gps",
          dailyDineInCode: "42",
          wifiSsid: "",
          wifiPassword: "",
          arcadePrizeText: "Free Dessert on #1 Daily Score!",
          tableCount: "16",
          serviceFeePercent: "0",
        });
        setUploadedFile(null);
        setParsedMenuItems([]);
        setParsedCategories([]);
        setActiveTab("fleet");
        loadFleet();
      } else {
        alert(data.error || "Failed to create restaurant.");
      }
    } catch {
      alert("Network error while creating restaurant.");
    } finally {
      setIsSubmittingRestaurant(false);
    }
  };

  const handleToggleSuspend = async (r: Restaurant) => {
    const nextStatus = r.status === "active" ? "suspended" : "active";
    const confirmMsg =
      nextStatus === "suspended"
        ? `Suspend ${r.name}? Guest ordering will be paused immediately until reactivated.`
        : `Reactivate ${r.name}?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/dev/restaurants/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        loadFleet();
      }
    } catch {
      alert("Failed to update status.");
    }
  };

  const handleDeleteRestaurant = async (r: Restaurant) => {
    if (r.slug === "heatbox") {
      alert("Heat Box is your primary demo iteration and cannot be removed.");
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete "${r.name}" and all its data?`)) return;

    try {
      const res = await fetch(`/api/dev/restaurants/${r.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadFleet();
      }
    } catch {
      alert("Failed to delete restaurant.");
    }
  };

  // Open Menu Editor Drawer
  const openMenuDrawer = async (r: Restaurant) => {
    setDrawerRestaurant(r);
    setIsLoadingMenu(true);
    setMenuFilterCategory("All");
    setMenuSearchTerm("");
    setEditingDish(null);
    setIsAddingDish(false);

    try {
      const res = await fetch(`/api/dev/restaurants/${r.id}/menu`);
      const data = await res.json();
      if (data.success && Array.isArray(data.menu) && data.menu.length > 0) {
        setDrawerMenuItems(data.menu);
      } else {
        if (typeof window !== "undefined") {
          const tenantRaw = localStorage.getItem(`tabletapp_menu_${r.id}`);
          if (tenantRaw) {
            setDrawerMenuItems(JSON.parse(tenantRaw));
          } else if (r.slug === "heatbox") {
            const hb = localStorage.getItem("tabletapp_heatbox_menu_v1") || localStorage.getItem("tabletapp_menu_v1");
            setDrawerMenuItems(hb ? JSON.parse(hb) : []);
          } else {
            setDrawerMenuItems([]);
          }
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingMenu(false);
    }
  };

  const handleSaveEditedDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDish || !drawerRestaurant) return;
    setIsSavingDish(true);

    const updatedMenu = drawerMenuItems.map((item) =>
      item.id === editingDish.id ? editingDish : item
    );
    setDrawerMenuItems(updatedMenu);

    if (typeof window !== "undefined") {
      localStorage.setItem(`tabletapp_menu_${drawerRestaurant.id}`, JSON.stringify(updatedMenu));
      if (drawerRestaurant.slug === "heatbox") {
        localStorage.setItem("tabletapp_heatbox_menu_v1", JSON.stringify(updatedMenu));
        localStorage.setItem("tabletapp_menu_v1", JSON.stringify(updatedMenu));
      }
    }

    try {
      await fetch(`/api/dev/restaurants/${drawerRestaurant.id}/menu`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu: updatedMenu }),
      });
    } catch {
      // Fallback
    } finally {
      setIsSavingDish(false);
      setEditingDish(null);
      setActionSuccessToast(`Updated "${editingDish.name}" for ${drawerRestaurant.name}.`);
    }
  };

  const handleCreateNewDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawerRestaurant || !newDishForm.name.trim()) return;
    setIsSavingDish(true);

    const newDish: MenuItem = {
      id: Date.now(),
      name: newDishForm.name.trim(),
      category: (newDishForm.category.trim() || "Main Dishes") as any,
      price: Math.max(0, Number(newDishForm.price) || 0),
      description: newDishForm.description.trim(),
      tag: newDishForm.tag.trim() || "Popular",
      prepTimeMinutes: Math.max(1, Number(newDishForm.prepTimeMinutes) || 12),
      available: newDishForm.available,
      imageUrl: newDishForm.imageUrl.trim() || undefined,
      restaurantId: drawerRestaurant.id,
    };

    const updatedMenu = [newDish, ...drawerMenuItems];
    setDrawerMenuItems(updatedMenu);

    if (typeof window !== "undefined") {
      localStorage.setItem(`tabletapp_menu_${drawerRestaurant.id}`, JSON.stringify(updatedMenu));
      if (drawerRestaurant.slug === "heatbox") {
        localStorage.setItem("tabletapp_heatbox_menu_v1", JSON.stringify(updatedMenu));
        localStorage.setItem("tabletapp_menu_v1", JSON.stringify(updatedMenu));
      }
    }

    try {
      await fetch(`/api/dev/restaurants/${drawerRestaurant.id}/menu`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu: updatedMenu }),
      });
    } catch {
      // Fallback
    } finally {
      setIsSavingDish(false);
      setIsAddingDish(false);
      setNewDishForm({
        name: "",
        category: "Pizzas",
        price: "999",
        description: "",
        tag: "Popular",
        prepTimeMinutes: "15",
        available: true,
        imageUrl: "",
      });
      setActionSuccessToast(`Added "${newDish.name}" to ${drawerRestaurant.name}.`);
    }
  };

  const handleDeleteDish = async (dishId: number, dishName: string) => {
    if (!drawerRestaurant) return;
    if (!confirm(`Delete "${dishName}" from ${drawerRestaurant.name}?`)) return;

    const updatedMenu = drawerMenuItems.filter((d) => d.id !== dishId);
    setDrawerMenuItems(updatedMenu);

    if (typeof window !== "undefined") {
      localStorage.setItem(`tabletapp_menu_${drawerRestaurant.id}`, JSON.stringify(updatedMenu));
      if (drawerRestaurant.slug === "heatbox") {
        localStorage.setItem("tabletapp_heatbox_menu_v1", JSON.stringify(updatedMenu));
        localStorage.setItem("tabletapp_menu_v1", JSON.stringify(updatedMenu));
      }
    }

    try {
      await fetch(`/api/dev/restaurants/${drawerRestaurant.id}/menu?itemId=${dishId}`, {
        method: "DELETE",
      });
    } catch {
      // Fallback
    }

    setActionSuccessToast(`Deleted "${dishName}".`);
  };

  const handleToggleDishAvailability = async (dish: MenuItem) => {
    if (!drawerRestaurant) return;
    const toggled = { ...dish, available: !dish.available };
    const updatedMenu = drawerMenuItems.map((d) => (d.id === dish.id ? toggled : d));
    setDrawerMenuItems(updatedMenu);

    if (typeof window !== "undefined") {
      localStorage.setItem(`tabletapp_menu_${drawerRestaurant.id}`, JSON.stringify(updatedMenu));
      if (drawerRestaurant.slug === "heatbox") {
        localStorage.setItem("tabletapp_heatbox_menu_v1", JSON.stringify(updatedMenu));
        localStorage.setItem("tabletapp_menu_v1", JSON.stringify(updatedMenu));
      }
    }

    try {
      await fetch(`/api/dev/restaurants/${drawerRestaurant.id}/menu`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu: updatedMenu }),
      });
    } catch {
      // Fallback
    }
  };

  // Open Order Purge Modal
  const openPurgeModal = async (r: Restaurant) => {
    setPurgeRestaurant(r);
    setPurgeMode("factory_reset");
    setPurgeConfirmInput("");
    setPurgeOrderCount(null);

    try {
      const res = await fetch(`/api/dev/restaurants/${r.id}/orders`);
      const data = await res.json();
      if (data.success) {
        setPurgeOrderCount(data.orderCount ?? 0);
      }
    } catch {
      const local = getStoredOrders().filter(
        (o) => o.restaurantId === r.id || (r.slug === "heatbox" && !o.restaurantId)
      );
      setPurgeOrderCount(local.length);
    }
  };

  const handleExecutePurge = async () => {
    if (!purgeRestaurant) return;
    if (purgeConfirmInput.trim().toUpperCase() !== "CONFIRM") {
      alert('Please type "CONFIRM" to authorize order history wipe.');
      return;
    }

    setIsPurgingOrders(true);
    try {
      await fetch(`/api/dev/restaurants/${purgeRestaurant.id}/orders?mode=${purgeMode}`, {
        method: "DELETE",
      });

      const allOrders = getStoredOrders();
      let remainingOrders: any[];
      if (purgeMode === "active_only") {
        remainingOrders = allOrders.filter(
          (o) =>
            (o.restaurantId !== purgeRestaurant.id &&
              (purgeRestaurant.slug !== "heatbox" || o.restaurantId)) ||
            o.status === "Served" ||
            o.status === "Archived"
        );
      } else {
        remainingOrders = allOrders.filter((o) => {
          if (o.restaurantId === purgeRestaurant.id) return false;
          if (purgeRestaurant.slug === "heatbox" && !o.restaurantId) return false;
          return true;
        });
      }

      saveStoredOrders(remainingOrders);
      broadcastSyncEvent({
        type: "ORDER_STATUS_CHANGED",
        payload: { orderId: "sync_purge", status: "Archived" as any, updatedAt: Date.now() },
      });

      setActionSuccessToast(
        `Order history for ${purgeRestaurant.name} wiped (${
          purgeMode === "active_only" ? "Active tickets cleared" : "Full factory reset"
        }).`
      );
      setPurgeRestaurant(null);
    } catch (err) {
      alert("Failed to wipe order history. Please try again.");
    } finally {
      setIsPurgingOrders(false);
    }
  };

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">
            Verifying Developer Environment...
          </p>
        </div>
      </div>
    );
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
        <div className="w-full max-w-md rounded-[32px] border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-md">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20">
              <ShieldCheckIcon size={28} />
            </div>
            <span className="mt-4 inline-block rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-400 border border-amber-500/20">
              Developer Super-Admin
            </span>
            <h1 className="font-display mt-2 text-2xl font-black text-white">
              TableTapp Multi-Tenant Portal
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Restricted access for platform developer only. HMAC-SHA256 session guarded.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label htmlFor="dev-pass" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Developer Master Key
              </label>
              <input
                id="dev-pass"
                type="password"
                required
                autoFocus
                placeholder="Enter master developer password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 min-h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm text-white placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
              />
            </div>

            {loginError && (
              <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs font-bold text-rose-300">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="min-h-12 w-full rounded-full bg-amber-500 py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 active:scale-95 transition disabled:opacity-50"
            >
              {isLoggingIn ? "Verifying Credentials..." : "Unlock Developer Console"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-4 text-center">
            <Link href="/" className="text-xs font-bold text-slate-400 hover:text-white transition">
              ← Return to Guest Experience
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Authenticated Developer Console
  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-slate-100">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 font-black text-slate-950">
              TT
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-base font-bold text-white sm:text-lg">
                  TableTapp Developer Console
                </h1>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                  Super-Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-Tenant Fleet Control • Independent Database Partitioning
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/r/heatbox"
              target="_blank"
              className="hidden sm:inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
            >
              <span>View Heat Box Live</span>
              <span className="text-amber-400">↗</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="min-h-10 rounded-full border border-rose-500/30 bg-rose-950/40 px-3.5 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-900/50 transition"
            >
              Lock Console
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 space-y-6">
        {/* Success Toast */}
        {actionSuccessToast && (
          <div
            role="status"
            className="flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-950/70 p-4 text-emerald-200 shadow-xl"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircleIcon size={20} className="text-emerald-400" />
              <span className="text-xs font-bold">{actionSuccessToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccessToast(null)}
              className="text-emerald-400 hover:text-white"
            >
              <XIcon size={16} />
            </button>
          </div>
        )}

        {/* High-Level Fleet Stats Bar */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Partner Fleets
            </p>
            <p className="font-display mt-2 text-2xl sm:text-3xl font-black text-amber-400">
              {restaurants.filter((r) => r.status === "active").length}{" "}
              <span className="text-xs font-normal text-slate-400">
                / {restaurants.length} total
              </span>
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Fleet Table Capacity
            </p>
            <p className="font-display mt-2 text-2xl sm:text-3xl font-black text-emerald-400">
              {restaurants.reduce((acc, r) => acc + (r.tableCount || 16), 0)}{" "}
              <span className="text-xs font-normal text-slate-400">tables live</span>
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Primary Partner
            </p>
            <p className="font-display mt-2 text-lg sm:text-xl font-black text-white truncate">
              Heat Box Pizza
            </p>
            <span className="text-xs text-slate-400">Peshawar Cantt</span>
          </div>

          <div className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Security Protocol
            </p>
            <p className="font-display mt-2 text-lg sm:text-xl font-black text-amber-400">
              HMAC Guarded
            </p>
            <span className="text-xs text-slate-400">Zero IDOR / Tenant Isolated</span>
          </div>
        </section>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("fleet")}
            className={`min-h-12 border-b-2 px-5 py-3 text-xs font-black uppercase tracking-wider transition ${
              activeTab === "fleet"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Partner Restaurants ({restaurants.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("onboard")}
            className={`min-h-12 border-b-2 px-5 py-3 text-xs font-black uppercase tracking-wider transition ${
              activeTab === "onboard"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            + Onboard New Restaurant (Excel Importer)
          </button>
        </div>

        {/* Tab 1: Restaurant Fleet List */}
        {activeTab === "fleet" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Client Restaurant Directory
                </h2>
                <p className="text-xs text-slate-400">
                  Each restaurant runs on its own isolated URL path, table tokens, PINs, and menu
                </p>
              </div>

              <button
                type="button"
                onClick={loadFleet}
                disabled={isLoadingFleet}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
              >
                <RefreshCwIcon size={14} className={isLoadingFleet ? "animate-spin" : ""} />
                <span>Refresh Fleet</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {restaurants.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col justify-between rounded-[28px] border border-slate-800 bg-slate-900/95 p-5 sm:p-6 shadow-md transition hover:border-slate-700"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-2.5 w-2.5 rounded-full ${
                              r.status === "active" ? "bg-emerald-400" : "bg-rose-500"
                            }`}
                          />
                          <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-mono font-bold text-amber-300">
                            /r/{r.slug}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              r.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {r.status === "active" ? "Active" : "Suspended"}
                          </span>
                        </div>

                        <h3 className="font-display mt-2 text-xl font-bold text-white">
                          {r.name}
                        </h3>
                        <p className="text-xs text-slate-400">{r.tagline || r.address}</p>
                      </div>

                      <span className="tabular-nums rounded-xl bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
                        {r.tableCount || 16} Tables
                      </span>
                    </div>

                    {/* Metadata Pill Box */}
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300 rounded-2xl bg-slate-950 p-3.5 border border-slate-800/80">
                      <div>
                        <span className="text-slate-500">City / Currency:</span>
                        <p className="font-bold text-white">
                          {r.city || "Peshawar"} • {r.currency}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Security Mode:</span>
                        <p className="font-bold text-amber-300">
                          {r.securityMode === "dine_in_code"
                            ? "Daily Dine-In Code"
                            : r.securityMode === "hybrid_gps"
                            ? "Hybrid GPS"
                            : "KDS Only"}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Staff PIN / Owner PIN:</span>
                        <p className="font-mono font-bold text-white">
                          {r.staffPin} / {r.ownerPin}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Cryptographic Access Key:</span>
                        <p className="font-mono text-xs text-amber-400 truncate">
                          {r.accessKey}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/r/${r.slug}`}
                        target="_blank"
                        className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition"
                      >
                        <span>Guest Hub</span>
                        <span>↗</span>
                      </Link>

                      <Link
                        href={`/r/${r.slug}/staff`}
                        target="_blank"
                        className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                      >
                        <span>Staff KDS</span>
                        <span>↗</span>
                      </Link>

                      <Link
                        href={`/r/${r.slug}/staff?tab=owner`}
                        target="_blank"
                        className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                      >
                        <span>Owner Suite</span>
                        <span>↗</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => openMenuDrawer(r)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-950/60 px-3.5 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-900/60 transition"
                      >
                        <UtensilsIcon size={14} />
                        <span>Edit Menu</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openPurgeModal(r)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/60 px-3.5 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-900/60 transition"
                      >
                        <TrashIcon size={14} />
                        <span>Clean Orders</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleSuspend(r)}
                        className={`min-h-10 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                          r.status === "active"
                            ? "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30"
                            : "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30"
                        }`}
                      >
                        {r.status === "active" ? "Pause / Suspend" : "Reactivate"}
                      </button>

                      {r.slug !== "heatbox" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRestaurant(r)}
                          className="min-h-10 rounded-xl bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab 2: Onboard New Restaurant Wizard with Excel / CSV Menu Importer */}
        {activeTab === "onboard" && (
          <section className="rounded-[32px] border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <span className="rounded-full bg-amber-500/10 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-400 border border-amber-500/20">
                  Client Setup Wizard
                </span>
                <h2 className="font-display mt-1.5 text-xl sm:text-2xl font-bold text-white">
                  Add New Restaurant Partner
                </h2>
                <p className="text-xs text-slate-400">
                  Instantly provisions isolated URLs, table QR stands, PINs, and imports their menu from an Excel or CSV file
                </p>
              </div>

              <a
                href="/api/dev/import-menu"
                download="table_tapp_sample_menu.csv"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition self-start sm:self-auto"
              >
                <span>Download Sample Menu Template (.csv)</span>
                <span>↓</span>
              </a>
            </div>

            <form onSubmit={handleCreateRestaurant} className="mt-6 space-y-6">
              {/* Basic Restaurant Details */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="r-name" className="block text-xs font-bold text-slate-300">
                    Restaurant Name *
                  </label>
                  <input
                    id="r-name"
                    type="text"
                    required
                    placeholder="e.g. Chief Grill Peshawar"
                    value={onboardForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
                      setOnboardForm({ ...onboardForm, name, slug: onboardForm.slug || slug });
                    }}
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="r-slug" className="block text-xs font-bold text-slate-300">
                    URL Slug (/r/[slug])
                  </label>
                  <input
                    id="r-slug"
                    type="text"
                    required
                    placeholder="e.g. chief-grill"
                    value={onboardForm.slug}
                    onChange={(e) => setOnboardForm({ ...onboardForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-mono text-amber-300 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="r-city" className="block text-xs font-bold text-slate-300">
                    City / Branch
                  </label>
                  <input
                    id="r-city"
                    type="text"
                    placeholder="Peshawar"
                    value={onboardForm.city}
                    onChange={(e) => setOnboardForm({ ...onboardForm, city: e.target.value })}
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="r-tagline" className="block text-xs font-bold text-slate-300">
                    Tagline / Subheading
                  </label>
                  <input
                    id="r-tagline"
                    type="text"
                    placeholder="e.g. University Road • Fine Steaks & Burgers"
                    value={onboardForm.tagline}
                    onChange={(e) => setOnboardForm({ ...onboardForm, tagline: e.target.value })}
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="r-phone" className="block text-xs font-bold text-slate-300">
                    Contact / WhatsApp Phone
                  </label>
                  <input
                    id="r-phone"
                    type="text"
                    placeholder="091 1234567"
                    value={onboardForm.phone}
                    onChange={(e) => setOnboardForm({ ...onboardForm, phone: e.target.value })}
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="r-tables" className="block text-xs font-bold text-slate-300">
                    Dining Table Count
                  </label>
                  <input
                    id="r-tables"
                    type="number"
                    min="1"
                    max="64"
                    value={onboardForm.tableCount}
                    onChange={(e) => setOnboardForm({ ...onboardForm, tableCount: e.target.value })}
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Security & Access Credentials */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Security, Passcodes & Wi-Fi Configuration
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label htmlFor="r-staff-pin" className="block text-xs font-bold text-slate-300">
                      Staff PIN (KDS)
                    </label>
                    <input
                      id="r-staff-pin"
                      type="text"
                      maxLength={8}
                      value={onboardForm.staffPin}
                      onChange={(e) => setOnboardForm({ ...onboardForm, staffPin: e.target.value })}
                      className="mt-1 min-h-10 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-mono text-white focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label htmlFor="r-owner-pin" className="block text-xs font-bold text-slate-300">
                      Owner PIN
                    </label>
                    <input
                      id="r-owner-pin"
                      type="text"
                      maxLength={8}
                      value={onboardForm.ownerPin}
                      onChange={(e) => setOnboardForm({ ...onboardForm, ownerPin: e.target.value })}
                      className="mt-1 min-h-10 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-mono text-white focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label htmlFor="r-dine-in-code" className="block text-xs font-bold text-slate-300">
                      Daily Dine-In Code
                    </label>
                    <input
                      id="r-dine-in-code"
                      type="text"
                      value={onboardForm.dailyDineInCode}
                      onChange={(e) => setOnboardForm({ ...onboardForm, dailyDineInCode: e.target.value })}
                      className="mt-1 min-h-10 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-mono text-amber-300 focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label htmlFor="r-wifi-ssid" className="block text-xs font-bold text-slate-300">
                      Free Wi-Fi Name (SSID)
                    </label>
                    <input
                      id="r-wifi-ssid"
                      type="text"
                      placeholder="e.g. ChiefGrill_5G"
                      value={onboardForm.wifiSsid}
                      onChange={(e) => setOnboardForm({ ...onboardForm, wifiSsid: e.target.value })}
                      className="mt-1 min-h-10 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Excel / CSV Menu Uploader */}
              <div className="rounded-2xl border-2 border-dashed border-amber-500/40 bg-slate-950/70 p-5 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <UtensilsIcon size={24} />
                </div>
                <h3 className="font-display mt-2 text-base font-bold text-white">
                  Upload Menu Spreadsheet (.xlsx or .csv)
                </h3>
                <p className="mt-0.5 text-xs text-slate-400 max-w-lg mx-auto">
                  Upload the restaurant&apos;s menu spreadsheet. Categories, dishes, prices, sizes, and modifier options are automatically parsed and structured.
                </p>

                <div className="mt-4 flex flex-col items-center justify-center">
                  <label
                    htmlFor="menu-sheet-file"
                    className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-slate-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition border border-slate-700"
                  >
                    <span>{isParsingSheet ? "Parsing Spreadsheet..." : uploadedFile ? `Selected: ${uploadedFile.name}` : "Choose Excel / CSV File"}</span>
                  </label>
                  <input
                    id="menu-sheet-file"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                </div>

                {sheetParseError && (
                  <p className="mt-3 text-xs font-bold text-rose-400">
                    {sheetParseError}
                  </p>
                )}

                {/* Parsed Preview */}
                {parsedMenuItems.length > 0 && (
                  <div className="mt-5 text-left rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-emerald-400">
                        ✓ Successfully Parsed {parsedMenuItems.length} Dishes
                      </span>
                      <span className="text-xs text-slate-400">
                        {parsedCategories.length} Categories: {parsedCategories.join(", ")}
                      </span>
                    </div>

                    <div className="mt-3 max-h-48 overflow-y-auto space-y-1.5 divide-y divide-slate-800/60 text-xs">
                      {parsedMenuItems.slice(0, 10).map((dish) => (
                        <div key={dish.id} className="pt-1.5 first:pt-0 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-white">{dish.name}</span>{" "}
                            <span className="text-slate-500">({dish.category})</span>
                            <p className="text-slate-400 text-[11px] truncate max-w-md">{dish.description}</p>
                          </div>
                          <span className="font-mono font-bold text-amber-300">
                            Rs. {dish.price.toLocaleString()}
                          </span>
                        </div>
                      ))}
                      {parsedMenuItems.length > 10 && (
                        <p className="pt-2 text-center text-[11px] text-slate-500">
                          + {parsedMenuItems.length - 10} more dishes ready to save
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmittingRestaurant}
                className="min-h-12 w-full rounded-full bg-amber-500 py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 active:scale-95 transition disabled:opacity-50"
              >
                {isSubmittingRestaurant ? "Provisioning Client Portal..." : "🚀 Launch & Deploy New Restaurant Portal"}
              </button>
            </form>
          </section>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. Slide-Over Menu Editor Drawer */}
      {/* ========================================================================= */}
      {drawerRestaurant && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/75 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !editingDish && !isAddingDish) {
              setDrawerRestaurant(null);
            }
          }}
        >
          <div className="flex h-full w-full max-w-2xl flex-col bg-slate-900 border-l border-slate-800 p-6 shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs font-mono font-bold text-amber-400">
                  /r/{drawerRestaurant.slug}
                </span>
                <h3 className="font-display mt-1 text-xl font-bold text-white">
                  Menu Manager: {drawerRestaurant.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {drawerMenuItems.length} dishes live in catalog • Updates sync to customer tables in real-time
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingDish(true)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-400 transition"
                >
                  <span>+ Add Dish</span>
                </button>
                <button
                  type="button"
                  aria-label="Close Drawer"
                  onClick={() => setDrawerRestaurant(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
                >
                  <XIcon size={18} />
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="mt-4 space-y-3">
              <div className="relative">
                <input
                  type="search"
                  value={menuSearchTerm}
                  onChange={(e) => setMenuSearchTerm(e.target.value)}
                  placeholder="Search dishes by name or description..."
                  className="min-h-11 w-full rounded-2xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:border-amber-400"
                />
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                  <SearchIcon size={15} />
                </span>
              </div>

              {/* Category Pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {["All", ...Array.from(new Set(drawerMenuItems.map((d) => d.category)))].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setMenuFilterCategory(cat)}
                    className={`min-h-9 shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      menuFilterCategory === cat
                        ? "bg-amber-500 text-slate-950"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Dish List */}
            <div className="mt-4 flex-1 space-y-2.5 overflow-y-auto pr-1">
              {isLoadingMenu ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent mb-3" />
                  Loading restaurant catalog...
                </div>
              ) : drawerMenuItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No dishes found. Click &quot;+ Add Dish&quot; above or upload an Excel menu in the Onboarding tab.
                </div>
              ) : (
                drawerMenuItems
                  .filter((d) => {
                    const matchCat = menuFilterCategory === "All" || d.category === menuFilterCategory;
                    const matchSearch =
                      !menuSearchTerm ||
                      d.name.toLowerCase().includes(menuSearchTerm.toLowerCase()) ||
                      (d.description || "").toLowerCase().includes(menuSearchTerm.toLowerCase());
                    return matchCat && matchSearch;
                  })
                  .map((dish) => (
                    <div
                      key={dish.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 transition hover:border-slate-700"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {dish.imageUrl ? (
                          <img
                            src={dish.imageUrl}
                            alt={dish.name}
                            className="h-12 w-12 rounded-xl object-cover border border-slate-800 shrink-0"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-500 shrink-0">
                            <UtensilsIcon size={18} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs truncate">{dish.name}</span>
                            {dish.tag && (
                              <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 shrink-0">
                                {dish.tag}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate max-w-sm">
                            {dish.category} • {dish.prepTimeMinutes || 12} min prep
                          </p>
                          <p className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                            {drawerRestaurant.currency === "PKR" ? "Rs." : "$"} {dish.price.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleDishAvailability(dish)}
                          className={`min-h-8 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                            dish.available
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          {dish.available ? "In Stock" : "Sold Out"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingDish({ ...dish })}
                          className="min-h-8 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-700"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteDish(dish.id, dish.name)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Dish Modal */}
      {editingDish && drawerRestaurant && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSavingDish) setEditingDish(null);
          }}
        >
          <div className="w-full max-w-md rounded-[32px] border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display text-lg font-bold text-white">
                Edit Dish: {editingDish.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingDish(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedDish} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300">Dish Name</label>
                <input
                  type="text"
                  required
                  value={editingDish.name}
                  onChange={(e) => setEditingDish({ ...editingDish, name: e.target.value })}
                  className="mt-1 min-h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300">Category</label>
                  <input
                    type="text"
                    required
                    value={editingDish.category}
                    onChange={(e) => setEditingDish({ ...editingDish, category: e.target.value as any })}
                    className="mt-1 min-h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300">
                    Price ({drawerRestaurant.currency})
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingDish.price}
                    onChange={(e) => setEditingDish({ ...editingDish, price: Number(e.target.value) })}
                    className="mt-1 min-h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white font-mono focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={editingDish.description || ""}
                  onChange={(e) => setEditingDish({ ...editingDish, description: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300">Tag / Badge</label>
                  <input
                    type="text"
                    value={editingDish.tag || ""}
                    onChange={(e) => setEditingDish({ ...editingDish, tag: e.target.value })}
                    placeholder="e.g. Hot Seller"
                    className="mt-1 min-h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300">Prep Time (min)</label>
                  <input
                    type="number"
                    value={editingDish.prepTimeMinutes || 12}
                    onChange={(e) => setEditingDish({ ...editingDish, prepTimeMinutes: Number(e.target.value) })}
                    className="mt-1 min-h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300">Image URL</label>
                <input
                  type="url"
                  value={editingDish.imageUrl || ""}
                  onChange={(e) => setEditingDish({ ...editingDish, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="mt-1 min-h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white font-mono focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingDish.available ?? true}
                    onChange={(e) => setEditingDish({ ...editingDish, available: e.target.checked })}
                    className="h-4 w-4 rounded accent-amber-500"
                  />
                  <span className="font-bold text-slate-300">Available for Ordering</span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDish(null)}
                    className="min-h-10 rounded-full px-4 text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingDish}
                    className="min-h-10 rounded-full bg-amber-500 px-5 text-xs font-black text-slate-950 hover:bg-amber-400 transition"
                  >
                    {isSavingDish ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Dish Modal */}
      {isAddingDish && drawerRestaurant && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSavingDish) setIsAddingDish(false);
          }}
        >
          <div className="w-full max-w-md rounded-[32px] border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display text-lg font-bold text-white">
                Add Dish to {drawerRestaurant.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingDish(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateNewDish} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300">Dish Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Peri Peri Loaded Pizza"
                  value={newDishForm.name}
                  onChange={(e) => setNewDishForm({ ...newDishForm, name: e.target.value })}
                  className="mt-1 min-h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300">Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pizzas"
                    value={newDishForm.category}
                    onChange={(e) => setNewDishForm({ ...newDishForm, category: e.target.value })}
                    className="mt-1 min-h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300">
                    Price ({drawerRestaurant.currency})
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newDishForm.price}
                    onChange={(e) => setNewDishForm({ ...newDishForm, price: e.target.value })}
                    className="mt-1 min-h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white font-mono focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300">Description</label>
                <textarea
                  rows={2}
                  placeholder="Ingredients, crust type, portion size..."
                  value={newDishForm.description}
                  onChange={(e) => setNewDishForm({ ...newDishForm, description: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300">Tag / Badge</label>
                  <input
                    type="text"
                    value={newDishForm.tag}
                    onChange={(e) => setNewDishForm({ ...newDishForm, tag: e.target.value })}
                    placeholder="e.g. Chef Choice"
                    className="mt-1 min-h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300">Prep Time (min)</label>
                  <input
                    type="number"
                    value={newDishForm.prepTimeMinutes}
                    onChange={(e) => setNewDishForm({ ...newDishForm, prepTimeMinutes: e.target.value })}
                    className="mt-1 min-h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300">Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newDishForm.imageUrl}
                  onChange={(e) => setNewDishForm({ ...newDishForm, imageUrl: e.target.value })}
                  className="mt-1 min-h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white font-mono focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddingDish(false)}
                  className="min-h-10 rounded-full px-4 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingDish}
                  className="min-h-10 rounded-full bg-amber-500 px-5 text-xs font-black text-slate-950 hover:bg-amber-400 transition"
                >
                  {isSavingDish ? "Adding Dish..." : "Add to Menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. Order History Purge Modal */}
      {/* ========================================================================= */}
      {purgeRestaurant && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPurgingOrders) {
              setPurgeRestaurant(null);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-[32px] border border-rose-500/40 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <AlertTriangleIcon size={24} />
              </span>
              <div>
                <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-mono font-bold text-rose-400">
                  Tenant Isolation
                </span>
                <h3 className="font-display mt-1 text-xl font-black text-white">
                  Clean Orders: {purgeRestaurant.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Orders belonging strictly to <strong className="text-white">{purgeRestaurant.name}</strong> will be wiped. Other restaurants are untouched.
                </p>
              </div>
            </div>

            {/* Order Count & CSV Download Option */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400">Current Orders On File:</p>
                <p className="text-lg font-black text-white">
                  {purgeOrderCount === null ? "Checking..." : `${purgeOrderCount} orders recorded`}
                </p>
              </div>

              <a
                href={`/api/dev/restaurants/${purgeRestaurant.id}/orders?format=csv`}
                target="_blank"
                rel="noreferrer"
                download={`${purgeRestaurant.slug}-orders-backup.csv`}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
              >
                <DownloadIcon size={14} />
                <span>Export CSV Backup</span>
              </a>
            </div>

            {/* Wipe Mode Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">Select Wipe Scope:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPurgeMode("factory_reset")}
                  className={`rounded-2xl border p-3.5 text-left transition ${
                    purgeMode === "factory_reset"
                      ? "border-rose-500 bg-rose-950/40 text-white ring-1 ring-rose-500"
                      : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <p className="text-xs font-black">Full Factory Reset</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Deletes 100% of orders &amp; ticket history for this restaurant.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPurgeMode("active_only")}
                  className={`rounded-2xl border p-3.5 text-left transition ${
                    purgeMode === "active_only"
                      ? "border-amber-500 bg-amber-950/40 text-white ring-1 ring-amber-500"
                      : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <p className="text-xs font-black">Active Tickets Only</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Clears cooking queue &amp; resets tables. Preserves served revenue.
                  </p>
                </button>
              </div>
            </div>

            {/* Safety Confirmation Input */}
            <div>
              <label htmlFor="confirm-purge-input" className="block text-xs font-bold text-slate-300">
                To confirm, type <span className="font-mono text-rose-400">CONFIRM</span> below:
              </label>
              <input
                id="confirm-purge-input"
                type="text"
                value={purgeConfirmInput}
                onChange={(e) => setPurgeConfirmInput(e.target.value)}
                placeholder="CONFIRM"
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-mono text-white focus:border-rose-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isPurgingOrders}
                onClick={() => setPurgeRestaurant(null)}
                className="min-h-11 rounded-full px-5 py-2 text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPurgingOrders || purgeConfirmInput.trim().toUpperCase() !== "CONFIRM"}
                onClick={handleExecutePurge}
                className="min-h-11 rounded-full bg-rose-600 px-6 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-rose-500 disabled:opacity-40 transition shadow-lg shadow-rose-600/30"
              >
                {isPurgingOrders ? "Purging Orders..." : "Permanently Wipe Orders"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
