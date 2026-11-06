"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, RefreshCw, TriangleAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cancelDeduction, createDeduction, listDeductions, previewDeduction, type DeductionPreview, type DeductionRecord } from "@/lib/api/stockDeduction";
import { downloadDeduction, refOf } from "@/lib/deductionFile";
import { errMsg } from "@/components/kitchen/format";
import { ghostBtn, primaryBtn } from "@/components/kitchen/Modal";
import { UsageTable } from "@/components/restaurant/UsageTable";

const when = (iso: string) => new Date(iso).toLocaleString("en-GH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function DeductSalesPage() {
  const { hasPermission } = useAuth();
  const canMake = hasPermission("stock.manage") || hasPermission("stock.approve") || hasPermission("day.close");
  const [preview, setPreview] = useState<DeductionPreview | null>(null);
  const [history, setHistory] = useState<DeductionRecord[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, h] = await Promise.all([previewDeduction(), listDeductions()]);
      setPreview(p);
      setHistory(h.deductions);
      setError("");
    } catch (e) {
      setError(errMsg(e, "Could not load"));
    }
  }, []);

  useEffect(() => {
    (async () => { await load(); })();
  }, [load]);

  const waiting = history.find((d) => d.status === "PENDING") ?? null;

  async function make() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { deduction } = await createDeduction();
      downloadDeduction(deduction);
      setNotice(`${refOf(deduction.number)} is ready and the file was downloaded. Next, go to Stock Adjustment and upload it. Stock changes then, not before.`);
      await load();
    } catch (e) {
      setError(errMsg(e, "Could not make the deduction"));
    } finally {
      setBusy(false);
    }
  }

  async function cancel(d: DeductionRecord) {
    if (!window.confirm(`Cancel ${refOf(d.number)}? Its sales will be picked up by the next deduction.`)) return;
    setBusy(true);
    try {
      await cancelDeduction(d.id);
      setNotice(`${refOf(d.number)} cancelled.`);
      await load();
    } catch (e) {
      setError(errMsg(e, "Could not cancel"));
    } finally {
      setBusy(false);
    }
  }

  const lines = preview?.lines ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#071A2F]">Deduct sales from stock</h1>
          <p className="text-sm text-gray-500">Step 1 of 3 at the end of the day: deduct, then Stock Adjustment, then Daily Stock. Close the day last.</p>
        </div>
        <button onClick={() => void load()} className={`${ghostBtn} flex items-center gap-1`}><RefreshCw size={14} /> Refresh</button>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">{notice}</div>}

      {preview && !preview.enabled && (
        <p className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm ring-1 ring-black/5">
          Stock is taken off as each sale is made, so there is nothing to run. To deduct at day end instead, switch it on in Settings, Restaurant Mode.
        </p>
      )}

      {waiting && (
        <section className="space-y-3 rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
          <p className="font-semibold text-amber-900">{refOf(waiting.number)} is waiting to be uploaded</p>
          <p className="text-sm text-amber-800">
            It covers {waiting.salesCount} sale{waiting.salesCount === 1 ? "" : "s"} up to {when(waiting.toAt)}. Stock has not changed yet.
            Upload its file in <Link href="/dashboard/stock-adjustment" className="font-semibold underline">Stock Adjustment</Link>.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => downloadDeduction(waiting)} className={`${ghostBtn} flex items-center gap-1`}><Download size={14} /> Download the file again</button>
            {canMake && <button onClick={() => cancel(waiting)} disabled={busy} className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">Cancel it</button>}
          </div>
        </section>
      )}

      {preview?.enabled && !waiting && (
        <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-sm text-gray-600">
            <b>{preview.salesCount}</b> sale{preview.salesCount === 1 ? "" : "s"} not yet deducted
            {preview.from && new Date(preview.from).getTime() > 0 ? `, since ${when(preview.from)}` : ""}.
          </p>
          {(preview.openTabs ?? 0) > 0 && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" />
              {preview.openTabs} table tab{preview.openTabs === 1 ? " is" : "s are"} still open. Pay or cancel {preview.openTabs === 1 ? "it" : "them"} first, or their items will be left for the next deduction.
            </p>
          )}
          {lines.length === 0 ? (
            <p className="text-sm text-gray-500">No new sales to deduct.</p>
          ) : (
            <>
              <UsageTable lines={lines} />
              {canMake ? (
                <button onClick={make} disabled={busy} className={`${primaryBtn} flex items-center gap-1`}><Download size={14} /> {busy ? "Working…" : "Make the deduction and download the file"}</button>
              ) : (
                <p className="text-sm text-gray-500">A manager does this.</p>
              )}
              <p className="text-xs text-gray-500">This only prepares the file. Stock changes when it is uploaded in Stock Adjustment.</p>
            </>
          )}
        </section>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="mb-3 font-semibold text-[#071A2F]">Previous deductions</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">None yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase text-gray-500">
              <tr><th className="py-2">No.</th><th className="py-2">Up to</th><th className="py-2 text-right">Sales</th><th className="py-2">Status</th></tr>
            </thead>
            <tbody>
              {history.map((d) => (
                <Fragment key={d.id}>
                  <tr onClick={() => setOpen(open === d.id ? null : d.id)} className="cursor-pointer border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 font-medium text-[#071A2F]">{refOf(d.number)}</td>
                    <td className="py-2.5">{when(d.toAt)}</td>
                    <td className="py-2.5 text-right">{d.salesCount}</td>
                    <td className="py-2.5">
                      {d.status === "APPLIED"
                        ? <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">Saved by {d.appliedBy}</span>
                        : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Waiting for upload</span>}
                    </td>
                  </tr>
                  {open === d.id && <tr><td colSpan={4} className="bg-gray-50 p-3"><UsageTable lines={d.lines} /></td></tr>}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
