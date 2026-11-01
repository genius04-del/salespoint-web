"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Ingredient, RecipeSummary } from "@/lib/stockTypes";
import { getRecipe, listIngredients, saveRecipe } from "@/lib/api/kitchenStock";
import { Modal, ghostBtn, inputClass, primaryBtn } from "./Modal";
import { cedi, errMsg, num } from "./format";

interface Row { ingredientId: string; quantity: string }

export function RecipeEditorModal({
  recipe,
  canEdit,
  onClose,
  onDone,
}: {
  recipe: RecipeSummary;
  canEdit: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ing, rec] = await Promise.all([listIngredients(), getRecipe(recipe.productId)]);
        if (cancelled) return;
        setIngredients(ing.ingredients);
        setRows(
          rec.lines.length
            ? rec.lines.map((l) => ({ ingredientId: l.ingredientId, quantity: String(Number(l.quantity)) }))
            : [{ ingredientId: "", quantity: "" }]
        );
      } catch (e) {
        if (!cancelled) setError(errMsg(e, "Could not load the recipe"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recipe.productId]);

  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const cost = rows.reduce((s, r) => {
    const ing = byId.get(r.ingredientId);
    const q = num(r.quantity);
    return ing && Number.isFinite(q) ? s + q * Number(ing.costPerUnit) : s;
  }, 0);
  const price = Number(recipe.sellingPrice);

  async function save(remove = false) {
    setError("");
    const filled = remove ? [] : rows.filter((r) => r.ingredientId);
    const lines = filled.map((r) => ({ ingredientId: r.ingredientId, quantity: num(r.quantity) }));
    if (lines.some((l) => !(l.quantity > 0))) return setError("Every ingredient needs a quantity above zero.");
    setBusy(true);
    try {
      await saveRecipe(recipe.productId, lines);
      onDone();
    } catch (e) {
      setError(errMsg(e, "Could not save"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={recipe.name} onClose={onClose} wide>
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            What ONE {recipe.name} uses. When it is sold, these amounts come off stock. Make a separate product for each size
            (for example Pepperoni Pizza - Medium and Pepperoni Pizza - Large).
          </p>
          {ingredients.length === 0 && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Add some ingredients first (Ingredients tab).</p>
          )}
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                disabled={!canEdit}
                className={inputClass}
                value={r.ingredientId}
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, ingredientId: e.target.value } : x)))}
              >
                <option value="">Choose ingredient…</option>
                {ingredients.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              <input
                disabled={!canEdit}
                className={`${inputClass} w-28`}
                inputMode="decimal"
                placeholder="Qty"
                value={r.quantity}
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
              />
              <span className="w-12 text-xs text-gray-500">{byId.get(r.ingredientId)?.unit ?? ""}</span>
              {canEdit && (
                <button type="button" aria-label="Remove" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="rounded p-1 text-gray-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          {canEdit && (
            <button type="button" onClick={() => setRows([...rows, { ingredientId: "", quantity: "" }])} className="flex items-center gap-1 text-sm font-medium text-[#FF6B00]">
              <Plus size={14} /> Add ingredient
            </button>
          )}

          <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3 text-center text-sm">
            <div><p className="text-xs text-gray-500">Cost</p><p className="font-semibold text-[#071A2F]">{cedi(cost)}</p></div>
            <div><p className="text-xs text-gray-500">Price</p><p className="font-semibold text-[#071A2F]">{cedi(price)}</p></div>
            <div>
              <p className="text-xs text-gray-500">Margin</p>
              <p className="font-semibold text-[#071A2F]">{price > 0 ? `${(((price - cost) / price) * 100).toFixed(1)}%` : "—"}</p>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap justify-between gap-2 pt-1">
            {canEdit && recipe.hasRecipe ? (
              <button disabled={busy} onClick={() => save(true)} className="text-sm text-red-600 hover:underline">
                Remove recipe
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className={ghostBtn}>{canEdit ? "Cancel" : "Close"}</button>
              {canEdit && (
                <button disabled={busy} onClick={() => save()} className={primaryBtn}>
                  {busy ? "Saving…" : "Save recipe"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
