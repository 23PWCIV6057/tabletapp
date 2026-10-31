"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { setActiveGuestSession } from "@/lib/tables";

export default function TenantTokenResolverPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params?.slug === "string" ? params.slug : "heatbox";
  const token = typeof params?.token === "string" ? params.token : "";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    async function resolveTokenServer() {
      try {
        const res = await fetch(`/api/restaurants/${encodeURIComponent(slug)}/tables/resolve-token`, {
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
          router.replace(`/r/${slug}?table=${data.tableNumber}`);
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
  }, [slug, token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white p-4">
      <div className="text-center max-w-sm">
        {!error ? (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <p className="mt-3 text-xs font-bold text-slate-400">Verifying Table Stand...</p>
          </>
        ) : (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-5">
            <h2 className="text-base font-bold text-red-400">Invalid Table Stand</h2>
            <p className="mt-2 text-xs text-slate-300">{error}</p>
            <button
              onClick={() => router.replace(`/r/${slug}`)}
              className="mt-4 px-4 py-2 bg-slate-800 text-xs font-semibold rounded-lg hover:bg-slate-700"
            >
              Continue as Walk-In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
