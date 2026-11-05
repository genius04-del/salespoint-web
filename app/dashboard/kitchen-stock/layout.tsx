"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Stock Journal", href: "/dashboard/kitchen-stock/production" },
  { label: "Ingredients", href: "/dashboard/kitchen-stock/ingredients" },
];

export default function KitchenStockLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#071A2F]">Kitchen Stock</h1>
      <p className="mb-4 text-sm text-gray-500">What the kitchen produces, and what it has in stock.</p>
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-gray-200">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
                active ? "border-[#FF6B00] text-[#FF6B00]" : "border-transparent text-gray-600 hover:text-[#071A2F]"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
