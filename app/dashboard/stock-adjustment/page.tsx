"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FileUp, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { applyDeduction, listDeductions, type DeductionRecord } from "@/lib/api/stockDeduction";
import { parseDeductionCsv, refOf, type ParsedDeduction } from "@/lib/deductionFile";
import { errMsg } from "@/components/kitchen/format";
import { ghostBtn, primaryBtn } from "@/components/kitchen/Modal";

const num = (n: number) => n.toLocaleString("en-GH", { maximumFractionDigits: 3 });
const when = (iso: string) => new Date(iso).toLocaleString("en-GH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Step 2 of the end of day: the file made in Deduct Sales is uploaded here and saved to stock.
export default function StockAdjustmentPage() {
  const { hasPermission } = useAuth();
  const canApply = hasPermission("stock.manage") || hasPermission("stock.approve");
  const [history, setHistory] = useState<DeductionRecord[]>([]);
  const [parsed, setParsed] = useState<ParsedDeduction | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setHistory((await listDeductions()).deductions);
    } catch (e) {
      setError(errMsg(e, "Could not load"));
    }
  }, []);

  useEffect(() => {
    (async () => { await load(); })();
  }, [load]);

  const waiting = history.find((d) => d.status === "PENDING") ?? null;
  const applied = history.filter((d) => d.status === "APPLIED");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setParsed(null);
    setError("");
    setProblems([]);
    setNotice("");
    if (!file) return;
    setFileName(file.name);
    try {
      setParsed(parseDeductionCsv(await file.text()));
    } catch (err) {
      setError(errMsg(err, "Could not read that file"));
    }
  }

  function reset() {
    setParsed(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save() {
    if (!parsed) return;
    setBusy(true);
    setError("");
    setProblems([]);
    try {
      await applyDeduction(parsed.number, parsed.lines.map((l) => ({ kind: l.kind, id: l.id, quantity: l.quantity })));
      setNotice(`${refOf(parsed.number)} saved. Stock now shows what should be left. Next, do the daily stock count.`);
      reset();
      await load();
    } catch (err) {
      setError(errMsg(err, "Could not save the file"));
      const body = (err as { problems?: string[] }).problems;
      if (body) setProblems(body);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#071A2F]">Stock adjustment</h1>
          <p className="text-sm text-gray-500">Step 2 of 3 at the end of the day. Upload the deduction file to take the day&apos;s sales off stock.</p>
        </div>
        <button onClick={() => void load()} className={`${ghostBtn} flex items-center gap-1`}><RefreshCw size={14} /> Refresh</button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          {problems.length > 0 && <ul className="mt-2 list-disc pl-5">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        </div>
      )}
      {notice && (
        <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
          {notice} <Link href="/dashboard/stock-count" className="font-semibold underline">Go to Daily Stock</Link>
        </div>
      )}

      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="font-semibold text-[#071A2F]">Upload a deduction file</h2>
        {waiting ? (
          <p className="text-sm text-gray-600">Waiting: <b>{refOf(waiting.number)}</b>, {waiting.salesCount} sale{waiting.salesCount === 1 ? "" : "s"} up to {when(waiting.toAt)}.</p>
        ) : (
          <p className="text-sm text-gray-500">Nothing is waiting. Make a deduction first in <Link href="/dashboard/stock-deduction" className="font-semibold text-[#FF6B00] underline">Deduct Sales</Link>.</p>
        )}

        {canApply ? (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600 hover:border-[#FF6B00]">
            <FileUp size={20} className="text-[#FF6B00]" />
            <span>{fileName || "Choose the .csv file you downloaded"}</span>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
          </label>
        ) : (
          <p className="text-sm text-gray-500">A manager uploads the file.</p>
        )}

        {parsed && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-[#071A2F]">{refOf(parsed.number)}: {parsed.lines.length} item{parsed.lines.length === 1 ? "" : "s"} will be taken off stock</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 text-xs uppercase text-gray-500"><tr><th className="py-2">Item</th><th className="py-2 text-right">Deduct</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {parsed.lines.map((l) => (
                    <tr key={`${l.kind}${l.id}`}><td className="py-2">{l.name}</td><td className="py-2 text-right font-medium">{num(l.quantity)} {l.unit}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Save stock adjustment"}</button>
              <button onClick={reset} disabled={busy} className={ghostBtn}>Choose another file</button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="mb-3 font-semibold text-[#071A2F]">Saved adjustments</h2>
        {applied.length === 0 ? (
          <p className="text-sm text-gray-500">None yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase text-gray-500"><tr><th className="py-2">No.</th><th className="py-2">Sales up to</th><th className="py-2 text-right">Sales</th><th className="py-2">Saved by</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {applied.map((d) => (
                <tr key={d.id}><td className="py-2.5 font-medium text-[#071A2F]">{refOf(d.number)}</td><td className="py-2.5">{when(d.toAt)}</td><td className="py-2.5 text-right">{d.salesCount}</td><td className="py-2.5 text-gray-600">{d.appliedBy} · {d.appliedAt ? when(d.appliedAt) : ""}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-xs text-gray-500">Damages, returns and other one-off corrections are recorded in <Link href="/dashboard/inventory" className="underline">Inventory</Link>.</p>
      </section>
    </div>
  );
}
