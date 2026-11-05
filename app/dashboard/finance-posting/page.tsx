"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getCurrentDay, listDays } from "@/lib/api/days";
import { METHOD_LABELS } from "@/lib/dayTypes";
import type { BusinessDayInfo, CloseDayResponse, CurrentDayResponse } from "@/lib/dayTypes";
import { CashUpForm, ClosedSummary } from "@/components/day/CashUpForm";
import { DayDetailModal } from "@/components/day/DayDetailModal";
import { dateTime, money, varianceLabel, varianceTone } from "@/components/day/format";

const voucherNo = (n: number) => `FP-${String(n).padStart(4, "0")}`;

export default function FinancePostingPage() {
  const { hasPermission } = useAuth();
  const canClose = hasPermission("day.close");
  const canHistory = canClose || hasPermission("finance.view");

  const [current, setCurrent] = useState<CurrentDayResponse | null>(null);
  const [history, setHistory] = useState<BusinessDayInfo[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [closed, setClosed] = useState<CloseDayResponse | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const cur = await getCurrentDay();
        const days = canHistory ? (await listDays()).days : [];
        if (!cancelled) {
          setCurrent(cur);
          setHistory(days);
          setError("");
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, canHistory]);

  const reload = () => setReloadKey((k) => k + 1);
  const day = current?.day ?? null;
  const expected = current?.expected ?? [];
  const totalSales = expected.reduce((s, r) => s + r.sales, 0) + (current?.paystack ?? 0);

  // The posting voucher: money received, by where it landed, against the sales.
  const debitLines = [
    ...expected.map((r) => ({ name: `${METHOD_LABELS[r.method]} account`, amount: r.sales })),
    { name: "Paystack account", amount: current?.paystack ?? 0 },
  ].filter((l) => l.amount > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#071A2F]">Finance Posting</h1>
          <p className="text-sm text-gray-500">Check the day&apos;s sales, count the money, then save to close the day.</p>
        </div>
        <button onClick={reload} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#071A2F] hover:bg-gray-50">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && !current && <p className="text-gray-500">Loading…</p>}

      {closed && (
        <ClosedSummary result={closed} onDone={() => { setClosed(null); reload(); }} />
      )}

      {!closed && current && !day && (
        <div className="flex items-center gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <span className="rounded-xl bg-gray-100 p-2.5 text-gray-500"><Lock size={20} /></span>
          <div>
            <p className="font-semibold text-[#071A2F]">No day is open</p>
            <p className="text-sm text-gray-500">Open the day on the Day End page. When it is time to close, come back here.</p>
          </div>
        </div>
      )}

      {!closed && current && day && !canClose && (
        <p className="rounded-2xl bg-white p-5 text-sm text-gray-500 shadow-sm ring-1 ring-black/5">Only a manager can post and close the day.</p>
      )}

      {!closed && current && day && canClose && current.expected && (
        <>
          {/* The voucher */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <dl className="mb-4 grid gap-3 sm:grid-cols-4">
              <Info label="Voucher no." value={voucherNo(day.number)} />
              <Info label="Date" value={new Date(day.openedAt).toLocaleDateString("en-GH")} />
              <Info label="Opened by" value={day.openedBy} />
              <Info label="Sales" value={`${current.orders ?? 0}`} />
            </dl>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 text-xs uppercase text-gray-500">
                  <tr><th className="py-2 w-10">Sr</th><th className="py-2">Account name</th><th className="py-2 text-right">Credit</th><th className="py-2 text-right">Debit</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <tr><td className="py-2.5 text-gray-400">1</td><td className="py-2.5">Sales account</td><td className="py-2.5 text-right">{money(totalSales)}</td><td /></tr>
                  {debitLines.map((l, i) => (
                    <tr key={l.name}><td className="py-2.5 text-gray-400">{i + 2}</td><td className="py-2.5">{l.name}</td><td /><td className="py-2.5 text-right">{money(l.amount)}</td></tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200 font-bold text-[#071A2F]">
                  <tr><td /><td className="pt-3" /><td className="pt-3 text-right">{money(totalSales)}</td><td className="pt-3 text-right">{money(debitLines.reduce((s, l) => s + l.amount, 0))}</td></tr>
                </tfoot>
              </table>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Opening float {money(day.openingFloat)}
              {day.openDenominations ? " (counted by notes and coins)" : ""}. It is added to the cash you should have below.
            </p>
          </section>

          <CashUpForm
            expected={current.expected}
            paystack={current.paystack ?? 0}
            openTabs={current.openTabs ?? 0}
            onCancel={() => reload()}
            onNeedsRefresh={reload}
            onClosed={(r) => setClosed(r)}
          />
        </>
      )}

      {/* Previous postings */}
      {canHistory && !closed && (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-3 font-semibold text-[#071A2F]">Previous finance postings</h2>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing posted yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 text-xs uppercase text-gray-500">
                  <tr><th className="py-2">Voucher</th><th className="py-2">Opened</th><th className="py-2">Closed by</th><th className="py-2 text-right">Expected</th><th className="py-2 text-right">Counted</th><th className="py-2 text-right">Result</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.map((d) => (
                    <tr key={d.id} onClick={() => setDetailId(d.id)} className="cursor-pointer hover:bg-gray-50">
                      <td className="py-2.5 font-medium text-[#071A2F]">{voucherNo(d.number)}</td>
                      <td className="py-2.5">{dateTime(d.openedAt)}</td>
                      <td className="py-2.5 text-gray-600">{d.status === "OPEN" ? <span className="text-green-700">open now</span> : d.closedBy}</td>
                      <td className="py-2.5 text-right">{d.totalExpected === null ? "—" : money(d.totalExpected)}</td>
                      <td className="py-2.5 text-right">{d.totalCounted === null ? "—" : money(d.totalCounted)}</td>
                      <td className="py-2.5 text-right">
                        {d.totalVariance === null ? "—" : (
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${varianceTone(d.totalVariance)}`}>{varianceLabel(d.totalVariance)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {detailId && <DayDetailModal dayId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 px-3 py-2">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="font-semibold text-[#071A2F]">{value}</dd>
    </div>
  );
}
