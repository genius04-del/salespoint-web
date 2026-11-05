"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search, X } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { listCategories, listProducts } from "@/lib/api/products";
import type { NewOrderItem } from "@/lib/api/restaurant";
import { errMsg } from "@/components/kitchen/format";

interface Line {
  product: Product;
  quantity: number;
  notes: string;
}

// Pick what the table ordered. Items are only sent to the kitchen when the
// waiter taps "Send to kitchen".
export function ItemPicker({
  busy,
  error,
  onSend,
  onClose,
}: {
  busy: boolean;
  error: string;
  onSend: (items: NewOrderItem[]) => void;
  onClose: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, c] = await Promise.all([listProducts(), listCategories()]);
        if (!cancelled) {
          setProducts(p.products.filter((x) => x.isActive));
          setCategories(c.categories);
        }
      } catch (e) {
        if (!cancelled) setLoadError(errMsg(e, "Could not load the menu"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => (!categoryId || p.categoryId === categoryId) && (!term || p.name.toLowerCase().includes(term)));
  }, [products, search, categoryId]);

  const add = (p: Product) =>
    setLines((ls) => (ls.some((l) => l.product.id === p.id) ? ls.map((l) => (l.product.id === p.id ? { ...l, quantity: l.quantity + 1 } : l)) : [...ls, { product: p, quantity: 1, notes: "" }]));
  const change = (id: string, d: number) =>
    setLines((ls) => ls.flatMap((l) => (l.product.id === id ? (l.quantity + d <= 0 ? [] : [{ ...l, quantity: l.quantity + d }]) : [l])));
  const total = lines.reduce((s, l) => s + Number(l.product.sellingPrice) * l.quantity, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#071A2F]">Add to the order</h3>
        <button onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100" aria-label="Back"><X size={18} /></button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#FF6B00]"
          placeholder="Search the menu"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        <button onClick={() => setCategoryId("")} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${!categoryId ? "bg-[#071A2F] text-white" : "bg-gray-100 text-gray-600"}`}>All</button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setCategoryId(c.id)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${categoryId === c.id ? "bg-[#071A2F] text-white" : "bg-gray-100 text-gray-600"}`}>{c.name}</button>
        ))}
      </div>

      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
        {shown.map((p) => (
          <button key={p.id} onClick={() => add(p)} className="rounded-xl border border-gray-200 p-2 text-left hover:border-[#FF6B00]">
            <span className="block text-sm font-medium text-[#071A2F]">{p.name}</span>
            <span className="text-xs text-gray-500">GH₵ {Number(p.sellingPrice).toFixed(2)}</span>
          </button>
        ))}
        {shown.length === 0 && !loadError && <p className="col-span-full text-sm text-gray-500">No items match.</p>}
      </div>

      {lines.length > 0 && (
        <div className="space-y-2 rounded-xl bg-gray-50 p-3">
          {lines.map((l) => (
            <div key={l.product.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-[#071A2F]">{l.product.name}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => change(l.product.id, -1)} className="rounded-full border border-gray-300 p-1" aria-label="Less"><Minus size={12} /></button>
                  <span className="w-5 text-center font-medium">{l.quantity}</span>
                  <button onClick={() => change(l.product.id, 1)} className="rounded-full border border-gray-300 p-1" aria-label="More"><Plus size={12} /></button>
                </div>
              </div>
              <input
                className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs"
                placeholder="Note for the kitchen (e.g. no onions)"
                value={l.notes}
                onChange={(e) => setLines((ls) => ls.map((x) => (x.product.id === l.product.id ? { ...x, notes: e.target.value } : x)))}
              />
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={busy || lines.length === 0}
        onClick={() => onSend(lines.map((l) => ({ productId: l.product.id, quantity: l.quantity, notes: l.notes.trim() || undefined })))}
        className="w-full rounded-xl bg-[#FF6B00] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Sending…" : `Send to kitchen${lines.length ? ` · GH₵ ${total.toFixed(2)}` : ""}`}
      </button>
    </div>
  );
}
