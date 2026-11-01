"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const BUSINESS_TYPES: { value: string; label: string }[] = [
  { value: "provision_store", label: "Provision Store" },
  { value: "restaurant", label: "Restaurant" },
  { value: "bar", label: "Bar" },
  { value: "mini_mart", label: "Mini-Mart / Supermarket" },
  { value: "clothing", label: "Clothing Shop" },
  { value: "cosmetics", label: "Cosmetics Shop" },
  { value: "electronics", label: "Electronics / Phone Shop" },
  { value: "general", label: "Other Retail" },
];

export default function RegisterPage() {
  const { status, registerBusiness, isSubmitting, errorMessage, clearError } = useAuth();
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("provision_store");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    const success = await registerBusiness({
      businessName: businessName.trim(),
      businessType,
      currency: "GHS",
      ownerName: ownerName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      password,
    });
    if (success) router.replace("/dashboard");
  }

  const shownError = localError ?? errorMessage;

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-background px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-primary-navy">Create your business</h1>
          <p className="text-sm text-gray-500">Set up SalesPoint for your shop in a minute.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5"
        >
          {shownError && (
            <div className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              <CircleAlert size={18} className="mt-0.5 shrink-0" />
              <span>{shownError}</span>
            </div>
          )}

          <fieldset className="space-y-4">
            <legend className="mb-1 text-sm font-semibold text-primary-navy">Business details</legend>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Business name</label>
              <input
                required
                value={businessName}
                onChange={(e) => {
                  setBusinessName(e.target.value);
                  clearError();
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Business type</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-1 text-sm font-semibold text-primary-navy">Owner account</legend>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Your full name</label>
              <input
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone (optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Confirm password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
                />
              </div>
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand-orange px-4 py-2.5 font-semibold text-white transition hover:bg-light-orange disabled:opacity-60"
          >
            {isSubmitting ? "Creating your business…" : "Create Business & Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-orange hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
