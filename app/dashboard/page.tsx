"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useComingSoon } from "@/components/ComingSoonProvider";
import { NAV_ITEMS } from "@/lib/navItems";
import { useRestaurantMode } from "@/lib/useRestaurantMode";
 import { useIsNavHidden } from "@/lib/businessMode";

// The "Dashboard" item itself isn't a tile on its own home screen.
const HOME_TILES = NAV_ITEMS.filter((item) => item.title !== "Dashboard");

export default function DashboardPage() {
  const { hasPermission } = useAuth();
  const showComingSoon = useComingSoon();
   const isHidden = useIsNavHidden();

  const restaurantMode = useRestaurantMode();

  const visibleItems = HOME_TILES.filter(
    (item) =>
      (item.permission === null || hasPermission(item.permission)) &&
      (!item.restaurantOnly || restaurantMode === true) &&
      (!isHidden || !("hidden" in item && item.hidden))
  );
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const tileClass =
          "group flex flex-col items-center justify-center gap-2.5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md";
        const tileContent = (
          <>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange transition group-hover:bg-brand-orange group-hover:text-white">
              <Icon size={22} strokeWidth={2} />
            </span>
            <span className="text-sm font-medium text-primary-navy">{item.title}</span>
          </>
        );

        return item.href ? (
          <Link key={item.title} href={item.href} className={tileClass}>
            {tileContent}
          </Link>
        ) : (
          <button key={item.title} onClick={() => showComingSoon(item.title)} className={tileClass}>
            {tileContent}
          </button>
        );
      })}
    </div>
  );
}
