"use client";

import { useEffect, useState } from "react";
import { getBusiness, updateBusiness } from "@/lib/api/business";
import { useAuth } from "@/contexts/AuthContext";
import { resetRestaurantModeCache } from "@/lib/useRestaurantMode";

export default function RestaurantModePage() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { business } = await getBusiness();
        if (!cancelled) setEnabled(business.restaurantModeEnabled);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle() {
    if (enabled === null) return;
    setBusy(true);
    setError("");
    try {
      const { business } = await updateBusiness({ restaurantModeEnabled: !enabled });
      setEnabled(business.restaurantModeEnabled);
      resetRestaurantModeCache();
      // Reload so the sidebar picks up the change straight away.
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-2xl font-bold text-[#071A2F]">Restaurant Mode</h1>
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <p className="text-sm text-gray-600">
          Turn this on for restaurants, bars and eateries. It adds <b>Tables</b> (open a tab per
          table or takeaway) and a <b>Kitchen</b> board where orders move from New to Preparing to
          Ready. Shops that don&apos;t need it never see these screens.
        </p>
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {enabled === null && !error && <p className="text-sm text-gray-500">Loading…</p>}
        {enabled !== null && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#071A2F]">
              Currently {enabled ? "ON" : "OFF"}
            </span>
            {isOwner ? (
              <button
                onClick={toggle}
                disabled={busy}
                className="rounded-lg bg-[#FF6B00] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Saving…" : enabled ? "Turn off" : "Turn on"}
              </button>
            ) : (
              <span className="text-xs text-gray-500">Only the owner can change this.</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}