"use client";

import { useState } from "react";
import type { Ingredient } from "@/lib/stockTypes";
import {
  createIngredient,
  receiveIngredient,
  wasteIngredient,
  type PaidWith,
} from "@/lib/api/kitchenStock";
import { Field, Modal, ghostBtn, inputClass, primaryBtn } from "./Modal";
import { errMsg, num, qty } from "./format";

const UNITS = ["kg", "g", "litre", "ml", "piece", "pack", "tin", "crate"];
const CATEGORIES = ["Vegetables", "Meat", "Dry goods", "Dairy", "Sauces", "Drinks", "Packaging"];

export function AddIngredientModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [isPrepared, setIsPrepared] = useState(false);
  const [category, setCategory] = useState("");
  const [opening, setOpening] = useState("");
  const [cost, setCost] = useState("");
  const [min, setMin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const costN = cost.trim() === "" ? 0 : num(cost);
    const openN = opening.trim() === "" ? 0 : num(opening);
    const minN = min.trim() === "" ? 0 : num(min);
    if ([costN, openN, minN].some((n) => !Number.isFinite(n) || n < 0)) return setError("Numbers can't be negative or text.");
    setBusy(true);
    try {
      await createIngredient({ name: name.trim(), unit, isPrepared, category: category.trim() || undefined, minStockLevel: minN, costPerUnit: costN, openingQuantity: openN });
      onDone();
    } catch (err) {
      setError(errMsg(err, "Could not save"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Add ingredient" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Mozzarella, or Dough ball - Medium" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Measured in">
            <select className={inputClass} value={unit} onChange={(e) => setUnit(e.target.value)}>
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label="Low-stock alert at">
            <input className={inputClass} inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} placeholder="0" />
          </Field>
        </div>
        <Field label="Group (optional)" hint="Groups the daily stock count. Use Packaging for boxes, carrier bags and tissues.">
          <input className={inputClass} list="ingredient-groups" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Vegetables" />
          <datalist id="ingredient-groups">
            {CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <label className="flex items-start gap-2 text-sm text-[#071A2F]">
          <input type="checkbox" className="mt-1" checked={isPrepared} onChange={(e) => setIsPrepared(e.target.checked)} />
          <span>
            <b>Made in the kitchen</b> (dough, sauce, jollof). Better to add these from the Recipes page, where you also say what goes into them.
          </span>
        </label>
        {!isPrepared && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="In stock now">
              <input className={inputClass} inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="0" />
            </Field>
            <Field label={`Cost per ${unit} (GH₵)`}>
              <input className={inputClass} inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
            </Field>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>
          <button disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Add"}</button>
        </div>
      </form>
    </Modal>
  );
}

export function ReceiveModal({ ingredient, onClose, onDone }: { ingredient: Ingredient; onClose: () => void; onDone: () => void }) {
  const [quantity, setQuantity] = useState("");
  const [total, setTotal] = useState("");
  const [paidWith, setPaidWith] = useState<PaidWith>("CASH");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const q = num(quantity);
    const t = total.trim() === "" ? undefined : num(total);
    if (!(q > 0)) return setError("Enter how much came in.");
    if (t !== undefined && !(t >= 0)) return setError("The amount paid can't be negative.");
    setBusy(true);
    try {
      await receiveIngredient(ingredient.id, { quantity: q, totalCost: t, paidWith, note: note.trim() || undefined });
      onDone();
    } catch (err) {
      setError(errMsg(err, "Could not save"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Receive ${ingredient.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-gray-500">On hand now: {qty(ingredient.currentQuantity)} {ingredient.unit}</p>
        <Field label={`Quantity received (${ingredient.unit})`}>
          <input className={inputClass} inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus required />
        </Field>
        <Field label="Total paid (GH₵)" hint="Optional. Fills in the cost and records the purchase in Finance.">
          <input className={inputClass} inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0.00" />
        </Field>
        {total.trim() !== "" && (
          <Field label="Paid with">
            <select className={inputClass} value={paidWith} onChange={(e) => setPaidWith(e.target.value as PaidWith)}>
              <option value="CASH">Cash</option>
              <option value="MOBILE_MONEY">Mobile money</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="ON_CREDIT">On credit (pay later)</option>
            </select>
          </Field>
        )}
        <Field label="Note">
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Supplier, market, etc." />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>
          <button disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Receive"}</button>
        </div>
      </form>
    </Modal>
  );
}

export function WasteModal({ ingredient, onClose, onDone }: { ingredient: Ingredient; onClose: () => void; onDone: () => void }) {
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const q = num(quantity);
    if (!(q > 0)) return setError("Enter how much was lost.");
    setBusy(true);
    try {
      await wasteIngredient(ingredient.id, { quantity: q, reason: reason.trim() });
      onDone();
    } catch (err) {
      setError(errMsg(err, "Could not save"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Write off ${ingredient.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-gray-500">On hand now: {qty(ingredient.currentQuantity)} {ingredient.unit}. The loss is booked to Finance.</p>
        <Field label={`Quantity lost (${ingredient.unit})`}>
          <input className={inputClass} inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus required />
        </Field>
        <Field label="Reason">
          <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="Spoiled, burnt, spilled, staff meal…" />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>
          <button disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Write off"}</button>
        </div>
      </form>
    </Modal>
  );
}
