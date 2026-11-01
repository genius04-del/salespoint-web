"use client";

import { useState } from "react";
import { X, CircleAlert } from "lucide-react";
import type { Account } from "@/lib/types";
import { createExpense } from "@/lib/api/finance";
import { ApiError } from "@/lib/apiClient";

interface ExpenseFormModalProps {
  accounts: Account[];
  onClose: () => void;
  onSaved: () => void;
}

export function ExpenseFormModal({ accounts, onClose, onSaved }: ExpenseFormModalProps) {
  const expenseAccounts = accounts.filter((a) => a.type === "EXPENSE" && a.isActive);
  // Where the money actually came from — Cash, Bank, Mobile Money, etc.
  const paymentAccounts = accounts.filter((a) => a.type === "ASSET" && a.isActive);

  const [categoryAccountId, setCategoryAccountId] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!categoryAccountId) return setError("Select what this expense was for.");
    if (!paymentAccountId) return setError("Select where the money came from.");
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError("Enter an amount greater than 0.");

    setIsSaving(true);
    try {
      await createExpense({
        categoryAccountId,
        paymentAccountId,
        amount: amt,
        description: description.trim() || undefined,
        reference: reference.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record this expense.");
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
          <h2 className="text-lg font-semibold text-primary-navy">Record Expense</h2>
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
            <label className={labelClass}>What was this for?</label>
            <select
              value={categoryAccountId}
              onChange={(e) => setCategoryAccountId(e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="">Select a category…</option>
              {expenseAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Paid from</label>
            <select
              value={paymentAccountId}
              onChange={(e) => setPaymentAccountId(e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="">Select an account…</option>
              {paymentAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Amount (GHS)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Description (optional)</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Reference (optional)</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} />
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
              {isSaving ? "Saving…" : "Record Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
