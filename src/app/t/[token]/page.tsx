"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getStoredTables,
  getTableByToken,
  saveStoredTables,
  setActiveGuestSession,
  TableEntry,
} from "@/lib/tables";
import { fetchTableTokensFromSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { AlertTriangleIcon, ShieldCheckIcon } from "@/components/Icons";

export default function TokenResolverPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params?.token === "string" ? params.token : "";

  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!token) return;

    async function verifyStandToken() {
      let found: TableEntry | null = getTableByToken(token);

      if (!found && isSupabaseConfigured()) {
        const cloudTokens = await fetchTableTokensFromSupabase();
        if (cloudTokens && cloudTokens.length > 0) {
          const currentTables = getStoredTables();
          const merged = currentTables.map((t) => {
            const match = cloudTokens.find((ct) => ct.tableNumber === t.tableNumber);
            return match ? { ...t, token: match.token } : t;
          });
          saveStoredTables(merged);
          found = merged.find((t) => t.token === token.trim()) || null;
        }
      }

      if (found) {
        setActiveGuestSession({
          tableNumber: found.tableNumber,
          token: found.token,
          activatedAt: Date.now(),
        });
        router.replace(`/?table=${found.tableNumber}`);
        return;
      }

      setHasChecked(true);
    }

    verifyStandToken();
  }, [token, router]);

  if (!hasChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4 text-slate-900">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-600">
            Verifying Table QR Stand...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4 text-slate-900">
      <div className="w-full max-w-md rounded-[32px] border border-rose-200 bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
          <AlertTriangleIcon size={32} />
        </div>
        <h2 className="font-display mt-4 text-2xl font-bold text-slate-900">
          Invalid or Expired QR Code
        </h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          The scanned QR token{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-rose-700">
            {token}
          </code>{" "}
          is not registered to an active dining table at Heat Box Pizza.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-xs text-slate-600 space-y-2">
          <p className="flex items-center gap-1.5 font-bold text-slate-800">
            <ShieldCheckIcon size={16} className="text-amber-600" />
            <span>Anti-Tamper Protection Active:</span>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Ensure you scan the physical QR stand placed directly on your table.</li>
            <li>Do not modify URL parameters.</li>
            <li>If the stand was replaced, ask your server for assistance.</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-6 min-h-11 w-full rounded-full bg-slate-900 py-3 text-xs font-black text-white hover:bg-slate-800 transition"
        >
          Return to Guest Homepage
        </button>
      </div>
    </div>
  );
}
