"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, CircleAlert } from "lucide-react";
import type { Product, SupplierWithBalance } from "@/lib/types";
import type { Ingredient } from "@/lib/stockTypes";
import { listIngredients } from "@/lib/api/kitchenStock";
import { listProducts } from "@/lib/api/products";
import { listSuppliers } from "@/lib/api/suppliers";
import { createPurchase } from "@/lib/api/purchases";
import { ApiError } from "@/lib/apiClient";

interface ItemRow {
  key: string; // "p:<productId>" or "i:<ingredientId>"
  quantity: string;
  costPrice: string;
}

function emptyRow(): ItemRow {
  return { key: "", quantity: "1", costPrice: "" };
}

export default function NewPurchasePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [paidWith, setPaidWith] = useState<"CASH" | "MOBILE_MONEY" | "BANK_TRANSFER">("CASH");
  const [suppliers, setSuppliers] = useState<SupplierWithBalance[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProducts()
      .then((res) => setProducts(res.products.filter((p) => p.isActive)))
      .catch(() => {});
    listIngredients()
      .then((res) => setIngredients(res.ingredients.filter((i) => i.isActive && !i.isPrepared)))
      .catch(() => {});
    listSuppliers()
      .then((res) => setSuppliers(res.suppliers))
      .catch(() => {});
  }, []);

  function updateRow(index: number, patch: Partial<ItemRow>) {
    setRows((current) => current.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  // What the row's quantity and price mean depends on what was picked:
  // a pack of an ingredient (4 bags at GH₵650 each), an ingredient by its unit,
  // or a product (24 bottles at GH₵5 each).
  function describe(row: ItemRow) {
    if (row.key.startsWith("i:")) {
      const ing = ingredients.find((i) => i.id === row.key.slice(2));
      if (!ing) return null;
      const packSize = ing.packSize ? Number(ing.packSize) : 0;
      return { kind: "ingredient" as const, ing, packSize, label: packSize > 0 ? (ing.packName || "pack").toLowerCase() + "s" : ing.unit };
    }
    const product = products.find((p) => p.id === row.key.slice(2));
    return product ? { kind: "product" as const, product } : null;
  }

  function handleItemChange(index: number, key: string) {
    const product = key.startsWith("p:") ? products.find((p) => p.id === key.slice(2)) : undefined;
    updateRow(index, { key, costPrice: product ? product.costPrice : "" });
  }

  function addRow() {
    setRows((current) => [...current, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows((current) => (current.length > 1 ? current.filter((_, i) => i !== index) : current));
  }

  const total = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.costPrice) || 0), 0),
    [rows]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!supplierId) return setError("Select a supplier.");
    const validRows = rows.filter((r) => r.key && Number(r.quantity) > 0);
    if (validRows.length === 0) return setError("Add at least one item.");
    if (validRows.some((r) => !r.costPrice || Number(r.costPrice) < 0)) {
      return setError("Enter a valid cost price for every item.");
    }

    setIsSaving(true);
    try {
      const res = await createPurchase({
        supplierId,
        items: validRows.map((r) => {
          const d = describe(r);
          const q = Number(r.quantity);
          const price = Number(r.costPrice);
          if (d?.kind === "ingredient") {
            // Bought by the pack: send the real quantity in the ingredient's unit and the exact total.
            const unitsIn = d.packSize > 0 ? q * d.packSize : q;
            return { ingredientId: d.ing.id, quantity: unitsIn, costPrice: (q * price) / unitsIn, lineTotal: Math.round(q * price * 100) / 100 };
          }
          return { productId: r.key.slice(2), quantity: q, costPrice: price };
        }),
        amountPaid: amountPaid ? Number(amountPaid) : undefined,
        paidWith: amountPaid ? paidWith : undefined,
        notes: notes.trim() || undefined,
      });
      router.push(`/dashboard/purchases/${res.purchase.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record this purchase.");
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30";

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard/purchases"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} />
        Back to Purchases
      </Link>

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h1 className="mb-5 text-lg font-bold text-primary-navy">Record Purchase</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              <CircleAlert size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="">Select a supplier…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Items</label>
            <div className="space-y-2">
              {rows.map((row, index) => {
                const d = describe(row);
                const isIng = d?.kind === "ingredient";
                const packSize = d?.kind === "ingredient" ? d.packSize : 0;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-start gap-2">
                      <select
                        value={row.key}
                        onChange={(e) => handleItemChange(index, e.target.value)}
                        className={`${inputClass} flex-1 bg-white`}
                      >
                        <option value="">Select item…</option>
                        {ingredients.length > 0 && (
                          <optgroup label="Ingredients">
                            {ingredients.map((i) => (
                              <option key={i.id} value={`i:${i.id}`}>
                                {i.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label={ingredients.length > 0 ? "Drinks and products" : "Products"}>
                          {products.map((p) => (
                            <option key={p.id} value={`p:${p.id}`}>
                              {p.name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      <input
                        type="number"
                        min={isIng ? "0" : "1"}
                        step={isIng ? "any" : "1"}
                        value={row.quantity}
                        onChange={(e) => updateRow(index, { quantity: e.target.value })}
                        placeholder={d?.kind === "ingredient" ? d.label : "Qty"}
                        className={`${inputClass} w-24`}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.costPrice}
                        onChange={(e) => updateRow(index, { costPrice: e.target.value })}
                        placeholder={d?.kind === "ingredient" ? (packSize > 0 ? "Price each" : `Per ${d.ing.unit}`) : "Cost"}
                        className={`${inputClass} w-28`}
                      />
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="shrink-0 rounded p-2 text-gray-400 hover:bg-danger/10 hover:text-danger"
                        aria-label="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {d?.kind === "ingredient" && (
                      <p className="pl-1 text-xs text-gray-500">
                        {packSize > 0
                          ? `Quantity is the number of ${d.label}. 1 ${(d.ing.packName || "pack").toLowerCase()} = ${packSize} ${d.ing.unit}.${Number(row.quantity) > 0 ? ` That is ${(Number(row.quantity) * packSize).toLocaleString("en-GH", { maximumFractionDigits: 3 })} ${d.ing.unit}.` : ""}`
                          : `Quantity in ${d.ing.unit}, price per ${d.ing.unit}.`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={addRow}
              className="mt-2 flex items-center gap-1 text-sm font-medium text-brand-orange hover:underline"
            >
              <Plus size={14} />
              Add item
            </button>
          </div>

          <div className="flex justify-between border-t border-gray-100 pt-3 text-base font-bold text-primary-navy">
            <span>Total</span>
            <span>GHS {total.toFixed(2)}</span>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Amount paid now (optional)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              max={total || undefined}
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-500">Leave blank if paying later — you can record payments afterward.</p>
          </div>

          {amountPaid && Number(amountPaid) > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Paid with</label>
              <select value={paidWith} onChange={(e) => setPaidWith(e.target.value as typeof paidWith)} className={`${inputClass} bg-white`}>
                <option value="CASH">Cash</option>
                <option value="MOBILE_MONEY">Mobile money</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} />
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              href="/dashboard/purchases"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-center font-medium text-gray-700"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-lg bg-brand-orange px-4 py-2.5 font-semibold text-white transition hover:bg-light-orange disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Record Purchase"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
