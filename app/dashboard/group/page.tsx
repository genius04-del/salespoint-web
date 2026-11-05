"use client";

import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { getGroupMe, getGroupReport, type GroupReport } from "@/lib/api/groups";
import { errMsg } from "@/components/kitchen/format";
import { ghostBtn, inputClass } from "@/components/kitchen/Modal";
import { dateTime, money, varianceLabel, varianceTone } from "@/components/day/format";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const startOf = (s: string) => new Date(`${s}T00:00:00`).toISOString();
const endOf = (s: string) => new Date(`${s}T23:59:59.999`).toISOString();
const METHODS: [string, string][] = [["CASH", "Cash"], ["MOBILE_MONEY", "MoMo"], ["BANK_TRANSFER", "Bank"], ["PAYSTACK", "Paystack"], ["OTHER", "Other"]];

function range(preset: "today" | "week" | "month"): [string, string] {
  const now = new Date();
  if (preset === "today") return [ymd(now), ymd(now)];
  if (preset === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
    return [ymd(start), ymd(now)];
  }
  return [ymd(new Date(now.getFullYear(), now.getMonth(), 1)), ymd(now)];
}

export default function GroupReportPage() {
  const [from, setFrom] = useState(ymd(new Date()));
  const [to, setTo] = useState(ymd(new Date()));
  const [report, setReport] = useState<GroupReport | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setAllowed((await getGroupMe()).isGroupAdmin);
      } catch {
        setAllowed(false);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await getGroupReport(startOf(from), endOf(to)));
      setError("");
    } catch (e) {
      setError(errMsg(e, "Could not load the report"));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    if (!allowed) return;
    const t = setTimeout(() => { void load(); }, 150);
    return () => clearTimeout(t);
  }, [allowed, load]);

  function csv() {
    if (!report) return;
    const rows = [["Branch", "Sales", "Total", ...METHODS.map((m) => m[1]), "Cancelled"],
      ...report.rows.map((r) => [r.name, String(r.sales), r.total.toFixed(2), ...METHODS.map(([k]) => (r.byMethod[k] ?? 0).toFixed(2)), String(r.cancelled)]),
      ["All branches", String(report.totals.sales), report.totals.total.toFixed(2), ...METHODS.map(([k]) => (report.totals.byMethod[k] ?? 0).toFixed(2)), ""]];
    const body = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
    a.download = `all-branches-${from}-to-${to}.csv`;
    a.click();
  }

  if (allowed === null) return <p className="text-gray-500">Loading…</p>;
  if (!allowed) return <p className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm ring-1 ring-black/5">This report is for the chain owner.</p>;

  const selling = report?.rows.filter((r) => r.branchType === "OUTLET") ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#071A2F]">All branches</h1>
          <p className="text-sm text-gray-500">What every branch has taken, side by side.</p>
        </div>
        <button onClick={csv} disabled={!report} className={`${ghostBtn} flex items-center gap-1`}><Download size={14} /> Download CSV</button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
        {(["today", "week", "month"] as const).map((p) => (
          <button key={p} onClick={() => { const [f, t] = range(p); setFrom(f); setTo(t); }} className={ghostBtn}>{p === "today" ? "Today" : p === "week" ? "This week" : "This month"}</button>
        ))}
        <input type="date" className={`${inputClass} w-auto`} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-gray-400">to</span>
        <input type="date" className={`${inputClass} w-auto`} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Total taken" value={money(report.totals.total)} big />
            <Tile label="Sales" value={String(report.totals.sales)} />
            {METHODS.filter(([k]) => (report.totals.byMethod[k] ?? 0) > 0).slice(0, 2).map(([k, l]) => <Tile key={k} label={l} value={money(report.totals.byMethod[k])} />)}
          </div>

          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Branch</th><th className="px-3 py-2 text-right">Sales</th><th className="px-3 py-2 text-right">Total</th>
                  {METHODS.map(([, l]) => <th key={l} className="px-3 py-2 text-right">{l}</th>)}
                  <th className="px-3 py-2 text-right">Cancelled</th><th className="px-3 py-2">Day</th><th className="px-3 py-2">Last close</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && <tr><td colSpan={10} className="px-3 py-6 text-center text-gray-400">Loading…</td></tr>}
                {report.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 font-medium text-[#071A2F]">{r.name}{r.branchType === "PRODUCTION" && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">production</span>}</td>
                    <td className="px-3 py-2 text-right">{r.sales}</td>
                    <td className="px-3 py-2 text-right font-semibold">{money(r.total)}</td>
                    {METHODS.map(([k]) => <td key={k} className="px-3 py-2 text-right text-gray-600">{r.byMethod[k] ? money(r.byMethod[k]) : "-"}</td>)}
                    <td className="px-3 py-2 text-right text-gray-500">{r.cancelled || "-"}</td>
                    <td className="px-3 py-2 text-xs">{r.dayOpen ? <span className="text-green-700">Open since {dateTime(r.dayOpen.openedAt)}</span> : <span className="text-gray-400">Closed</span>}</td>
                    <td className="px-3 py-2 text-xs">
                      {r.lastClosed ? (
                        <span className={`rounded-full px-2 py-0.5 font-medium ${varianceTone(r.lastClosed.variance ?? 0)}`}>{varianceLabel(r.lastClosed.variance ?? 0)}</span>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-200 bg-gray-50 font-bold text-[#071A2F]">
                <tr>
                  <td className="px-3 py-2">All branches ({selling.length} selling)</td>
                  <td className="px-3 py-2 text-right">{report.totals.sales}</td>
                  <td className="px-3 py-2 text-right">{money(report.totals.total)}</td>
                  {METHODS.map(([k]) => <td key={k} className="px-3 py-2 text-right">{report.totals.byMethod[k] ? money(report.totals.byMethod[k]) : "-"}</td>)}
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 shadow-sm ring-1 ring-black/5 ${big ? "bg-[#071A2F] text-white" : "bg-white"}`}>
      <p className={`text-xs ${big ? "text-white/60" : "text-gray-500"}`}>{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
