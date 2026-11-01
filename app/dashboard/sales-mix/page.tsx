"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Printer, Search } from "lucide-react";
import { getSalesMix } from "@/lib/api/salesMix";
import type { MixRange, SalesMixResponse } from "@/lib/dayTypes";
import { money } from "@/components/day/format";

const RANGES: { value: MixRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

function Card({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-green-600" : tone === "bad" ? "text-red-600" : "text-[#071A2F]";
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function SalesMixView() {
  const dayId = useSearchParams().get("dayId");

  const [range, setRange] = useState<MixRange>("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<SalesMixResponse | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const customReady = range !== "custom" || (from !== "" && to !== "");

  useEffect(() => {
    if (!dayId && !customReady) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getSalesMix(dayId ? { dayId } : { range, from, to });
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load the sales mix");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range, from, to, dayId, customReady]);

  const products = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!data) return [];
    return q
      ? data.products.filter((p) => p.productName.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
      : data.products;
  }, [data, search]);

  const maxQty = data?.products[0]?.quantity ?? 0;
  const field = "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FF6B00]";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-[#071A2F]">Sales Mix</h1>
          <p className="text-sm text-gray-500">
            {dayId ? "Everything sold on this business day." : "What was sold: units, money and profit per item."}
          </p>
        </div>
        {!dayId && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/5">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    range === r.value ? "bg-[#FF6B00] text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {range === "custom" && (
              <>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} aria-label="From" />
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} aria-label="To" />
              </>
            )}
          </div>
        )}
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && !data && <p className="text-gray-500">Loading…</p>}
      {!customReady && <p className="text-sm text-gray-500">Pick a start and end date.</p>}

      {data && (
        <div className={loading ? "opacity-60 transition" : "transition"}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Card label="Sales" value={String(data.orders)} />
            <Card label="Items sold" value={String(data.totals.itemsSold)} />
            <Card label="Revenue" value={money(data.totals.revenue)} />
            <Card label="Cost" value={money(data.totals.cost)} />
            <Card label="Profit" value={money(data.totals.profit)} tone={data.totals.profit >= 0 ? "good" : "bad"} />
          </div>

          {data.categories.length > 0 && (
            <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <h2 className="mb-3 font-semibold text-[#071A2F]">By category</h2>
              <ul className="space-y-3">
                {data.categories.map((c) => (
                  <li key={c.category}>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {c.category} <span className="text-gray-400">· {c.quantity} sold</span>
                      </span>
                      <span className="font-medium text-[#071A2F]">
                        {money(c.revenue)} <span className="text-gray-400">({c.revenueSharePct}%)</span>
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-[#071A2F]" style={{ width: `${Math.min(100, c.revenueSharePct)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-[#071A2F]">
                Every item <span className="text-sm font-normal text-gray-400">· {data.totals.distinctProducts} different</span>
              </h2>
              <div className="flex items-center gap-2 print:hidden">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Find an item"
                    className="rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-[#FF6B00]"
                  />
                </div>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-[#071A2F] hover:bg-gray-50"
                >
                  <Printer size={14} /> Print
                </button>
              </div>
            </div>

            {products.length === 0 ? (
              <p className="text-sm text-gray-500">{data.products.length === 0 ? "Nothing was sold in this period." : "No match."}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-100 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="py-2">#</th>
                      <th className="py-2">Item</th>
                      <th className="py-2 w-40">Units sold</th>
                      <th className="py-2 text-right">Revenue</th>
                      <th className="py-2 text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {products.map((p, i) => (
                      <tr key={p.productId}>
                        <td className="py-2.5 pr-2 text-gray-400">{i + 1}</td>
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-[#071A2F]">{p.productName}</p>
                          <p className="text-xs text-gray-400">{p.category}</p>
                        </td>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="w-10 text-right font-semibold text-[#071A2F]">{p.quantity}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-[#FF6B00]"
                                style={{ width: `${maxQty > 0 ? (p.quantity / maxQty) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 text-right">{money(p.revenue)}</td>
                        <td className={`py-2.5 text-right ${p.profit < 0 ? "text-red-600" : "text-gray-700"}`}>{money(p.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default function SalesMixPage() {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <SalesMixView />
    </Suspense>
  );
}
