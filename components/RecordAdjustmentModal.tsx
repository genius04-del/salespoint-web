"use client";

import { useState } from "react";
import { X, CircleAlert } from "lucide-react";
import type { Product } from "@/lib/types";
import type { ManualMovementType } from "@/lib/api/inventory";
import { createMovement } from "@/lib/api/inventory";
import { ApiError } from "@/lib/apiClient";

const MOVEMENT_TYPES: { value: ManualMovementType; label: string; hint: string }[] = [
  { value: "ADJUSTMENT", label: "Adjustment", hint: "Stock count correction (e.g. after a physical count)" },
  { value: "DAMAGE", label: "Damage", hint: "Spoiled, broken, or otherwise unsellable stock" },
  { value: "RETURN", label: "Return", hint: "Stock coming back in (e.g. a customer return)" },
  { value: "OPENING_STOCK", label: "Opening Stock", hint: "Correcting an initial stock count" },
  { value: "TRANSFER", label: "Transfer", hint: "Stock moving to/from another location" },
];

interface RecordAdjustmentModalProps {
  products: Product[];
  onClose: () => void;
  onRecorded: () => void;
}

export function RecordAdjustmentModal({ products, onClose, onRecorded }: RecordAdjustmentModalProps) {
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<ManualMovementType>("ADJUSTMENT");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProduct = products.find((p) => p.id === productId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!productId) return setError("Select a product.");
    const qty = Number(quantity);
    if (!qty || qty <= 0) return setError("Enter a quantity greater than 0.");
    if (!reason.trim()) return setError("Enter a reason — every stock change must be traceable.");

    setIsSaving(true);
    try {
      await createMovement({
        productId,
        type,
        quantityChange: direction === "in" ? qty : -qty,
        reason: reason.trim(),
      });
      onRecorded();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record this adjustment.");
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-navy">Record Stock Adjustment</h2>
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
            <label className={labelClass}>Product</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className={`${inputClass} bg-white`}>
              <option value="">Select a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.currentQuantity} {p.unit} in stock)
                </option>
              ))}
            </select>
            {selectedProduct && (
              <p className="mt-1 text-xs text-gray-500">
                Currently {selectedProduct.currentQuantity} {selectedProduct.unit}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ManualMovementType)}
              className={`${inputClass} bg-white`}
            >
              {MOVEMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {MOVEMENT_TYPES.find((t) => t.value === type)?.hint}
            </p>
          </div>

          <div>
            <label className={labelClass}>Direction</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDirection("in")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  direction === "in"
                    ? "border-success bg-success/10 text-success"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                Stock In (+)
              </button>
              <button
                type="button"
                onClick={() => setDirection("out")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  direction === "out"
                    ? "border-danger bg-danger/10 text-danger"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                Stock Out (−)
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>Quantity</label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Reason</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Physical count correction"
              className={inputClass}
            />
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
              {isSaving ? "Saving…" : "Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
