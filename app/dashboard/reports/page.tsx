 "use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  Smartphone,
  CreditCard,
  TriangleAlert,
  History,
} from "lucide-react";
import { getDashboardReport } from "@/lib/api/reports";
import type { DashboardReport, ReportRange } from "@/lib/types";

const RANGES: { value: ReportRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

function money(n: number | string) {
  return `GH₵ ${Number(n).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "bad";
}) {
  const color =
    tone === "good"
      ? "text-green-600"
      : tone === "bad"
        ? "text-red-600"
        : "text-[#071A2F]";

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function ReportsPage() {
  const [range, setRange] = useState<ReportRange>("today");
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getDashboardReport(range);
        if (!cancelled) setReport(data);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const balances = report
    ? [
        { label: "Cash", value: report.balances.cash, icon: Wallet },
        { label: "Bank", value: report.balances.bank, icon: Landmark },
        { label: "Mobile Money", value: report.balances.mobileMoney, icon: Smartphone },
        { label: "Paystack Clearing", value: report.balances.paystackClearing, icon: CreditCard },
        { label: "Customers Owe You", value: report.balances.accountsReceivable, icon: TrendingUp },
        { label: "You Owe Suppliers", value: report.balances.accountsPayable, icon: TrendingDown },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#071A2F]">Reports</h1>
          {report && (
            <p className="text-sm text-gray-500">{report.period.label}</p>
          )}
        </div>
        <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/5">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                range === r.value
                  ? "bg-[#FF6B00] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !report && <p className="text-gray-500">Loading report…</p>}

      {report && (
        <div className={loading ? "opacity-60 transition" : "transition"}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <MetricCard label="Orders" value={String(report.sales.orders)} />
            <MetricCard label="Sales Total" value={money(report.sales.total)} />
            <MetricCard label="Revenue" value={money(report.profit.revenue)} />
            <MetricCard label="Cost of Goods Sold" value={money(report.profit.costOfGoodsSold)} />
            <MetricCard
              label="Gross Profit"
              value={money(report.profit.grossProfit)}
              tone={Number(report.profit.grossProfit) >= 0 ? "good" : "bad"}
            />
            <MetricCard
              label="Net Profit"
              value={money(report.profit.netProfit)}
              tone={Number(report.profit.netProfit) >= 0 ? "good" : "bad"}
            />
          </div>

          <h2 className="mb-3 mt-8 text-lg font-semibold text-[#071A2F]">
            Where the Money Is
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {balances.map((b) => (
              <div
                key={b.label}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
              >
                <div className="rounded-xl bg-[#071A2F]/5 p-2.5 text-[#071A2F]">
                  <b.icon size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{b.label}</p>
                  <p className="font-semibold text-[#071A2F]">{money(b.value)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <h2 className="mb-3 font-semibold text-[#071A2F]">Payment Methods</h2>
              {report.paymentMethods.length === 0 ? (
                <p className="text-sm text-gray-500">No sales in this period.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {report.paymentMethods.map((p) => (
                    <li key={p.method} className="flex justify-between py-2.5 text-sm">
                      <span className="text-gray-700">
                        {p.method.replace(/_/g, " ")}{" "}
                        <span className="text-gray-400">({p.orders})</span>
                      </span>
                      <span className="font-medium text-[#071A2F]">{money(p.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-[#071A2F]">
                <TriangleAlert size={18} className="text-amber-500" />
                Low Stock
              </h2>
              {report.lowStock.length === 0 ? (
                <p className="text-sm text-gray-500">Everything is well stocked.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {report.lowStock.map((p) => (
                    <span
                      key={p.id}
                      className="rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-700"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-[#071A2F]">
              <History size={18} />
              Recent Transactions
            </h2>
            {report.recentTransactions.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing recorded yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {report.recentTransactions.map((t, i) => (
                  <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="text-gray-800">{t.description}</p>
                      <p className="text-xs text-gray-400">
                        {t.type} · {new Date(t.date).toLocaleString("en-GH")}
                      </p>
                    </div>
                    <span className="font-medium text-[#071A2F]">{money(t.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}