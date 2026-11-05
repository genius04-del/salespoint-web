"use client";

import { useEffect, useState } from "react";
import { getBusiness, updateBusiness } from "@/lib/api/business";
import { errMsg } from "@/components/kitchen/format";

export default function RestaurantSettingsPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setEnabled((await getBusiness()).business.restaurantModeEnabled);
      } catch (e) {
        setError(errMsg(e, "Could not load settings"));
      }
    })();
  }, []);

  async function toggle() {
    if (enabled === null) return;
    setBusy(true);
    setError("");
    try {
      const res = await updateBusiness({ restaurantModeEnabled: !enabled });
      setEnabled(res.business.restaurantModeEnabled);
    } catch (e) {
      setError(errMsg(e, "Could not change this. Only the owner can."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-[#071A2F]">Restaurant mode</h2>
            <p className="mt-1 text-sm text-gray-500">
              Turns on tables, open tabs, the kitchen order board, kitchen recipes and the stock journal. Switch it off for a plain shop till.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={!!enabled}
            disabled={busy || enabled === null}
            onClick={toggle}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${enabled ? "bg-[#FF6B00]" : "bg-gray-300"} disabled:opacity-50`}
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${enabled ? "left-5" : "left-0.5"}`} />
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {enabled && <p className="mt-3 text-sm text-green-700">Restaurant mode is on.</p>}
      </div>
    </div>
  );
}
