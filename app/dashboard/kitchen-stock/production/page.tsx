"use client";

import { Fragment, useEffect, useState } from "react";
import { CircleAlert, CircleCheck, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { listIngredients, listProduction, previewProduction, recordProduction } from "@/lib/api/kitchenStock";
import type { Ingredient, ProductionBatch, ProductionPreviewLine } from "@/lib/stockTypes";
import { Field, ghostBtn, inputClass, primaryBtn } from "@/components/kitchen/Modal";
import { cedi, errMsg, num, qty, when } from "@/components/kitchen/format";

const journalNo = (n: number) => `PJ-${String(n).padStart(4, "0")}`;
// The server allows 0.1% for rounding; so does the screen.
const isOver = (used: number, standard: number) => standard > 0 && used > standard * 1.001;

export default function StockJournalPage() {
  const { hasPermission } = useAuth();
  const canProduce = hasPermission("stock.produce");

  const [recipes, setRecipes] = useState<Ingredient[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [outputId, setOutputId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [preview, setPreview] = useState<ProductionPreviewLine[] | null>(null);
  const [used, setUsed] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [allowShortage, setAllowShortage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ing, prod] = await Promise.all([listIngredients(), listProduction()]);
        if (cancelled) return;
        setRecipes(ing.ingredients.filter((i) => i.isPrepared && i.isActive));
        setBatches(prod.batches);
        setError("");
      } catch (e) {
        if (!cancelled) setError(errMsg(e, "Could not load the stock journal"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Work out what the recipe says, whenever the recipe or the amount changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const q = num(quantity);
      if (!outputId || !(q > 0)) {
        setPreview(null);
        return;
      }
      try {
        const res = await previewProduction(outputId, q);
        if (cancelled) return;
        setPreview(res.lines);
        setUsed(Object.fromEntries(res.lines.map((l) => [l.ingredientId, String(Number(l.standardQuantity))])));
        setFormError("");
      } catch (e) {
        if (!cancelled) {
          setPreview(null);
          setFormError(errMsg(e, "Could not work out the amounts"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [outputId, quantity]);

  const output = recipes.find((p) => p.id === outputId);
  const shortage = preview?.some((l) => !l.enough) ?? false;
  const overLines = (preview ?? []).filter((l) => isOver(num(used[l.ingredientId] ?? ""), Number(l.standardQuantity)));
  const needsReason = overLines.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSuccess("");
    const q = num(quantity);
    if (!outputId || !(q > 0)) return setFormError("Choose what you made and how much.");
    if (!preview || preview.length === 0) return setFormError("This recipe has no ingredients yet.");
    const lines = preview.map((l) => ({ ingredientId: l.ingredientId, quantityUsed: num(used[l.ingredientId] ?? "") }));
    if (lines.some((l) => !Number.isFinite(l.quantityUsed) || l.quantityUsed < 0)) return setFormError("Enter the amount used for every ingredient.");
    if (needsReason && !reason.trim()) return setFormError("More was used than the recipe says. Say why before saving.");
    setBusy(true);
    try {
      const { batch } = await recordProduction({
        outputId, quantity: q, lines, reason: reason.trim() || undefined, notes: notes.trim() || undefined, allowShortage,
      });
      setSuccess(`Saved as ${journalNo(batch.number)}: ${qty(q)} ${output?.unit ?? ""} of ${output?.name ?? "item"}.`);
      setQuantity("");
      setReason("");
      setNotes("");
      setAllowShortage(false);
      setPreview(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setFormError(errMsg(err, "Could not save to the journal"));
    } finally {
      setBusy(false);
    }
  }

  const term = search.trim().toLowerCase();
  const shown = batches.filter((b) => !term || b.output.name.toLowerCase().includes(term) || journalNo(b.number).toLowerCase().includes(term));

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {canProduce && (
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div>
            <h2 className="text-lg font-bold text-[#071A2F]">New journal entry</h2>
            <p className="text-sm text-gray-500">Choose what you cooked and how much came out. The ingredients are worked out from the recipe and come off stock.</p>
          </div>

          {!loading && recipes.length === 0 ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              No recipes yet. Go to <b>Recipes</b> in the menu and add what the kitchen makes (jollof, dough, sauces), then come back here.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="What did you make?">
                  <select className={inputClass} value={outputId} onChange={(e) => { setOutputId(e.target.value); setFormError(""); }}>
                    <option value="">Choose recipe…</option>
                    {recipes.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
                <Field
                  label={`How much did you make${output ? ` (${output.unit})` : ""}?`}
                  hint={output?.batchYield ? `One standard batch makes ${qty(output.batchYield)} ${output.unit}.` : undefined}
                >
                  <input className={inputClass} inputMode="decimal" value={quantity} onChange={(e) => { setQuantity(e.target.value); setFormError(""); }} placeholder="e.g. 1.5" />
                </Field>
              </div>

              {preview && preview.length === 0 && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">This recipe has no ingredients yet. Open it on the Recipes page and add them.</p>
              )}

              {preview && preview.length > 0 && (
                <div className="space-y-3">
                  <div className="overflow-x-auto rounded-xl ring-1 ring-gray-100">
                    <table className="w-full min-w-[460px] text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                          <th className="px-3 py-2">Ingredient</th>
                          <th className="px-3 py-2 text-right">Recipe says</th>
                          <th className="px-3 py-2 text-right">In stock</th>
                          <th className="px-3 py-2 text-right">Actually used</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((l) => {
                          const over = isOver(num(used[l.ingredientId] ?? ""), Number(l.standardQuantity));
                          return (
                            <tr key={l.ingredientId} className="border-t border-gray-50">
                              <td className="px-3 py-2 text-[#071A2F]">{l.name}</td>
                              <td className="px-3 py-2 text-right">{qty(l.standardQuantity)} {l.unit}</td>
                              <td className={`px-3 py-2 text-right ${l.enough ? "text-gray-600" : "font-medium text-red-600"}`}>{qty(l.onHand)} {l.unit}</td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  className={`w-24 rounded border px-2 py-1 text-right text-sm ${over ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                                  inputMode="decimal"
                                  value={used[l.ingredientId] ?? ""}
                                  onChange={(e) => setUsed({ ...used, [l.ingredientId]: e.target.value })}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500">The amounts are filled in from the recipe. Change one only if you weighed something different.</p>

                  {needsReason && (
                    <Field label="Why was more used than the recipe says?" hint={`${overLines.map((l) => l.name).join(", ")} went over. This is saved in the journal and shows in Stock Variance.`}>
                      <input className={`${inputClass} border-red-300`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Bag was bony, lost a lot in trimming" />
                    </Field>
                  )}
                  {shortage && (
                    <label className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      <input type="checkbox" className="mt-0.5" checked={allowShortage} onChange={(e) => setAllowShortage(e.target.checked)} />
                      <span>Some ingredients are short in the system. Tick to save anyway if a delivery has not been entered yet (stock will show below zero until it is).</span>
                    </label>
                  )}
                </div>
              )}

              <Field label="Notes">
                <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
              </Field>
              {formError && (
                <p className="flex items-start gap-2 text-sm text-red-600"><CircleAlert size={16} className="mt-0.5 shrink-0" /> {formError}</p>
              )}
              {success && (
                <p className="flex items-start gap-2 text-sm text-green-700"><CircleCheck size={16} className="mt-0.5 shrink-0" /> {success}</p>
              )}
              <button disabled={busy || !preview || preview.length === 0 || (shortage && !allowShortage)} className={primaryBtn}>
                {busy ? "Saving…" : "Save to journal"}
              </button>
            </>
          )}
        </form>
      )}

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#071A2F]">Journal</h2>
          <div className="relative w-full max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className={`${inputClass} pl-9`} placeholder="Search by number or item" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {loading && <p className="text-gray-500">Loading…</p>}
        {!loading && batches.length === 0 && <p className="text-sm text-gray-500">Nothing recorded yet.</p>}
        {shown.length > 0 && (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">No.</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3 text-right">Made</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3">By</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((b) => {
                  const over = b.lines.filter((l) => isOver(Number(l.quantityUsed), Number(l.standardQuantity)));
                  const open = openId === b.id;
                  return (
                    <Fragment key={b.id}>
                      <tr onClick={() => setOpenId(open ? null : b.id)} className="cursor-pointer border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-[#071A2F]">{journalNo(b.number)}</td>
                        <td className="px-4 py-3 text-gray-600">{when(b.createdAt)}</td>
                        <td className="px-4 py-3 text-[#071A2F]">
                          {b.output.name}
                          {over.length > 0 && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">used more than recipe</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{qty(b.quantityProduced)} {b.output.unit}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{cedi(b.totalCost)}</td>
                        <td className="px-4 py-3 text-gray-600">{b.producedByName ?? "—"}</td>
                      </tr>
                      {open && (
                        <tr className="border-b border-gray-50 bg-gray-50/60">
                          <td colSpan={6} className="px-4 py-3">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-xs uppercase text-gray-500">
                                  <th className="py-1">Used</th>
                                  <th className="py-1 text-right">Recipe says</th>
                                  <th className="py-1 text-right">Actually used</th>
                                  <th className="py-1 text-right">Cost</th>
                                </tr>
                              </thead>
                              <tbody>
                                {b.lines.map((l) => (
                                  <tr key={l.id} className="border-t border-gray-100">
                                    <td className="py-1">{l.ingredient.name}</td>
                                    <td className="py-1 text-right text-gray-500">{Number(l.standardQuantity) > 0 ? `${qty(l.standardQuantity)} ${l.ingredient.unit}` : "—"}</td>
                                    <td className={`py-1 text-right ${isOver(Number(l.quantityUsed), Number(l.standardQuantity)) ? "font-medium text-red-600" : ""}`}>{qty(l.quantityUsed)} {l.ingredient.unit}</td>
                                    <td className="py-1 text-right text-gray-600">{cedi(Number(l.quantityUsed) * Number(l.unitCost))}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {b.reason && <p className="mt-2 text-xs text-gray-600"><b>Reason:</b> {b.reason}</p>}
                            {b.notes && <p className="mt-1 text-xs text-gray-500">Note: {b.notes}</p>}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && batches.length > 0 && shown.length === 0 && <p className="text-sm text-gray-500">Nothing matches.</p>}
      </div>
      <button onClick={() => setReloadKey((k) => k + 1)} className={ghostBtn}>Refresh</button>
    </div>
  );
}
