"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Business", href: "/dashboard/settings/business" },
  { label: "Password", href: "/dashboard/settings/password" },
  { label: "Paystack", href: "/dashboard/settings/paystack" },
  { label: "Restaurant Mode", href: "/dashboard/settings/restaurant" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-primary-navy">Settings</h1>
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-gray-200">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
                active ? "border-brand-orange text-brand-orange" : "border-transparent text-gray-600 hover:text-primary-navy"
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
