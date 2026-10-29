"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTableByToken, setActiveGuestSession } from "@/lib/tables";

export default function TenantTokenResolverPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params?.slug === "string" ? params.slug : "heatbox";
  const token = typeof params?.token === "string" ? params.token : "";

  useEffect(() => {
    if (!token) return;
    const found = getTableByToken(token);
    if (found) {
      setActiveGuestSession({
        tableNumber: found.tableNumber,
        token: found.token,
        activatedAt: Date.now(),
      });
      router.replace(`/r/${slug}?table=${found.tableNumber}`);
      return;
    }
    router.replace(`/r/${slug}`);
  }, [slug, token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        <p className="mt-3 text-xs font-bold text-slate-400">Verifying Table Stand...</p>
      </div>
    </div>
  );
}
