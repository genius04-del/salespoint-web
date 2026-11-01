"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store, Eye, EyeOff, CircleAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { status, login, isSubmitting, errorMessage, clearError, forgotPassword } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await login(email, password);
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    try {
      await forgotPassword(resetEmail);
    } catch {
      // Intentionally ignored — the backend always returns a generic
      // success message by design, so there's nothing more specific to show.
    }
    setResetSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange text-white shadow-sm shadow-brand-orange/30">
            <Store size={26} strokeWidth={2.25} />
          </div>
          <h1 className="text-2xl font-bold tracking-wide text-primary-navy">SALEPOINT</h1>
          <p className="text-sm text-gray-500">Simple. Fast. Powerful.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5"
        >
          {errorMessage && (
            <div className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              <CircleAlert size={18} className="mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) clearError();
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) clearError();
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-brand-orange hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand-orange px-4 py-2.5 font-semibold text-white transition hover:bg-light-orange disabled:opacity-60"
          >
            {isSubmitting ? "Logging in…" : "Log In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have a business account?{" "}
          <Link href="/register" className="font-medium text-brand-orange hover:underline">
            Create one
          </Link>
        </p>
      </div>

      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            {resetSent ? (
              <>
                <h2 className="mb-2 text-lg font-semibold text-primary-navy">Check your email</h2>
                <p className="mb-4 text-sm text-gray-600">
                  If an account exists for that email, a password reset link has been sent.
                </p>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSent(false);
                    setResetEmail("");
                  }}
                  className="w-full rounded-lg bg-primary-navy px-4 py-2 font-medium text-white"
                >
                  Close
                </button>
              </>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <h2 className="mb-2 text-lg font-semibold text-primary-navy">Reset your password</h2>
                <p className="mb-4 text-sm text-gray-600">
                  Enter your account email and we&apos;ll send you a reset link.
                </p>
                <input
                  type="email"
                  required
                  autoFocus
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@business.com"
                  className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-brand-orange px-4 py-2 font-medium text-white"
                  >
                    Send link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
