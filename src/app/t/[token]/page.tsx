"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTableByToken, setActiveGuestSession, TableEntry } from "@/lib/tables";

export default function TokenResolverPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params?.token === "string" ? params.token : "";

  const [table, setTable] = useState<TableEntry | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!token) return;
    const found = getTableByToken(token);
    setTable(found);
    setHasChecked(true);

    if (found) {
      // Save session locked to this table
      setActiveGuestSession({
        tableNumber: found.tableNumber,
        token: found.token,
        activatedAt: Date.now(),
      });
      // Redirect to main order portal locked to this table
      router.replace(`/?table=${found.tableNumber}`);
    }
  }, [token, router]);

  if (!hasChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffaf1] p-4 text-slate-900">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">
            Verifying Table QR Stand...
          </p>
        </div>
      </div>
    );
  }

  // If token is invalid or does not exist
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fffaf1] p-4 text-slate-900">
      <div className="w-full max-w-md rounded-[32px] border border-rose-200 bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-3xl text-rose-600">
          ⚠️
        </div>
        <h2 className="mt-4 text-2xl font-black text-slate-900">
          Invalid or Expired QR Code
        </h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          The scanned QR token <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-rose-600">{token}</code> is not registered to an active dining table at Sunshine Bistro.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left text-xs text-slate-600 space-y-2">
          <p className="font-bold text-slate-800">🛡️ Anti-Tamper Protection Active:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Ensure you scan the physical QR stand placed directly on your table.</li>
            <li>Do not modify URL parameters.</li>
            <li>If the stand was replaced, ask your server for assistance.</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-6 w-full rounded-full bg-slate-900 py-3 text-xs font-black text-white hover:bg-slate-800 transition"
        >
          Return to Guest Homepage
        </button>
      </div>
    </div>
  );
}
