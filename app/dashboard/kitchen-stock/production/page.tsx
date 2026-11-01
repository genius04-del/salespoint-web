"use client";

import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { listIngredients, listProduction, previewProduction, recordProduction } from "@/lib/api/kitchenStock";
import type { Ingredient, ProductionBatch, ProductionPreviewLine } from "@/lib/stockTypes";
import { Field, ghostBtn, inputClass, primaryBtn } from "@/components/kitchen/Modal";
import { cedi, errMsg, num, qty, when } from "@/components/kitchen/format";

export default function StockJournalPage() {
  const { hasPermission } = useAuth();
  const canProduce = hasPermission("stock.produce");

  const [prepared, setPrepared] = useState<Ingredient[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [outputId, setOutputId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [preview, setPreview] = useState<ProductionPreviewLine[] | null>(null);
  const [adjust, setAdjust] = useState(false);
  const [used, setUsed] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [allowShortage, setAllowShortage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ing, prod] = await Promise.all([listIngredients(), listProduction()]);
        if (cancelled) return;
        setPrepared(ing.ingredients.filter((i) => i.isPrepared && i.isActive));
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

  // Work out the standard usage whenever the item or the amount changes.
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

  const shortage = preview?.some((l) => !l.enough) ?? false;
  const output = prepared.find((p) => p.id === outputId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSuccess("");
    const q = num(quantity);
    if (!outputId || !(q > 0)) return setFormError("Choose what you made and how many.");
    let lines: { ingredientId: string; quantityUsed: number }[] | undefined;
    if (adjust && preview) {
      lines = preview.map((l) => ({ ingredientId: l.ingredientId, quantityUsed: num(used[l.ingredientId] ?? "") }));
      if (lines.some((l) => !Number.isFinite(l.quantityUsed) || l.quantityUsed < 0)) return setFormError("Enter the amount used for every ingredient.");
    }
    setBusy(true);
    try {
      await recordProduction({ outputId, quantity: q, lines, notes: notes.trim() || undefined, allowShortage });
      setSuccess(`Recorded: ${qty(q)} ${output?.unit ?? ""} of ${output?.name ?? "item"}.`);
      setQuantity("");
      setNotes("");
      setAdjust(false);
      setAllowShortage(false);
      setPreview(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setFormError(errMsg(err, "Could not record production"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {canProduce && (
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div>
            <h2 className="text-lg font-bold text-[#071A2F]">Record production</h2>
            <p className="text-sm text-gray-500">Log what the kitchen prepared: dough balls, sauce, chopped vegetables. The raw ingredients come off stock.</p>
          </div>

          {!loading && prepared.length === 0 ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              No prepared items yet. In Ingredients, add an item marked &ldquo;Made in the kitchen&rdquo; (for example Dough ball - Medium) and set what it is made from.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="What did you make?">
                  <select className={inputClass} value={outputId} onChange={(e) => { setOutputId(e.target.value); setFormError(""); }}>
                    <option value="">Choose…</option>
                    {prepared.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label={`How many${output ? ` (${output.unit})` : ""}?`}>
                  <input className={inputClass} inputMode="decimal" value={quantity} onChange={(e) => { setQuantity(e.target.value); setFormError(""); }} placeholder="e.g. 40" />
                </Field>
              </div>

              {preview && preview.length === 0 && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">This item has no make-up yet. Set what it is made from on the Ingredients tab first.</p>
              )}

              {preview && preview.length > 0 && (
                <div className="space-y-2">
                  <div className="overflow-x-auto rounded-xl ring-1 ring-gray-100">
                    <table className="w-full min-w-[420px] text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                          <th className="px-3 py-2">Ingredient</th>
                          <th className="px-3 py-2 text-right">Standard</th>
                          <th className="px-3 py-2 text-right">In stock</th>
                          {adjust && <th className="px-3 py-2 text-right">Actually used</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((l) => (
                          <tr key={l.ingredientId} className="border-t border-gray-50">
                            <td className="px-3 py-2 text-[#071A2F]">{l.name}</td>
                            <td className="px-3 py-2 text-right">{qty(l.standardQuantity)} {l.unit}</td>
                            <td className={`px-3 py-2 text-right ${l.enough ? "text-gray-600" : "font-medium text-red-600"}`}>{qty(l.onHand)} {l.unit}</td>
                            {adjust && (
                              <td className="px-3 py-2 text-right">
                                <input
                                  className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm"
                                  inputMode="decimal"
                                  value={used[l.ingredientId] ?? ""}
                                  onChange={(e) => setUsed({ ...used, [l.ingredientId]: e.target.value })}
                                />
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={adjust} onChange={(e) => setAdjust(e.target.checked)} />
                    I used different amounts (weighed on the scale)
                  </label>
                  {shortage && (
                    <label className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      <input type="checkbox" className="mt-0.5" checked={allowShortage} onChange={(e) => setAllowShortage(e.target.checked)} />
                      <span>Some ingredients are short in the system. Tick to record anyway if a delivery has not been entered yet (stock will show below zero until it is).</span>
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
                {busy ? "Saving…" : "Record production"}
              </button>
            </>
          )}
        </form>
      )}

      <div>
        <h2 className="mb-2 text-lg font-bold text-[#071A2F]">Recent production</h2>
        {loading && <p className="text-gray-500">Loading…</p>}
        {!loading && batches.length === 0 && <p className="text-sm text-gray-500">Nothing recorded yet.</p>}
        <div className="space-y-2">
          {batches.map((b) => {
            const over = b.lines.filter((l) => Number(l.standardQuantity) > 0 && Number(l.quantityUsed) > Number(l.standardQuantity) * 1.001);
            return (
              <details key={b.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-[#071A2F]">
                    {qty(b.quantityProduced)} {b.output.unit} {b.output.name}
                  </span>
                  <span className="flex items-center gap-3 text-xs text-gray-500">
                    {over.length > 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-600">used more than standard</span>}
                    <span>{cedi(b.totalCost)}</span>
                    <span>{b.producedByName ?? ""} · {when(b.createdAt)}</span>
                  </span>
                </summary>
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-gray-500">
                      <th className="py-1">Used</th><th className="py-1 text-right">Actual</th><th className="py-1 text-right">Standard</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.lines.map((l) => (
                      <tr key={l.id} className="border-t border-gray-50">
                        <td className="py-1">{l.ingredient.name}</td>
                        <td className="py-1 text-right">{qty(l.quantityUsed)} {l.ingredient.unit}</td>
                        <td className="py-1 text-right text-gray-500">{Number(l.standardQuantity) > 0 ? `${qty(l.standardQuantity)} ${l.ingredient.unit}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {b.notes && <p className="mt-2 text-xs text-gray-500">Note: {b.notes}</p>}
              </details>
            );
          })}
        </div>
      </div>
      <button onClick={() => setReloadKey((k) => k + 1)} className={ghostBtn}>Refresh</button>
    </div>
  );
}
