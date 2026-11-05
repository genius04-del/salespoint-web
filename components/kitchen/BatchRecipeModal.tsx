"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Ingredient } from "@/lib/stockTypes";
import { createIngredient, setPrepMakeup } from "@/lib/api/kitchenStock";
import { Field, Modal, ghostBtn, inputClass, primaryBtn } from "./Modal";
import { cedi, errMsg, num, qty } from "./format";

const UNITS = ["kg", "g", "litre", "ml", "piece", "pack", "tin", "crate"];
const CATEGORIES = ["Vegetables", "Meat", "Dry goods", "Dairy", "Sauces", "Drinks", "Packaging"];

interface Row {
  ingredientId: string;
  quantity: string;
}

// A kitchen recipe written the way a cook thinks about it: "this batch makes
// 1.5 kg from 2 kg raw steak + 0.1 kg seasoning". The system works out the
// amount per kg itself. Used to create a new recipe or edit an existing one.
export function BatchRecipeModal({
  recipe,
  all,
  onClose,
  onDone,
}: {
  recipe?: Ingredient; // omitted = a new recipe
  all: Ingredient[];
  onClose: () => void;
  onDone: () => void;
}) {
  const startYield = recipe ? Number(recipe.batchYield ?? 1) : 1;
  const [name, setName] = useState(recipe?.name ?? "");
  const [unit, setUnit] = useState(recipe?.unit ?? "kg");
  const [category, setCategory] = useState(recipe?.category ?? "");
  const [yieldText, setYieldText] = useState(recipe ? String(startYield) : "");
  const [rows, setRows] = useState<Row[]>(
    recipe?.components.length
      ? recipe.components.map((c) => ({
          ingredientId: c.componentId,
          quantity: String(Math.round(Number(c.quantity) * startYield * 10000) / 10000),
        }))
      : [{ ingredientId: "", quantity: "" }]
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const options = all.filter((i) => i.id !== recipe?.id && i.isActive);
  const find = (id: string) => all.find((i) => i.id === id);
  const makes = num(yieldText);
  const batchCost = rows.reduce((sum, r) => {
    const ing = find(r.ingredientId);
    const q = num(r.quantity);
    return ing && Number.isFinite(q) ? sum + q * Number(ing.costPerUnit) : sum;
  }, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const filled = rows.filter((r) => r.ingredientId);
    const parsed = filled.map((r) => ({ ingredientId: r.ingredientId, quantity: num(r.quantity) }));
    if (!recipe && !name.trim()) return setError("Give the recipe a name.");
    if (!(makes > 0)) return setError("Say how much one batch makes.");
    if (parsed.length === 0) return setError("Add at least one ingredient.");
    if (parsed.some((r) => !(r.quantity > 0))) return setError("Every ingredient needs a quantity above zero.");
    setBusy(true);
    try {
      let id = recipe?.id;
      if (!id) {
        const created = await createIngredient({
          name: name.trim(), unit, isPrepared: true, category: category.trim() || undefined,
          minStockLevel: 0, costPerUnit: 0, openingQuantity: 0,
        });
        id = created.ingredient.id;
      }
      await setPrepMakeup(id, parsed, makes);
      onDone();
    } catch (err) {
      setError(errMsg(err, "Could not save"));
    } finally {
      setBusy(false);
    }
  }

  const outUnit = recipe?.unit ?? unit;

  return (
    <Modal title={recipe ? `Recipe: ${recipe.name}` : "New recipe"} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        {!recipe && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label="What are you making?">
                <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jollof rice, Dough mixed, BBQ steak processed" />
              </Field>
            </div>
            <Field label="Measured in">
              <select className={inputClass} value={unit} onChange={(e) => setUnit(e.target.value)}>
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-3">
              <Field label="Group (optional)" hint="Used to group the daily stock count, e.g. Meat or Sauces.">
                <input className={inputClass} list="recipe-groups" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Meat" />
                <datalist id="recipe-groups">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
            </div>
          </div>
        )}

        <div className="rounded-xl bg-gray-50 p-3">
          <Field label={`One batch makes (${outUnit})`} hint="The finished amount you normally get, for example 1.5 for a bag that gives 1.5 kg.">
            <input className={`${inputClass} max-w-[10rem]`} inputMode="decimal" value={yieldText} onChange={(e) => setYieldText(e.target.value)} placeholder="e.g. 1.5" />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-[#071A2F]">What goes into one batch</p>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  className={inputClass}
                  value={r.ingredientId}
                  onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, ingredientId: e.target.value } : x)))}
                >
                  <option value="">Choose ingredient…</option>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                <input
                  className={`${inputClass} w-28`}
                  inputMode="decimal"
                  placeholder="Qty"
                  value={r.quantity}
                  onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
                />
                <span className="w-12 text-xs text-gray-500">{find(r.ingredientId)?.unit ?? ""}</span>
                <button type="button" aria-label="Remove" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="rounded p-1 text-gray-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setRows([...rows, { ingredientId: "", quantity: "" }])} className="mt-2 flex items-center gap-1 text-sm font-medium text-[#FF6B00]">
            <Plus size={14} /> Add ingredient
          </button>
        </div>

        {makes > 0 && batchCost > 0 && (
          <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            One batch costs about {cedi(batchCost)}, so each {outUnit} costs about {cedi(batchCost / makes)}.
          </p>
        )}
        {makes > 0 && (
          <p className="text-xs text-gray-500">
            In the Stock Journal the cook only enters how much was made. If 1 {outUnit} is made, about {qty(1 / makes, 3)} of the batch is used.
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>
          <button disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save recipe"}</button>
        </div>
      </form>
    </Modal>
  );
}
