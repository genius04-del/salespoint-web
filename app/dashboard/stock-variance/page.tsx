"use client";

import { Fragment, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { getMovementReport, getVarianceReportBetween } from "@/lib/api/stockCounts";
import type { MovementReport, MovementReportRow, VarianceReport } from "@/lib/stockTypes";
import { ghostBtn, inputClass } from "@/components/kitchen/Modal";
import { cedi, errMsg, qty } from "@/components/kitchen/format";

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => isoDay(new Date(Date.now() - n * 86_400_000));

const PRESETS = [
  { label: "Today", from: () => isoDay(new Date()), to: () => isoDay(new Date()) },
  { label: "Yesterday", from: () => daysAgo(1), to: () => daysAgo(1) },
  { label: "Last 7 days", from: () => daysAgo(6), to: () => isoDay(new Date()) },
  { label: "This month", from: () => isoDay(new Date()).slice(0, 8) + "01", to: () => isoDay(new Date()) },
];

function Tile({ label, value, tone }: { label: string; value: number; tone?: "bad" | "good" }) {
  const color = tone === "bad" && value !== 0 ? "text-red-600" : tone === "good" && value > 0 ? "text-green-600" : "text-[#071A2F]";
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{cedi(value)}</p>
    </div>
  );
}

function downloadCsv(rows: MovementReportRow[], from: string, to: string) {
  const head = ["Group", "Item", "Unit", "Opening", "In", "Out", "Waste", "Theoretical closing", "Actual closing", "Variance", "Variance value (GHS)"];
  const lines = rows.map((r) =>
    [r.category ?? "", r.name, r.unit, r.opening, r.stockIn, r.stockOut, r.waste, r.theoreticalClosing, r.actualClosing ?? "", r.variance ?? "", r.varianceValue ?? ""]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `stock-variance_${from}_to_${to}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const signed = (n: number, unit: string) => `${n > 0 ? "+" : ""}${qty(n)} ${unit}`;

export default function StockVariancePage() {
  const [from, setFrom] = useState(isoDay(new Date()));
  const [to, setTo] = useState(isoDay(new Date()));
  const [report, setReport] = useState<MovementReport | null>(null);
  const [details, setDetails] = useState<VarianceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [onlyProblems, setOnlyProblems] = useState(false);

  useEffect(() => {
    if (!from || !to || from > to) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [rep, det] = await Promise.all([getMovementReport(from, to), getVarianceReportBetween(from, to)]);
        if (!cancelled) {
          setReport(rep);
          setDetails(det);
          setError("");
        }
      } catch (e) {
        if (!cancelled) setError(errMsg(e, "Could not load the report"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const rows = (report?.rows ?? []).filter((r) => !onlyProblems || (r.variance ?? 0) !== 0);
  const bad = from > to;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#071A2F]">Stock Variance</h1>
        <p className="text-sm text-gray-500">
          For each item: what you started with, what should be left (theoretical), what is really there (actual after the daily stock count), and the difference.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-[#071A2F]">From</span>
          <input type="date" className={`${inputClass} w-40`} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-[#071A2F]">To</span>
          <input type="date" className={`${inputClass} w-40`} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" className={ghostBtn} onClick={() => { setFrom(p.from()); setTo(p.to()); }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {bad && <p className="text-sm text-red-600">The start date must not be after the end date.</p>}

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && !report && <p className="text-gray-500">Loading…</p>}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Missing stock (value)" value={report.totals.shortageValue} tone="bad" />
            <Tile label="Extra stock (value)" value={report.totals.surplusValue} tone="good" />
            <Tile label="Written off as waste" value={details?.summary.wasteValue ?? 0} tone="bad" />
            <Tile label="Over-use in production" value={details?.summary.productionOverUseValue ?? 0} tone="bad" />
          </div>
          <p className="text-xs text-gray-500">
            {report.totals.itemsCounted} item{report.totals.itemsCounted === 1 ? "" : "s"} counted in this period; {report.totals.itemsShort} short.
            Only approved counts change the actual figure, so ask a manager to approve the day&apos;s count. Values use today&apos;s cost.
          </p>

          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[#071A2F]">Item by item</h2>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} />
                  Only items with a difference
                </label>
                <button className={`${ghostBtn} flex items-center gap-1`} onClick={() => downloadCsv(rows, from, to)} disabled={rows.length === 0}>
                  <Download size={14} /> CSV
                </button>
              </div>
            </div>
            {rows.length === 0 ? (
              <p className="text-sm text-gray-500">
                {onlyProblems ? "No differences found. Everything counted matched the system." : "Nothing moved in this period and nothing was counted."}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Item</th>
                      <th className="px-3 py-3 text-right">Opening</th>
                      <th className="px-3 py-3 text-right">In</th>
                      <th className="px-3 py-3 text-right">Out</th>
                      <th className="px-3 py-3 text-right">Waste</th>
                      <th className="px-3 py-3 text-right">Theoretical closing</th>
                      <th className="px-3 py-3 text-right">Actual closing</th>
                      <th className="px-3 py-3 text-right">Variance</th>
                      <th className="px-4 py-3 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const newGroup = i === 0 || rows[i - 1].category !== r.category;
                      const v = r.variance;
                      return (
                        <Fragment key={`${r.itemType}-${r.itemId}`}>
                          {newGroup && (
                            <tr className="bg-gray-50">
                              <td colSpan={9} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">{r.category ?? "Other"}</td>
                            </tr>
                          )}
                          <tr className="border-b border-gray-50 last:border-0">
                            <td className="px-4 py-3 text-[#071A2F]">
                              {r.name}
                              <span className="ml-1 text-xs text-gray-400">{r.unit}</span>
                            </td>
                            <td className="px-3 py-3 text-right text-gray-600">{qty(r.opening)}</td>
                            <td className="px-3 py-3 text-right text-gray-600">{r.stockIn ? `+${qty(r.stockIn)}` : "—"}</td>
                            <td className="px-3 py-3 text-right text-gray-600">{r.stockOut ? `-${qty(r.stockOut)}` : "—"}</td>
                            <td className="px-3 py-3 text-right text-gray-600">{r.waste ? `-${qty(r.waste)}` : "—"}</td>
                            <td className="px-3 py-3 text-right font-medium text-[#071A2F]">{qty(r.theoreticalClosing)}</td>
                            <td className="px-3 py-3 text-right font-medium text-[#071A2F]">{r.actualClosing === null ? <span className="font-normal text-gray-400">not counted</span> : qty(r.actualClosing)}</td>
                            <td className={`px-3 py-3 text-right font-medium ${v === null || v === 0 ? "text-gray-500" : v < 0 ? "text-red-600" : "text-green-600"}`}>
                              {v === null ? "—" : v === 0 ? "0" : signed(v, r.unit)}
                            </td>
                            <td className={`px-4 py-3 text-right font-medium ${!r.varianceValue ? "text-gray-500" : r.varianceValue < 0 ? "text-red-600" : "text-green-600"}`}>
                              {r.varianceValue === null ? "—" : cedi(r.varianceValue)}
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {details && details.production.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-bold text-[#071A2F]">Used more than the recipe in production</h2>
              <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Ingredient</th>
                      <th className="px-4 py-3 text-right">Recipe says</th>
                      <th className="px-4 py-3 text-right">Actually used</th>
                      <th className="px-4 py-3 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.production.map((p) => (
                      <tr key={p.ingredientId} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-3 text-[#071A2F]">{p.name}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{qty(p.standard)} {p.unit}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{qty(p.used)} {p.unit}</td>
                        <td className={`px-4 py-3 text-right font-medium ${p.value > 0 ? "text-red-600" : "text-green-600"}`}>{cedi(p.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {details && details.waste.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-bold text-[#071A2F]">Waste</h2>
              <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Ingredient</th>
                      <th className="px-4 py-3 text-right">Quantity</th>
                      <th className="px-4 py-3 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.waste.map((w) => (
                      <tr key={w.ingredientId} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-3 text-[#071A2F]">{w.name}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{qty(w.quantity)} {w.unit}</td>
                        <td className="px-4 py-3 text-right font-medium text-red-600">{cedi(w.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
