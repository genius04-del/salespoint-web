"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, CircleAlert, TriangleAlert, X } from "lucide-react";
import { getPaystackStatus } from "@/lib/api/payments";
import { ApiError } from "@/lib/apiClient";

const POLL_INTERVAL_MS = 3000;
const AUTO_POLL_ATTEMPTS = 40; // ~2 minutes, then switch to manual-check-only

interface PaystackCheckoutModalProps {
  reference: string;
  authorizationUrl: string;
  amount: string;
  onSuccess: (saleId: string, reconciliationNeeded: boolean) => void;
  onCancel: () => void;
}

export function PaystackCheckoutModal({
  reference,
  authorizationUrl,
  amount,
  onSuccess,
  onCancel,
}: PaystackCheckoutModalProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoPollExhausted, setAutoPollExhausted] = useState(false);
  const attemptsRef = useRef(0);
  const poppedUpRef = useRef(false);

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      // Calling this itself triggers real verification against Paystack if
      // the backend still shows PENDING — not just reading a cached flag.
      const res = await getPaystackStatus(reference);
      if (res.status === "success" || res.status === "already_processed") {
        if (res.saleId) {
          onSuccess(res.saleId, !!res.reconciliationNeeded);
          return true;
        }
      } else if (res.status === "failed") {
        setError("This payment was not completed or was declined on Paystack.");
        return true;
      } else if (res.status === "not_found") {
        setError("Could not find this transaction. Please try again.");
        return true;
      }
    } catch (err) {
      // A transient network hiccup here shouldn't stop polling — only a
      // definitive failed/not_found status (handled above) does that.
      if (err instanceof ApiError && err.status === 0) {
        // network error — silently retry on the next tick
      } else {
        setError(err instanceof ApiError ? err.message : "Could not check payment status.");
        return true;
      }
    } finally {
      setIsChecking(false);
    }
    return false;
  }, [reference, onSuccess]);

  // Open Paystack's hosted checkout in a new tab as soon as this modal
  // mounts. Some browsers block the popup — the visible link/button below
  // is always shown too, so that's never the only way to proceed.
  useEffect(() => {
    if (poppedUpRef.current) return;
    poppedUpRef.current = true;
    window.open(authorizationUrl, "_blank", "noopener,noreferrer");
  }, [authorizationUrl]);

  useEffect(() => {
    if (autoPollExhausted || error) return;

    const interval = setInterval(async () => {
      attemptsRef.current += 1;
      const settled = await checkStatus();
      if (settled || attemptsRef.current >= AUTO_POLL_ATTEMPTS) {
        clearInterval(interval);
        if (!settled) setAutoPollExhausted(true);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [checkStatus, autoPollExhausted, error]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-navy">Paystack Payment</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {error ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            <CircleAlert size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            <p className="mb-1 text-sm text-gray-600">
             Complete the GHS {Number(amount).toFixed(2)} payment in the tab that just opened.
            </p>
            <p className="mb-4 text-xs text-gray-400">
              This page will update automatically once payment is confirmed.
            </p>

            <a
              href={authorizationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-4 flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink size={16} />
              Open payment page
            </a>

            {autoPollExhausted && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
                <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                <span>Still waiting — if you&apos;ve completed payment, tap Check Now below.</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-500">
              {!autoPollExhausted && (
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand-orange" />
              )}
              {autoPollExhausted ? "Waiting for your confirmation" : "Waiting for payment…"}
            </div>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700"
          >
            {error ? "Close" : "Cancel"}
          </button>
          {!error && (
            <button
              onClick={checkStatus}
              disabled={isChecking}
              className="flex-1 rounded-lg bg-brand-orange px-4 py-2.5 font-semibold text-white transition hover:bg-light-orange disabled:opacity-60"
            >
              {isChecking ? "Checking…" : "Check Now"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
