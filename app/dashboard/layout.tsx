"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ComingSoonProvider } from "@/components/ComingSoonProvider";
import { Sidebar } from "@/components/Sidebar";
import { HelpBot } from "@/components/HelpBot";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status, user, logout } = useAuth();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-orange border-t-transparent" />
      </div>
    );
  }

  return (
    <ComingSoonProvider>
      <div className="flex min-h-screen bg-app-background">
        {/* Desktop sidebar — fixed, always visible from the sm breakpoint up. */}
        <aside className="hidden w-60 shrink-0 sm:block">
          <div className="fixed h-screen w-60">
            <Sidebar />
          </div>
        </aside>

        {/* Mobile sidebar — a slide-in drawer, toggled by the topbar's hamburger button. */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 sm:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative h-full w-64">
              <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute right-3 top-4 text-white/70 hover:text-white"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between bg-primary-navy px-4 py-3 text-white sm:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg p-1.5 hover:bg-white/10 sm:hidden"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
              <span className="font-semibold">
                {user ? `Hi, ${user.name.split(" ")[0]}` : "SalesPoint"}
              </span>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut size={16} />
              Log out
            </button>
          </header>

          <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">{children}</main>

          <footer className="border-t border-black/5 px-4 py-3 text-center text-xs text-gray-400 sm:px-6">
            SalesPoint by LoneWolf Digital Technology Solutions
          </footer>
        </div>
        <HelpBot audience="cashier" />
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h2 className="mb-2 text-lg font-semibold text-primary-navy">Log out?</h2>
            <p className="mb-4 text-sm text-gray-600">You&apos;ll need to log in again to continue.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await logout();
                  router.replace("/login");
                }}
                className="flex-1 rounded-lg bg-danger px-4 py-2 font-medium text-white"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </ComingSoonProvider>
  );
}
