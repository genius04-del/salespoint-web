"use client";

import { useEffect, useState } from "react";
import type { Ingredient } from "@/lib/stockTypes";
import {
  createIngredient,
  receiveIngredient,
  wasteIngredient,
  type PaidWith,
} from "@/lib/api/kitchenStock";
import { createPurchase } from "@/lib/api/purchases";
import { listSuppliers } from "@/lib/api/suppliers";
import type { SupplierWithBalance } from "@/lib/types";
import { Field, Modal, ghostBtn, inputClass, primaryBtn } from "./Modal";
import { errMsg, num, qty } from "./format";

const UNITS = ["kg", "g", "litre", "ml", "piece", "pack", "tin", "crate"];
const PACKS = ["Loose", "Bag", "Sack", "Sachet", "Tin", "Carton", "Bottle", "Box", "Crate", "Pack"];

// Pack sizes can be typed in a smaller unit (500 g for a kg item); we convert.
function sizeUnits(unit: string): string[] {
  if (unit === "kg") return ["kg", "g"];
  if (unit === "g") return ["g", "kg"];
  if (unit === "litre") return ["litre", "ml"];
  if (unit === "ml") return ["ml", "litre"];
  return [unit];
}
function toUnit(value: number, from: string, to: string): number {
  if (from === to) return value;
  if ((from === "g" && to === "kg") || (from === "ml" && to === "litre")) return value / 1000;
  if ((from === "kg" && to === "g") || (from === "litre" && to === "ml")) return value * 1000;
  return value;
}
const CATEGORIES = ["Vegetables", "Meat", "Dry goods", "Dairy", "Sauces", "Drinks", "Packaging"];

export function AddIngredientModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [isPrepared, setIsPrepared] = useState(false);
  const [category, setCategory] = useState("");
  const [opening, setOpening] = useState("");
  const [cost, setCost] = useState("");
  const [packName, setPackName] = useState("Loose");
  const [packSize, setPackSize] = useState("");
  const [sizeUnit, setSizeUnit] = useState("");
  const [packPrice, setPackPrice] = useState("");
  const [min, setMin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const loose = packName === "Loose";
    const sizeN = loose || packSize.trim() === "" ? undefined : toUnit(num(packSize), sizeUnit || unit, unit);
    const priceN = loose || packPrice.trim() === "" ? undefined : num(packPrice);
    if (!loose && ((sizeN === undefined) !== (priceN === undefined))) return setError("Fill in both the pack size and the price per pack, or leave both empty.");
    if (sizeN !== undefined && !(sizeN > 0)) return setError("Pack size must be more than zero.");
    const costN = cost.trim() === "" ? 0 : num(cost);
    const openN = opening.trim() === "" ? 0 : num(opening);
    const minN = min.trim() === "" ? 0 : num(min);
    if ([costN, openN, minN, priceN ?? 0].some((n) => !Number.isFinite(n) || n < 0)) return setError("Numbers can't be negative or text.");
    setBusy(true);
    try {
      await createIngredient({ name: name.trim(), unit, isPrepared, category: category.trim() || undefined, minStockLevel: minN, costPerUnit: costN, packName: sizeN ? packName : undefined, packSize: sizeN, packPrice: sizeN ? priceN : undefined, openingQuantity: openN });
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
            <select className={inputClass} value={unit} onChange={(e) => { setUnit(e.target.value); setSizeUnit(""); }}>
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
          <>
            <Field label="In stock now" hint={`How much you have on the shelf today, in ${unit}.`}>
              <input className={inputClass} inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="0" />
            </Field>
            <div className="rounded-lg border border-gray-200 p-3 space-y-3">
              <p className="text-sm font-semibold text-[#071A2F]">How do you buy it?</p>
              <Field label="Comes in a">
                <select className={inputClass} value={packName} onChange={(e) => setPackName(e.target.value)}>
                  {PACKS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
              {packName === "Loose" ? (
                <Field label={`Cost per ${unit} (GH₵)`}>
                  <input className={inputClass} inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
                </Field>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={`One ${packName.toLowerCase()} holds`}>
                      <div className="flex gap-2">
                        <input className={inputClass} inputMode="decimal" value={packSize} onChange={(e) => setPackSize(e.target.value)} placeholder="50" />
                        {sizeUnits(unit).length > 1 && (
                          <select className={inputClass + " max-w-[5.5rem]"} value={sizeUnit || unit} onChange={(e) => setSizeUnit(e.target.value)}>
                            {sizeUnits(unit).map((u) => (
                              <option key={u}>{u}</option>
                            ))}
                          </select>
                        )}
                        {sizeUnits(unit).length === 1 && <span className="self-center text-sm text-gray-500">{unit}</span>}
                      </div>
                    </Field>
                    <Field label={`Price per ${packName.toLowerCase()} (GH₵)`}>
                      <input className={inputClass} inputMode="decimal" value={packPrice} onChange={(e) => setPackPrice(e.target.value)} placeholder="650.00" />
                    </Field>
                  </div>
                  {(() => {
                    const size = toUnit(num(packSize), sizeUnit || unit, unit);
                    const price = num(packPrice);
                    return size > 0 && price >= 0 && packPrice.trim() !== "" ? (
                      <p className="text-sm text-[#071A2F]">
                        That works out at <b>GH₵ {(price / size).toFixed(2)} per {unit}</b>. We calculate it for you.
                      </p>
                    ) : null;
                  })()}
                </>
              )}
            </div>
          </>
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
  const packSize = ingredient.packSize ? Number(ingredient.packSize) : 0;
  const packLabel = (ingredient.packName || "pack").toLowerCase();
  const [byPack, setByPack] = useState(packSize > 0);
  const [suppliers, setSuppliers] = useState<SupplierWithBalance[]>([]);
  const [supplierId, setSupplierId] = useState("");
  useEffect(() => {
    listSuppliers()
      .then((r) => setSuppliers(r.suppliers))
      .catch(() => {});
  }, []);
  const [quantity, setQuantity] = useState("");
  const [total, setTotal] = useState("");
  const [paidWith, setPaidWith] = useState<PaidWith>("CASH");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const q = byPack ? num(quantity) * packSize : num(quantity);
    const t = total.trim() === "" ? undefined : num(total);
    if (!(q > 0)) return setError("Enter how much came in.");
    if (t !== undefined && !(t >= 0)) return setError("The amount paid can't be negative.");
    if (supplierId && t === undefined) return setError("Enter the total paid for this purchase (0 if it was free).");
    setBusy(true);
    try {
      if (supplierId && t !== undefined) {
        // From a supplier: record it as a Purchase so it shows under Purchases and in what you owe.
        await createPurchase({
          supplierId,
          items: [{ ingredientId: ingredient.id, quantity: q, costPrice: t / q, lineTotal: t }],
          amountPaid: paidWith === "ON_CREDIT" ? 0 : t,
          paidWith: paidWith === "ON_CREDIT" ? undefined : paidWith,
          notes: note.trim() || undefined,
        });
      } else {
        await receiveIngredient(ingredient.id, { quantity: q, totalCost: t, paidWith, note: note.trim() || undefined });
      }
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
        {packSize > 0 && (
          <div className="flex gap-2 text-sm">
            <button type="button" onClick={() => setByPack(true)} className={byPack ? primaryBtn : ghostBtn}>By {packLabel}</button>
            <button type="button" onClick={() => setByPack(false)} className={!byPack ? primaryBtn : ghostBtn}>By {ingredient.unit}</button>
          </div>
        )}
        <Field label={byPack ? `How many ${packLabel}s came in?` : `Quantity received (${ingredient.unit})`} hint={byPack ? `1 ${packLabel} = ${qty(String(packSize))} ${ingredient.unit}` : undefined}>
          <input className={inputClass} inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus required />
        </Field>
        {byPack && num(quantity) > 0 && (
          <p className="text-sm text-[#071A2F]">
            That is <b>{qty(String(num(quantity) * packSize))} {ingredient.unit}</b>
            {total.trim() !== "" && num(total) > 0 && <> at <b>GH₵ {(num(total) / (num(quantity) * packSize)).toFixed(2)} per {ingredient.unit}</b></>}.
          </p>
        )}
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
        {suppliers.length > 0 && (
          <Field label="Supplier" hint="Pick one to record this under Purchases. Leave empty for a quick market run.">
            <select className={inputClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">No supplier</option>
              {suppliers.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Note">
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Market, invoice number, etc." />
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
