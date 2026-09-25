"use client";

import { useState } from "react";

const tabs = [
  { id: "guest", label: "Guest view" },
  { id: "kitchen", label: "Kitchen board" },
  { id: "owner", label: "Owner dashboard" },
] as const;

const menu = [
  {
    category: "Starters",
    items: [
      { name: "Crispy Calamari", price: 12.5, tag: "Popular" },
      { name: "Truffle Fries", price: 8.5, tag: "Chef pick" },
      { name: "House Salad", price: 9.0, tag: "Fresh" },
    ],
  },
  {
    category: "Mains",
    items: [
      { name: "Grilled Chicken Bowl", price: 18.0, tag: "Healthy" },
      { name: "Spicy Ribeye", price: 29.0, tag: "Signature" },
      { name: "Wild Mushroom Pasta", price: 22.5, tag: "Vegetarian" },
    ],
  },
  {
    category: "Desserts",
    items: [
      { name: "Lava Cake", price: 9.5, tag: "Hot" },
      { name: "Berry Cheesecake", price: 8.0, tag: "Sweet" },
    ],
  },
];

const orders = [
  { table: 4, items: "2 Ribeye, 1 Fries", time: "2 min ago", status: "New" },
  { table: 7, items: "1 Pasta, 2 Soda", time: "6 min ago", status: "Preparing" },
  { table: 9, items: "3 Chicken Bowl", time: "11 min ago", status: "Ready" },
  { table: 11, items: "1 Salad, 1 Dessert", time: "14 min ago", status: "New" },
];

const serviceRequests = [
  { table: 3, type: "Refill", minutes: 1 },
  { table: 6, type: "Call waiter", minutes: 4 },
  { table: 8, type: "Condiments", minutes: 2 },
  { table: 10, type: "Bill", minutes: 6 },
];

const ownerMenu = [
  { name: "Grilled Chicken Bowl", price: 18, stock: true },
  { name: "Spicy Ribeye", price: 29, stock: true },
  { name: "House Salad", price: 9, stock: false },
  { name: "Lava Cake", price: 9.5, stock: true },
];

const summaryMetrics = [
  { label: "Tables served", value: "128", change: "+12%" },
  { label: "Avg. order value", value: "$34.20", change: "+8%" },
  { label: "Service requests", value: "26", change: "-3%" },
  { label: "Repeat guests", value: "71%", change: "+9%" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("guest");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fffaf1,_#f4efe9_35%,_#efe7dd_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 rounded-[28px] border border-slate-200 bg-white/80 p-5 shadow-[0_18px_52px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">TableTapp</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                Restaurant QR ordering platform
              </h1>
            </div>
            <div className="flex items-center gap-3 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 md:self-center">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Live pilot • 18 tables active
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <section className="mt-8">
          {activeTab === "guest" && (
            <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Table 7 • Sunshine Bistro</p>
                    <h2 className="mt-2 text-2xl font-bold">Menu</h2>
                  </div>
                  <div className="rounded-full bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                    4 mins prep
                  </div>
                </div>

                <div className="space-y-6">
                  {menu.map((group) => (
                    <div key={group.category}>
                      <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                        {group.category}
                      </p>
                      <div className="space-y-3">
                        {group.items.map((item) => (
                          <div
                            key={item.name}
                            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="h-16 w-16 rounded-2xl bg-[linear-gradient(135deg,#f9d28b,#d97706)]" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <h3 className="font-semibold text-slate-900">{item.name}</h3>
                                <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white">
                                  {item.tag}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-slate-500">
                                Freshly prepared, served with house sauces.
                              </p>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-lg font-bold text-slate-900">${item.price.toFixed(2)}</span>
                                <button className="rounded-full bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-amber-500/40 transition hover:bg-amber-600">
                                  Add item
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="rounded-[28px] border border-slate-200 bg-slate-900 p-5 text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)] sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Your order</h2>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em]">
                    2 items
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-white/5 p-3">
                    <div>
                      <p className="font-medium">Grilled Chicken Bowl</p>
                      <p className="text-sm text-slate-300">Extra avocado</p>
                    </div>
                    <span className="font-semibold">$18.00</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/5 p-3">
                    <div>
                      <p className="font-medium">Lava Cake</p>
                      <p className="text-sm text-slate-300">Add ice cream</p>
                    </div>
                    <span className="font-semibold">$9.50</span>
                  </div>
                </div>

                <div className="mt-6 border-t border-white/10 pt-5">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Subtotal</span>
                    <span>$27.50</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
                    <span>Service fee</span>
                    <span>$1.50</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>$29.00</span>
                  </div>
                </div>

                <button className="mt-6 w-full rounded-full bg-emerald-500 px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400">
                  Place order
                </button>

                <button className="mt-3 w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10">
                  Need help? Call waiter
                </button>
              </aside>
            </div>
          )}

          {activeTab === "kitchen" && (
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={`${order.table}-${order.time}`}
                    className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                          Table {order.table}
                        </p>
                        <h3 className="mt-2 text-xl font-bold text-slate-900">{order.items}</h3>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                          order.status === "New"
                            ? "bg-rose-100 text-rose-700"
                            : order.status === "Preparing"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 text-sm text-slate-500">
                      <span>{order.time}</span>
                      <div className="flex gap-2">
                        <button className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100">
                          Preparing
                        </button>
                        <button className="rounded-full bg-slate-900 px-3 py-1.5 font-semibold text-white hover:bg-slate-700">
                          Ready
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <aside className="rounded-[28px] border border-slate-200 bg-slate-900 p-5 text-white shadow-[0_18px_45px_rgba(15,23,42,0.16)] sm:p-6">
                <h2 className="text-xl font-bold">Service requests</h2>
                <div className="mt-5 space-y-3">
                  {serviceRequests.map((request) => (
                    <div key={`${request.table}-${request.type}`} className="rounded-2xl bg-white/5 p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">Table {request.table}</p>
                        <span className="text-xs uppercase tracking-[0.18em] text-slate-300">
                          {request.minutes} min
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-300">{request.type}</p>
                    </div>
                  ))}
                </div>

                <button className="mt-6 w-full rounded-full bg-amber-500 px-5 py-3 font-bold text-slate-900 transition hover:bg-amber-400">
                  Sound: on
                </button>
              </aside>
            </div>
          )}

          {activeTab === "owner" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                {summaryMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
                    <p className="text-sm text-slate-500">{metric.label}</p>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <span className="text-3xl font-black text-slate-900">{metric.value}</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                        {metric.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Menu manager</h2>
                    <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                      + Add item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {ownerMenu.map((item) => (
                      <div key={item.name} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div>
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <p className="text-sm text-slate-500">${item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                            Edit
                          </button>
                          <button
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${
                              item.stock ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {item.stock ? "In stock" : "Sold out"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-slate-900 p-5 text-white shadow-[0_18px_45px_rgba(15,23,42,0.16)] sm:p-6">
                  <h2 className="text-xl font-bold">QR print ready</h2>
                  <div className="mt-5 rounded-3xl bg-white p-4 text-slate-900">
                    <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      QR Code
                    </div>
                  </div>
                  <div className="mt-5 space-y-2 text-sm text-slate-300">
                    <p>All tables configured for the dinner service.</p>
                    <p>Active token set: 18 / 18</p>
                    <p>Domain: sunshinebistro.com</p>
                  </div>
                  <button className="mt-6 w-full rounded-full bg-white px-5 py-3 font-bold text-slate-900 transition hover:bg-slate-200">
                    Print QR stand sheet
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
