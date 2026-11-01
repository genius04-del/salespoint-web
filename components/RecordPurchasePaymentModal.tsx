"use client";

import { useState } from "react";
import { X, CircleAlert } from "lucide-react";
import type { SalePaymentMethod } from "@/lib/types";
import { recordPurchasePayment } from "@/lib/api/purchases";
import { ApiError } from "@/lib/apiClient";

const METHODS: { value: Exclude<SalePaymentMethod, "PAYSTACK">; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "OTHER", label: "Other" },
];

interface RecordPurchasePaymentModalProps {
  purchaseId: string;
  outstanding: number;
  onClose: () => void;
  onRecorded: () => void;
}

export function RecordPurchasePaymentModal({
  purchaseId,
  outstanding,
  onClose,
  onRecorded,
}: RecordPurchasePaymentModalProps) {
  const [amount, setAmount] = useState(outstanding.toFixed(2));
  const [method, setMethod] = useState<Exclude<SalePaymentMethod, "PAYSTACK">>("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError("Enter an amount greater than 0.");
    if (amt > outstanding) return setError(`Payment exceeds the outstanding balance (GHS ${outstanding.toFixed(2)}).`);

    setIsSaving(true);
    try {
      await recordPurchasePayment(purchaseId, {
        amount: amt,
        method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onRecorded();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record this payment.");
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-navy">Record Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              <CircleAlert size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className={labelClass}>Amount (outstanding: GHS {outstanding.toFixed(2)})</label>
            <input
              type="number"
              min="0"
              step="0.01"
              max={outstanding}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as Exclude<SalePaymentMethod, "PAYSTACK">)}
              className={`${inputClass} bg-white`}
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Reference (optional)</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Notes (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-lg bg-brand-orange px-4 py-2.5 font-semibold text-white transition hover:bg-light-orange disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
