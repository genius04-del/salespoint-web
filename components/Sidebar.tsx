"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useComingSoon } from "@/components/ComingSoonProvider";
import { NAV_ITEMS } from "@/lib/navItems";
import { BranchSwitcher } from "@/components/BranchSwitcher";

/**
 * Shared between the fixed desktop sidebar and the mobile slide-in drawer
 * (app/dashboard/layout.tsx renders this twice with different wrapper
 * chrome) — the nav list itself is identical either way.
 */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { hasPermission } = useAuth();
  const showComingSoon = useComingSoon();
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.permission === null || hasPermission(item.permission)
  );

  return (
    <div className="flex h-full flex-col bg-primary-navy text-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange">
          <Store size={18} />
        </span>
        <div>
          <p className="text-sm font-bold tracking-wide">SALEPOINT</p>
          <p className="text-[11px] text-white/50">Simple. Fast. Powerful.</p>
        </div>
      </div>

      <BranchSwitcher onNavigate={onNavigate} />

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href ? pathname === item.href : false;
          const itemClass = `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
            isActive ? "bg-brand-orange text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
          }`;

          return item.href ? (
            <Link key={item.title} href={item.href} onClick={onNavigate} className={itemClass}>
              <Icon size={18} />
              {item.title}
            </Link>
          ) : (
            <button
              key={item.title}
              onClick={() => {
                showComingSoon(item.title);
                onNavigate?.();
              }}
              className={`${itemClass} w-full text-left`}
            >
              <Icon size={18} />
              {item.title}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-center text-[11px] text-white/40">
        <p>SalesPoint by</p>
        <p className="font-medium text-white/60">LoneWolf Digital Technology Solutions</p>
      </div>
    </div>
  );
}
