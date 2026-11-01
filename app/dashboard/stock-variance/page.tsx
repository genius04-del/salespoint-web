"use client";

import { useEffect, useState } from "react";
import { getVarianceReport } from "@/lib/api/stockCounts";
import type { VarianceReport } from "@/lib/stockTypes";
import { inputClass } from "@/components/kitchen/Modal";
import { cedi, errMsg, qty } from "@/components/kitchen/format";

const RANGES = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
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

export default function StockVariancePage() {
  const [range, setRange] = useState("month");
  const [report, setReport] = useState<VarianceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await getVarianceReport(range);
        if (!cancelled) {
          setReport(res);
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
  }, [range]);

  const s = report?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#071A2F]">Stock Variance</h1>
          <p className="text-sm text-gray-500">Where stock went missing: counted against what the system expected.</p>
        </div>
        <select className={`${inputClass} w-40`} value={range} onChange={(e) => setRange(e.target.value)}>
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && !report && <p className="text-gray-500">Loading…</p>}

      {s && report && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Missing stock (counts)" value={s.shortageValue} tone="bad" />
            <Tile label="Extra stock (counts)" value={s.surplusValue} tone="good" />
            <Tile label="Written off as waste" value={s.wasteValue} tone="bad" />
            <Tile label="Over-use in production" value={s.productionOverUseValue} tone="bad" />
          </div>
          <p className="text-xs text-gray-500">Based on {s.countsApproved} approved count{s.countsApproved === 1 ? "" : "s"} in this period. Only approved counts appear here.</p>

          <section>
            <h2 className="mb-2 text-lg font-bold text-[#071A2F]">Counted against expected</h2>
            {report.items.length === 0 ? (
              <p className="text-sm text-gray-500">No differences found. Everything counted matched the system.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3 text-right">Times short</th>
                      <th className="px-4 py-3 text-right">Difference</th>
                      <th className="px-4 py-3 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.items.map((i) => (
                      <tr key={`${i.itemType}-${i.itemId}`} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-3 text-[#071A2F]">
                          {i.name}
                          <span className="ml-1 text-xs text-gray-400">{i.itemType === "INGREDIENT" ? "ingredient" : "product"}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{i.timesShort} of {i.timesCounted}</td>
                        <td className={`px-4 py-3 text-right ${i.totalVariance < 0 ? "text-red-600" : "text-green-600"}`}>
                          {i.totalVariance > 0 ? "+" : ""}{qty(i.totalVariance)} {i.unit}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${i.totalValue < 0 ? "text-red-600" : "text-green-600"}`}>{cedi(i.totalValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {report.production.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-bold text-[#071A2F]">Used more than the standard in production</h2>
              <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Ingredient</th>
                      <th className="px-4 py-3 text-right">Standard</th>
                      <th className="px-4 py-3 text-right">Actually used</th>
                      <th className="px-4 py-3 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.production.map((p) => (
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

          {report.waste.length > 0 && (
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
                    {report.waste.map((w) => (
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
