"use client";

import { Fragment, useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  approveStockCount,
  deleteStockCount,
  getStockCount,
  rejectStockCount,
  saveCountLines,
  submitStockCount,
} from "@/lib/api/stockCounts";
import type { StockCountDetail } from "@/lib/stockTypes";
import { StatusBadge } from "./StatusBadge";
import { ghostBtn, inputClass, primaryBtn } from "./Modal";
import { cedi, errMsg, num, qty, when } from "./format";

export function CountSheet({ id, onBack }: { id: string; onBack: () => void }) {
  const { hasPermission } = useAuth();
  const canCount = hasPermission("stock.count");
  const canApprove = hasPermission("stock.approve");

  const [count, setCount] = useState<StockCountDetail | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [showExpected, setShowExpected] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { count: c } = await getStockCount(id);
        if (cancelled) return;
        setCount(c);
        setValues(Object.fromEntries(c.lines.map((l) => [l.id, l.counted === null ? "" : String(Number(l.counted))])));
      } catch (e) {
        if (!cancelled) setError(errMsg(e, "Could not load the count"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  if (!count) {
    return (
      <div className="space-y-3">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-600"><ArrowLeft size={14} /> Back</button>
        {error ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div> : <p className="text-gray-500">Loading…</p>}
      </div>
    );
  }

  const draft = count.status === "DRAFT";
  const lines = count.lines.filter((l) => l.itemName.toLowerCase().includes(search.trim().toLowerCase()));
  const filled = count.lines.filter((l) => (draft ? values[l.id]?.trim() : l.counted) ).length;

  function collect() {
    const out: { lineId: string; counted: number | null }[] = [];
    for (const l of count!.lines) {
      const raw = values[l.id] ?? "";
      if (raw.trim() === "") {
        if (l.counted !== null) out.push({ lineId: l.id, counted: null });
        continue;
      }
      const n = num(raw);
      if (!Number.isFinite(n) || n < 0) throw new Error(`${l.itemName}: enter a number, zero or more.`);
      if (l.itemType === "PRODUCT" && !Number.isInteger(n)) throw new Error(`${l.itemName} is counted in whole units.`);
      out.push({ lineId: l.id, counted: n });
    }
    return out;
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await fn();
    } catch (e) {
      setError(errMsg(e, "Something went wrong"));
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(async () => {
      const payload = collect();
      if (payload.length) await saveCountLines(id, payload);
      setInfo("Progress saved.");
      setReloadKey((k) => k + 1);
    });

  const submit = () =>
    run(async () => {
      const payload = collect();
      if (payload.length) await saveCountLines(id, payload);
      await submitStockCount(id);
      setReloadKey((k) => k + 1);
    });

  const remove = () =>
    run(async () => {
      await deleteStockCount(id);
      onBack();
    });

  const approve = () =>
    run(async () => {
      await approveStockCount(id);
      setReloadKey((k) => k + 1);
    });

  const reject = () =>
    run(async () => {
      if (!note.trim()) throw new Error("Say why you are sending it back.");
      await rejectStockCount(id, note.trim());
      setRejecting(false);
      setReloadKey((k) => k + 1);
    });

  const countedLines = count.lines.filter((l) => l.counted !== null);
  const shown = draft ? lines : lines.filter((l) => l.counted !== null);
  const net = countedLines.reduce((s, l) => s + Number(l.varianceValue ?? 0), 0);
  const columns = !draft || showExpected;
  // Grouped (Vegetables, Meat, Packaging...) so the counter walks the shelves in order.
  const ordered = [...shown].sort(
    (a, b) => (a.category ?? "~").localeCompare(b.category ?? "~") || a.itemName.localeCompare(b.itemName)
  );

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-600 hover:text-[#071A2F]"><ArrowLeft size={14} /> All counts</button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#071A2F]">Stock count, {when(count.createdAt)}</h2>
          <p className="text-sm text-gray-500">{filled} of {count.lines.length} items counted</p>
        </div>
        <StatusBadge status={count.status} />
      </div>

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {info && <div className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{info}</div>}
      {count.status === "REJECTED" && count.reviewNote && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Sent back: {count.reviewNote}</div>
      )}
      {count.status === "APPROVED" && (
        <div className="rounded-xl bg-gray-50 p-3 text-sm text-[#071A2F]">
          Approved. Stock was corrected and the net {Number(count.totalVarianceValue ?? 0) < 0 ? "loss" : "gain"} of{" "}
          <b>{cedi(Math.abs(Number(count.totalVarianceValue ?? 0)))}</b> was booked in Finance.
        </div>
      )}
      {count.status === "SUBMITTED" && (
        <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
          {canApprove ? "Check the differences below, then approve or send it back. Nothing changes in stock until you approve." : "Waiting for a manager to approve."}
          {" "}Net difference so far: <b>{cedi(net)}</b>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className={`${inputClass} pl-9`} placeholder="Find an item" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {draft && (
          <button onClick={() => setShowExpected((s) => !s)} className="flex items-center gap-1 text-sm text-gray-600 hover:text-[#071A2F]">
            {showExpected ? <EyeOff size={14} /> : <Eye size={14} />} {showExpected ? "Hide" : "Show"} system quantity
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Item</th>
              {columns && <th className="px-4 py-3 text-right">System</th>}
              <th className="px-4 py-3 text-right">Counted</th>
              {columns && <th className="px-4 py-3 text-right">Difference</th>}
            </tr>
          </thead>
          <tbody>
            {ordered.map((l, idx) => {
              const draftNum = num(values[l.id] ?? "");
              const diff = draft ? (Number.isFinite(draftNum) ? draftNum - Number(l.expected) : null) : l.variance === null ? null : Number(l.variance);
              const newGroup = idx === 0 || ordered[idx - 1].category !== l.category;
              return (
                <Fragment key={l.id}>
                {newGroup && (
                  <tr className="bg-gray-50">
                    <td colSpan={columns ? 4 : 2} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">{l.category ?? "Other"}</td>
                  </tr>
                )}
                <tr className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2 text-[#071A2F]">
                    {l.itemName}
                    <span className="ml-1 text-xs text-gray-400">{l.unit}</span>
                  </td>
                  {columns && <td className="px-4 py-2 text-right text-gray-600">{qty(l.expected)}</td>}
                  <td className="px-4 py-2 text-right">
                    {draft && canCount ? (
                      <input
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm outline-none focus:border-[#FF6B00]"
                        inputMode="decimal"
                        value={values[l.id] ?? ""}
                        onChange={(e) => setValues({ ...values, [l.id]: e.target.value })}
                      />
                    ) : (
                      qty(l.counted)
                    )}
                  </td>
                  {columns && (
                    <td className={`px-4 py-2 text-right font-medium ${diff === null || diff === 0 ? "text-gray-400" : diff < 0 ? "text-red-600" : "text-green-600"}`}>
                      {diff === null ? "—" : diff === 0 ? "OK" : `${diff > 0 ? "+" : ""}${qty(diff)}`}
                      {!draft && l.varianceValue && Number(l.varianceValue) !== 0 && (
                        <span className="block text-xs font-normal">{cedi(l.varianceValue)}</span>
                      )}
                    </td>
                  )}
                </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {rejecting && (
        <div className="space-y-2 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <input className={inputClass} placeholder="Why? e.g. Recount the freezer" value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
          <div className="flex justify-end gap-2">
            <button onClick={() => setRejecting(false)} className={ghostBtn}>Cancel</button>
            <button onClick={reject} disabled={busy} className={primaryBtn}>Send back</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        {draft && canCount ? (
          <>
            <button onClick={remove} disabled={busy} className="text-sm text-red-600 hover:underline">Delete this count</button>
            <div className="flex gap-2">
              <button onClick={save} disabled={busy} className={ghostBtn}>Save progress</button>
              <button onClick={submit} disabled={busy || filled === 0} className={primaryBtn}>Submit for approval</button>
            </div>
          </>
        ) : count.status === "SUBMITTED" && canApprove ? (
          <>
            <span />
            <div className="flex gap-2">
              <button onClick={() => setRejecting(true)} disabled={busy} className={ghostBtn}>Send back</button>
              <button onClick={approve} disabled={busy} className={primaryBtn}>{busy ? "Working…" : "Approve and adjust stock"}</button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
