"use client";

import { useState } from "react";
import { CircleAlert } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { ApiError } from "@/lib/apiClient";

export interface ProductFormValues {
  name: string;
  description: string;
  categoryId: string;
  sku: string;
  barcode: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  minStockLevel: string;
  openingStock: string;
  kind: "dish" | "resold"; // restaurant mode only: dish = price-only menu item, resold = drink/water with its own stock
}

function emptyValues(): ProductFormValues {
  return {
    name: "",
    description: "",
    categoryId: "",
    sku: "",
    barcode: "",
    unit: "unit",
    costPrice: "",
    sellingPrice: "",
    minStockLevel: "0",
    openingStock: "0",
    kind: "dish",
  };
}

function valuesFromProduct(product: Product): ProductFormValues {
  return {
    name: product.name,
    description: product.description ?? "",
    categoryId: product.categoryId ?? "",
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    unit: product.unit,
    costPrice: product.costPrice,
    sellingPrice: product.sellingPrice,
    minStockLevel: String(product.minStockLevel),
    openingStock: "0", // not editable here — stock changes only via /inventory
    kind: product.hasRecipe ? "dish" : "resold",
  };
}

interface ProductFormProps {
  mode: "create" | "edit";
  categories: Category[];
  product?: Product; // required when mode === "edit"
  restaurant?: boolean;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel: () => void;
}

export function ProductForm({ mode, categories, product, restaurant = false, onSubmit, onCancel }: ProductFormProps) {
  const [values, setValues] = useState<ProductFormValues>(
    mode === "edit" && product ? valuesFromProduct(product) : emptyValues()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.name.trim()) return setError("Enter a product name.");
    if (!values.sellingPrice || Number(values.sellingPrice) < 0) {
      return setError("Enter a valid selling price.");
    }

    setIsSaving(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const isDish = restaurant && values.kind === "dish";

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          <CircleAlert size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {restaurant && (
        <div>
          <label className={labelClass}>What is it?</label>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <button
              type="button"
              onClick={() => update("kind", "dish")}
              className={`rounded-lg border px-3 py-2 text-left ${isDish ? "border-brand-orange bg-brand-orange/10 font-semibold" : "border-gray-300"}`}
            >
              Menu dish
              <span className="block text-xs font-normal text-gray-500">Made from ingredients. Name and price only.</span>
            </button>
            <button
              type="button"
              onClick={() => update("kind", "resold")}
              className={`rounded-lg border px-3 py-2 text-left ${!isDish ? "border-brand-orange bg-brand-orange/10 font-semibold" : "border-gray-300"}`}
            >
              Sold as it is
              <span className="block text-xs font-normal text-gray-500">Drink or water. Has its own stock.</span>
            </button>
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>Product name</label>
        <input
          required
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          className={inputClass}
          placeholder="e.g. Coca-Cola 50cl"
        />
      </div>

      <div>
        <label className={labelClass}>Description (optional)</label>
        <textarea
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          rows={2}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Category</label>
          <select
            value={values.categoryId}
            onChange={(e) => update("categoryId", e.target.value)}
            className={`${inputClass} bg-white`}
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {!isDish && (
          <div>
            <label className={labelClass}>Unit</label>
            <input
              value={values.unit}
              onChange={(e) => update("unit", e.target.value)}
              className={inputClass}
              placeholder="unit, kg, litre…"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>SKU (optional)</label>
          <input value={values.sku} onChange={(e) => update("sku", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Barcode (optional)</label>
          <input
            value={values.barcode}
            onChange={(e) => update("barcode", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {!isDish && (
          <div>
            <label className={labelClass}>Cost price (GHS)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.costPrice}
              onChange={(e) => update("costPrice", e.target.value)}
              className={inputClass}
            />
          </div>
        )}
        <div>
          <label className={labelClass}>Selling price (GHS)</label>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={values.sellingPrice}
            onChange={(e) => update("sellingPrice", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {isDish ? (
        <p className="rounded-lg bg-app-background px-3 py-2 text-xs text-gray-500">
          A menu dish has no stock of its own. Add what goes into it on the <b>Recipes</b> page, and keep the ingredients in <b>Inventory</b>. Selling the dish then uses them up at day end.
        </p>
      ) : (
        <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Minimum stock level</label>
          <input
            type="number"
            min="0"
            step="1"
            value={values.minStockLevel}
            onChange={(e) => update("minStockLevel", e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-500">Flags this product as low-stock at or below this.</p>
        </div>
        {mode === "create" && (
          <div>
            <label className={labelClass}>Opening stock</label>
            <input
              type="number"
              min="0"
              step="1"
              value={values.openingStock}
              onChange={(e) => update("openingStock", e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-500">How many you have right now.</p>
          </div>
        )}
      </div>

        </>
      )}

      {mode === "edit" && (
        <p className="rounded-lg bg-app-background px-3 py-2 text-xs text-gray-500">
          Stock quantity isn&apos;t edited here — use the Inventory page to record a stock
          adjustment, so every change stays traceable.
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 rounded-lg bg-brand-orange px-4 py-2.5 font-semibold text-white transition hover:bg-light-orange disabled:opacity-60"
        >
          {isSaving ? "Saving…" : mode === "create" ? "Create Product" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
