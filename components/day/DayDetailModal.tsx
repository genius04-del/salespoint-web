"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X, PieChart } from "lucide-react";
import { getDay } from "@/lib/api/days";
import { METHOD_LABELS } from "@/lib/dayTypes";
import type { DayDetailResponse } from "@/lib/dayTypes";
import { dateTime, money, varianceLabel, varianceTone } from "./format";

export function DayDetailModal({ dayId, onClose }: { dayId: string; onClose: () => void }) {
  const [data, setData] = useState<DayDetailResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getDay(dayId);
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load day");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dayId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 print:bg-white">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 print:hidden">
          <h2 className="font-semibold text-[#071A2F]">{data ? `Finance posting FP-${String(data.day.number).padStart(4, "0")}` : "Finance posting"}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-5 px-5 py-5">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {!data && !error && <p className="text-sm text-gray-500">Loading…</p>}
          {data && (
            <>
              <div className="text-sm text-gray-600">
                <p>
                  Opened {dateTime(data.day.openedAt)} by {data.day.openedBy} with float {money(data.day.openingFloat)}
                </p>
                {data.day.closedAt && (
                  <p>
                    Closed {dateTime(data.day.closedAt)} by {data.day.closedBy}
                  </p>
                )}
                <p>
                  {data.orders} sale{data.orders === 1 ? "" : "s"} · Paystack {money(data.paystack)}
                </p>
              </div>

              {data.counts.length > 0 ? (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-100 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="py-2">Method</th>
                      <th className="py-2 text-right">Expected</th>
                      <th className="py-2 text-right">Counted</th>
                      <th className="py-2 text-right">Difference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.counts.map((c) => (
                      <tr key={c.method}>
                        <td className="py-2.5">{METHOD_LABELS[c.method]}</td>
                        <td className="py-2.5 text-right">{money(c.expected)}</td>
                        <td className="py-2.5 text-right">{money(c.counted)}</td>
                        <td className="py-2.5 text-right">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${varianceTone(c.variance)}`}>
                            {varianceLabel(c.variance)}
                          </span>
                          {c.posted && <p className="mt-0.5 text-[11px] text-gray-400">posted to books</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-amber-700">This day has not been closed yet.</p>
              )}

              {data.day.closeDenominations && (
                <p className="text-sm text-gray-600">
                  Cash counted:{" "}
                  {Object.entries(data.day.closeDenominations)
                    .sort((a, b) => Number(b[0]) - Number(a[0]))
                    .map(([face, n]) => `${n} × ${Number(face) >= 1 ? `GH₵${face}` : `${Math.round(Number(face) * 100)}p`}`)
                    .join(", ")}
                </p>
              )}

              {data.day.closeNotes && (
                <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">Note: {data.day.closeNotes}</p>
              )}

              {data.byCashier.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-gray-500">By cashier</p>
                  <ul className="divide-y divide-gray-100 text-sm">
                    {data.byCashier.map((c) => {
                      const total = Object.values(c.totals).reduce((s, v) => s + v, 0);
                      return (
                        <li key={c.cashierId} className="flex justify-between py-2">
                          <span>
                            {c.name} <span className="text-gray-400">· {c.orders} sale{c.orders === 1 ? "" : "s"}</span>
                          </span>
                          <span className="font-medium">{money(total)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 print:hidden">
                <Link
                  href={`/dashboard/sales-mix?dayId=${data.day.id}`}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-[#071A2F] hover:bg-gray-50"
                >
                  <PieChart size={16} /> See what sold this day
                </Link>
                <button onClick={() => window.print()} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-[#071A2F] hover:bg-gray-50">
                  Print
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
