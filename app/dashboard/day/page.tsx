"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Lock, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getCurrentDay, listDays, setRequireOpenDay } from "@/lib/api/days";
import { METHOD_LABELS } from "@/lib/dayTypes";
import type { BusinessDayInfo, CloseDayResponse, CurrentDayResponse, MethodTotals } from "@/lib/dayTypes";
import { OpenDayForm } from "@/components/day/OpenDayForm";
import { CashUpForm, ClosedSummary } from "@/components/day/CashUpForm";
import { DayDetailModal } from "@/components/day/DayDetailModal";
import { dateTime, money, varianceLabel, varianceTone } from "@/components/day/format";

const METHOD_ORDER = ["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "OTHER", "PAYSTACK"] as const;

function sumTotals(t: MethodTotals) {
  return METHOD_ORDER.reduce((s, m) => s + t[m], 0);
}

export default function DayEndPage() {
  const { user, hasPermission } = useAuth();
  const canOpen = hasPermission("day.open");
  const canClose = hasPermission("day.close");
  const canHistory = canClose || hasPermission("finance.view");
  const isOwner = user?.role === "OWNER";

  const [current, setCurrent] = useState<CurrentDayResponse | null>(null);
  const [history, setHistory] = useState<BusinessDayInfo[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [cashUp, setCashUp] = useState(false);
  const [closed, setClosed] = useState<CloseDayResponse | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [savingSetting, setSavingSetting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const cur = await getCurrentDay();
        if (!cancelled) {
          setCurrent(cur);
          setError("");
        }
        if (canHistory) {
          const { days } = await listDays();
          if (!cancelled) setHistory(days);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load the business day");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, canHistory]);

  const reload = () => setReloadKey((k) => k + 1);

  async function toggleRequire() {
    if (!current) return;
    setSavingSetting(true);
    setError("");
    try {
      const res = await setRequireOpenDay(!current.requireOpenDay);
      setCurrent({ ...current, requireOpenDay: res.requireOpenDay });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save setting");
    } finally {
      setSavingSetting(false);
    }
  }

  const day = current?.day ?? null;
  // Measured against the server's own clock (asOf) so render stays pure.
  const hoursOpen =
    day && current?.asOf ? (new Date(current.asOf).getTime() - new Date(day.openedAt).getTime()) / 3_600_000 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#071A2F]">Day End</h1>
          <p className="text-sm text-gray-500">Open the day, count the money, and close with the books matching.</p>
        </div>
        <button
          onClick={reload}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#071A2F] hover:bg-gray-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && !current && <p className="text-gray-500">Loading…</p>}

      {closed && (
        <ClosedSummary
          result={closed}
          onDone={() => {
            setClosed(null);
            setCashUp(false);
            reload();
          }}
        />
      )}

      {/* ---- No day open ---- */}
      {!closed && current && !day && (
        <>
          <div className="flex items-center gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <span className="rounded-xl bg-gray-100 p-2.5 text-gray-500">
              <Lock size={20} />
            </span>
            <div>
              <p className="font-semibold text-[#071A2F]">The business day is closed</p>
              <p className="text-sm text-gray-500">
                {current.requireOpenDay
                  ? "Sales are blocked until the day is opened."
                  : "You can still sell, but opening the day lets you cash up at the end."}
              </p>
            </div>
          </div>
          {canOpen ? (
            <OpenDayForm
              suggestedFloat={current.suggestedFloat ?? 0}
              lastClosedNote={
                current.lastClosed?.closedAt
                  ? `Last closed ${dateTime(current.lastClosed.closedAt)}${
                      current.lastClosed.totalVariance
                        ? ` (${varianceLabel(current.lastClosed.totalVariance)})`
                        : ""
                    }`
                  : undefined
              }
              onOpened={reload}
            />
          ) : (
            <p className="text-sm text-gray-500">Ask a manager or cashier with permission to open the day.</p>
          )}
        </>
      )}

      {/* ---- Day open ---- */}
      {!closed && current && day && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#071A2F] p-5 text-white">
            <div>
              <p className="flex items-center gap-2 text-sm text-white/70">
                <span className="h-2 w-2 rounded-full bg-green-400" /> Day open
              </p>
              <p className="text-lg font-semibold">
                Since {dateTime(day.openedAt)} · opened by {day.openedBy}
              </p>
              <p className="text-sm text-white/70">Opening float {money(day.openingFloat)}</p>
            </div>
            {hoursOpen > 24 && (
              <p className="flex items-center gap-2 rounded-lg bg-amber-500/20 px-3 py-2 text-sm text-amber-200">
                <Clock size={14} /> Open for over 24 hours. Remember to close it.
              </p>
            )}
          </div>

          {/* Everyone sees their own sales. */}
          {current.mine && (
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <h2 className="mb-3 font-semibold text-[#071A2F]">
                My sales this day <span className="text-sm font-normal text-gray-400">· {current.mine.orders} sale{current.mine.orders === 1 ? "" : "s"}</span>
              </h2>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {METHOD_ORDER.map((m) => (
                  <div key={m} className="rounded-xl bg-gray-50 p-3">
                    <dt className="text-xs text-gray-500">{METHOD_LABELS[m]}</dt>
                    <dd className="font-semibold text-[#071A2F]">{money(current.mine!.totals[m])}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-right text-sm font-bold text-[#071A2F]">
                Total {money(sumTotals(current.mine.totals))}
              </p>
              {!canClose && (
                <p className="mt-2 text-xs text-gray-500">
                  Hand your cash and Mobile Money to the manager at the end of your shift. They will count and close the day.
                </p>
              )}
            </section>
          )}

          {/* Managers: whole-shop expected figures + cash-up. */}
          {canClose && current.expected && !cashUp && (
            <>
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                <h2 className="mb-3 font-semibold text-[#071A2F]">
                  What the system expects <span className="text-sm font-normal text-gray-400">· {current.orders} sale{current.orders === 1 ? "" : "s"}</span>
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-100 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="py-2">Method</th>
                        <th className="py-2 text-right">Float</th>
                        <th className="py-2 text-right">Sales</th>
                        <th className="py-2 text-right">Paid out</th>
                        <th className="py-2 text-right">Should have</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {current.expected.map((r) => (
                        <tr key={r.method}>
                          <td className="py-2.5">{METHOD_LABELS[r.method]}</td>
                          <td className="py-2.5 text-right text-gray-500">{r.openingFloat ? money(r.openingFloat) : "—"}</td>
                          <td className="py-2.5 text-right">{money(r.sales)}</td>
                          <td className="py-2.5 text-right text-gray-500">{r.paidOut ? money(r.paidOut) : "—"}</td>
                          <td className="py-2.5 text-right font-semibold text-[#071A2F]">{money(r.expected)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td className="py-2.5">Paystack</td>
                        <td />
                        <td className="py-2.5 text-right">{money(current.paystack ?? 0)}</td>
                        <td />
                        <td className="py-2.5 text-right text-xs text-gray-400">verified by Paystack</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {current.byCashier && current.byCashier.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold uppercase text-gray-500">By cashier</p>
                    <ul className="divide-y divide-gray-100 text-sm">
                      {current.byCashier.map((c) => (
                        <li key={c.cashierId} className="py-2">
                          <div className="flex justify-between">
                            <span className="font-medium text-[#071A2F]">
                              {c.name} <span className="font-normal text-gray-400">· {c.orders} sale{c.orders === 1 ? "" : "s"}</span>
                            </span>
                            <span className="font-semibold">{money(sumTotals(c.totals))}</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Cash {money(c.totals.CASH)} · MoMo {money(c.totals.MOBILE_MONEY)} · Bank {money(c.totals.BANK_TRANSFER)}
                            {c.totals.OTHER ? ` · Other ${money(c.totals.OTHER)}` : ""}
                            {c.totals.PAYSTACK ? ` · Paystack ${money(c.totals.PAYSTACK)}` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(current.openTabs ?? 0) > 0 && (
                  <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                    {current.openTabs} table tab{current.openTabs === 1 ? " is" : "s are"} still open. They must be paid or cancelled before closing.
                  </p>
                )}
              </section>

              <button
                onClick={() => setCashUp(true)}
                className="w-full rounded-xl bg-[#FF6B00] px-5 py-3 text-base font-semibold text-white sm:w-auto"
              >
                Count the money and close the day
              </button>
            </>
          )}

          {canClose && current.expected && cashUp && (
            <CashUpForm
              expected={current.expected}
              paystack={current.paystack ?? 0}
              openTabs={current.openTabs ?? 0}
              onCancel={() => setCashUp(false)}
              onNeedsRefresh={reload}
              onClosed={(r) => setClosed(r)}
            />
          )}
        </>
      )}

      {/* ---- Owner setting ---- */}
      {isOwner && current && !closed && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div>
            <p className="font-semibold text-[#071A2F]">Require an open day before selling</p>
            <p className="text-sm text-gray-500">
              When on, the POS and table orders refuse sales until someone opens the day. Off by default.
            </p>
          </div>
          <button
            onClick={toggleRequire}
            disabled={savingSetting}
            className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
              current.requireOpenDay ? "bg-green-600 text-white" : "border border-gray-200 text-[#071A2F]"
            }`}
          >
            {current.requireOpenDay ? "On. Click to turn off" : "Off. Click to turn on"}
          </button>
        </section>
      )}

      {/* ---- History ---- */}
      {canHistory && !closed && (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-3 font-semibold text-[#071A2F]">Past days</h2>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">No days recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-2">Opened</th>
                    <th className="py-2">Closed by</th>
                    <th className="py-2 text-right">Expected</th>
                    <th className="py-2 text-right">Counted</th>
                    <th className="py-2 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.map((d) => (
                    <tr key={d.id} onClick={() => setDetailId(d.id)} className="cursor-pointer hover:bg-gray-50">
                      <td className="py-2.5">{dateTime(d.openedAt)}</td>
                      <td className="py-2.5 text-gray-600">{d.status === "OPEN" ? <span className="text-green-700">open now</span> : d.closedBy}</td>
                      <td className="py-2.5 text-right">{d.totalExpected === null ? "—" : money(d.totalExpected)}</td>
                      <td className="py-2.5 text-right">{d.totalCounted === null ? "—" : money(d.totalCounted)}</td>
                      <td className="py-2.5 text-right">
                        {d.totalVariance === null ? (
                          "—"
                        ) : (
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${varianceTone(d.totalVariance)}`}>
                            {varianceLabel(d.totalVariance)}
                          </span>
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
