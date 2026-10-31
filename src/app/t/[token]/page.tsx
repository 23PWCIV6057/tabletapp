"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { setActiveGuestSession } from "@/lib/tables";
import { AlertTriangleIcon } from "@/components/Icons";

export default function TokenResolverPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params?.token === "string" ? params.token : "";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    async function resolveTokenServer() {
      try {
        const res = await fetch(`/api/restaurants/heatbox/tables/resolve-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (!isMounted) return;

        if (res.ok && data.success) {
          setActiveGuestSession({
            tableNumber: data.tableNumber,
            token,
            capabilityToken: data.capabilityToken,
            activatedAt: Date.now(),
          });
          router.replace(`/?table=${data.tableNumber}`);
          return;
        }

        setError(data.error || "Invalid or unrecognized table stand.");
      } catch {
        if (isMounted) setError("Network error resolving table stand.");
      }
    }

    resolveTokenServer();
    return () => {
      isMounted = false;
    };
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4 text-slate-900">
      <div className="text-center max-w-sm">
        {!error ? (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <p className="mt-3 text-xs font-bold text-slate-500">Verifying Table Stand...</p>
          </>
        ) : (
          <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-center">
            <AlertTriangleIcon className="mx-auto h-8 w-8 text-red-600 mb-2" />
            <h2 className="text-base font-bold text-red-900">Unrecognized Table Stand</h2>
            <p className="mt-2 text-xs text-red-700">{error}</p>
            <button
              onClick={() => router.replace("/")}
              className="mt-4 px-4 py-2 bg-slate-900 text-xs font-semibold text-white rounded-lg hover:bg-slate-800"
            >
              Continue to Main Menu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
