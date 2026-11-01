"use client";

import { useEffect, useState } from "react";
import { getBusiness } from "@/lib/api/business";

// Cached so the sidebar, home tiles and pages don't each refetch /business.
let cached: boolean | null = null;
let inflight: Promise<boolean> | null = null;

export function resetRestaurantModeCache() {
  cached = null;
  inflight = null;
}

function load(): Promise<boolean> {
  if (cached !== null) return Promise.resolve(cached);
  if (!inflight) {
    inflight = getBusiness()
      .then(({ business }) => (cached = business.restaurantModeEnabled))
      .catch(() => false)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** true / false once known, null while loading. */
export function useRestaurantMode(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(cached);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const v = await load();
      if (!cancelled) setEnabled(v);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return enabled;
}