"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, CircleAlert, CircleCheck, ExternalLink, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPaystackSettings,
  updatePaystackSettings,
  deletePaystackSettings,
  type PaystackSettingsStatus,
} from "@/lib/api/business";
import { ApiError } from "@/lib/apiClient";

export default function PaystackSettingsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";

  const [status, setStatus] = useState<PaystackSettingsStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [publicKey, setPublicKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Wrapped in an IIFE rather than calling setState directly in the
    // effect body — see the matching comment in
    // app/dashboard/products/page.tsx for why.
    (async () => {
      if (!isOwner) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await getPaystackSettings();
        setStatus(res);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load settings.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isOwner]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!publicKey.trim() || !secretKey.trim()) {
      return setError("Enter both your public key and secret key.");
    }

    setIsSaving(true);
    try {
      const res = await updatePaystackSettings({
        publicKey: publicKey.trim(),
        secretKey: secretKey.trim(),
      });
      setStatus(res);
      setSecretKey(""); // never keep the secret key sitting in state longer than needed
      setSuccessMessage("Paystack connected. Customer payments will now settle to your account.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save these keys.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Paystack? Customers won't be able to pay by Paystack until you reconnect.")) return;
    setError(null);
    try {
      const res = await deletePaystackSettings();
      setStatus({ publicKey: null, isConfigured: res.isConfigured, configuredAt: null });
      setPublicKey("");
      setSuccessMessage("Paystack disconnected.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not disconnect Paystack.");
    }
  }

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-lg rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
        <p className="text-gray-600">Only the business owner can manage Paystack settings.</p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-xl font-bold text-primary-navy">Paystack Settings</h1>
      <p className="mb-5 text-sm text-gray-500">
        Connect your own Paystack account so customer payments settle directly to your bank
        account — not a shared account.
      </p>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : (
        <>
          {status?.isConfigured && (
            <div className="mb-5 rounded-xl bg-success/5 p-4 ring-1 ring-success/20">
              <div className="mb-1 flex items-center gap-2 text-success">
                <CircleCheck size={18} />
                <span className="font-semibold">Paystack connected</span>
              </div>
              <p className="break-all text-xs text-gray-500">Public key: {status.publicKey}</p>
              {status.configuredAt && (
                <p className="text-xs text-gray-400">
                  Connected {new Date(status.configuredAt).toLocaleDateString("en-GH", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
              <button
                onClick={handleDisconnect}
                className="mt-3 text-xs font-medium text-danger hover:underline"
              >
                Disconnect Paystack
              </button>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
              <CircleCheck size={18} className="mt-0.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="mb-3 font-semibold text-primary-navy">
              {status?.isConfigured ? "Replace keys" : "Connect Paystack"}
            </h2>

            <div className="mb-4 flex items-start gap-2 rounded-lg bg-app-background px-3 py-2.5 text-xs text-gray-600">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-gray-400" />
              <span>
                Don&apos;t have a Paystack account yet?{" "}
                <a
                  href="https://dashboard.paystack.com/#/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 font-medium text-brand-orange hover:underline"
                >
                  Sign up free <ExternalLink size={11} />
                </a>{" "}
                and verify your bank account with them first. Find your keys under Settings → API
                Keys &amp; Webhooks in your Paystack dashboard. Use your <strong>Test</strong> keys
                while trying this out.
              </span>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                  <CircleAlert size={18} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className={labelClass}>Public key</label>
                <input
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  placeholder="pk_test_…"
                  className={inputClass}
                  autoComplete="off"
                />
              </div>

              <div>
                <label className={labelClass}>Secret key</label>
                <div className="relative">
                  <input
                    type={showSecretKey ? "text" : "password"}
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="sk_test_…"
                    className={`${inputClass} pr-10`}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                    aria-label={showSecretKey ? "Hide secret key" : "Show secret key"}
                  >
                    {showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Stored encrypted. We never display it again after saving.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-lg bg-brand-orange px-4 py-2.5 font-semibold text-white transition hover:bg-light-orange disabled:opacity-60"
              >
                {isSaving ? "Saving…" : status?.isConfigured ? "Replace Keys" : "Connect Paystack"}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
