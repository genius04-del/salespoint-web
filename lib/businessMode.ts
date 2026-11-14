"use client";

import { useEffect, useState } from "react";
import { getBusiness } from "@/lib/api/business";

// Restaurant features (tables, kitchen, recipes, day-end deduction) are for
// restaurants and bars only. A provision store or any other shop should never
// see them, so the sidebar, home tiles and settings tabs all read this.
export interface BusinessMode {
  loaded: boolean;
  restaurantMode: boolean; // the restaurant features are on
  restaurantType: boolean; // the business type is a restaurant or bar (it may switch them on)
  deductAtDayEnd: boolean;
}

export function isRestaurantType(businessType: string | null | undefined): boolean {
  return /restaurant|\bbar\b|cafe|café|eatery|kitchen|chop ?bar|canteen|bakery|pizz|fast ?food/i.test(businessType ?? "");
}

const NOT_LOADED: BusinessMode = { loaded: false, restaurantMode: false, restaurantType: false, deductAtDayEnd: false };

// One fetch shared by everything on the page, refreshed after a settings change.
let cached: Promise<BusinessMode> | null = null;
const listeners = new Set<() => void>();

function load(): Promise<BusinessMode> {
  if (!cached) {
    cached = getBusiness()
      .then((res) => {
        const b = res.business as unknown as { businessType?: string; restaurantModeEnabled?: boolean; deductStockAtDayEnd?: boolean };
        return {
          loaded: true,
          restaurantMode: !!b.restaurantModeEnabled,
          restaurantType: isRestaurantType(b.businessType),
          deductAtDayEnd: !!b.restaurantModeEnabled && !!b.deductStockAtDayEnd,
        };
      })
      .catch(() => {
        cached = null; // try again next time; meanwhile show the shop view
        return { ...NOT_LOADED, loaded: true };
      });
  }
  return cached;
}

export function resetBusinessMode() {
  cached = null;
  listeners.forEach((l) => l());
}

export function useBusinessMode(): BusinessMode {
  const [mode, setMode] = useState<BusinessMode>(NOT_LOADED);
  useEffect(() => {
    let alive = true;
    const run = () => {
      (async () => {
        const m = await load();
        if (alive) setMode(m);
      })();
    };
    run();
    listeners.add(run);
    return () => {
      alive = false;
      listeners.delete(run);
    };
  }, []);
  return mode;
}

// Titles of sidebar/home items that only exist for restaurants.
const RESTAURANT_ONLY = new Set(["Kitchen", "Tables", "Recipes", "Kitchen Stock", "Production"]);
// These two only apply once "Deduct sales from stock at day end" is switched on.
const DAY_END_DEDUCTION = new Set(["Deduct Sales", "Stock Adjustment"]);

// True when a nav item must be hidden for this business.
export function useIsNavHidden(): (title: string) => boolean {
  const mode = useBusinessMode();
  return (title: string) => {
    if (RESTAURANT_ONLY.has(title)) return !mode.restaurantMode;
    if (DAY_END_DEDUCTION.has(title)) return !mode.deductAtDayEnd;
    return false;
  };
}
