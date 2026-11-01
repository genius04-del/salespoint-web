"use client";

import { useEffect, useState } from "react";
import { Plus, PackagePlus, Trash2, ListChecks } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { listIngredients } from "@/lib/api/kitchenStock";
import type { Ingredient } from "@/lib/stockTypes";
import { AddIngredientModal, MakeupModal, ReceiveModal, WasteModal } from "@/components/kitchen/IngredientModals";
import { primaryBtn } from "@/components/kitchen/Modal";
import { cedi, errMsg, qty } from "@/components/kitchen/format";

type Dialog =
  | { kind: "add" }
  | { kind: "receive" | "waste" | "makeup"; ingredient: Ingredient }
  | null;

export default function IngredientsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("stock.manage");
  const canWaste = canManage || hasPermission("stock.produce");

  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { ingredients } = await listIngredients();
        if (!cancelled) {
          setItems(ingredients);
          setError("");
        }
      } catch (e) {
        if (!cancelled) setError(errMsg(e, "Could not load ingredients"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const done = () => {
    setDialog(null);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Everything the kitchen uses up: raw items bought in, and items made in the kitchen.</p>
        {canManage && (
          <button onClick={() => setDialog({ kind: "add" })} className={`${primaryBtn} flex items-center gap-1`}>
            <Plus size={16} /> Add
          </button>
        )}
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && <p className="text-gray-500">Loading…</p>}
      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm ring-1 ring-black/5">
          No ingredients yet. Add flour, cheese, chicken… then build recipes from them.
        </div>
      )}

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Ingredient</th>
                <th className="px-4 py-3 text-right">In stock</th>
                <th className="px-4 py-3 text-right">Cost / unit</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const low = Number(i.currentQuantity) <= Number(i.minStockLevel);
                const negative = Number(i.currentQuantity) < 0;
                return (
                  <tr key={i.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-medium text-[#071A2F]">{i.name}</span>
                      {i.isPrepared && (
                        <span className="ml-2 rounded-full bg-[#FF6B00]/10 px-2 py-0.5 text-xs font-medium text-[#FF6B00]">made in kitchen</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${negative ? "text-red-600" : low ? "text-amber-600" : "text-[#071A2F]"}`}>
                      {qty(i.currentQuantity)} {i.unit}
                      {negative && <span className="block text-xs font-normal">below zero: not yet recorded</span>}
                      {!negative && low && <span className="block text-xs font-normal">running low</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{cedi(i.costPerUnit)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{cedi(Math.max(0, Number(i.currentQuantity)) * Number(i.costPerUnit))}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {canManage && i.isPrepared && (
                          <button title="Make-up" onClick={() => setDialog({ kind: "makeup", ingredient: i })} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                            <ListChecks size={16} />
                          </button>
                        )}
                        {canManage && !i.isPrepared && (
                          <button title="Receive stock" onClick={() => setDialog({ kind: "receive", ingredient: i })} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                            <PackagePlus size={16} />
                          </button>
                        )}
                        {canWaste && (
                          <button title="Write off" onClick={() => setDialog({ kind: "waste", ingredient: i })} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dialog?.kind === "add" && <AddIngredientModal onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "receive" && <ReceiveModal ingredient={dialog.ingredient} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "waste" && <WasteModal ingredient={dialog.ingredient} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "makeup" && <MakeupModal ingredient={dialog.ingredient} all={items} onClose={() => setDialog(null)} onDone={done} />}
    </div>
  );
}
