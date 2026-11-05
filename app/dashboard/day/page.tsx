"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RefreshCw, Lock, Clock, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getCurrentDay, setRequireOpenDay } from "@/lib/api/days";
import { METHOD_LABELS } from "@/lib/dayTypes";
import type { CurrentDayResponse, MethodTotals } from "@/lib/dayTypes";
import { OpenDayForm } from "@/components/day/OpenDayForm";
import { dateTime, money, varianceLabel } from "@/components/day/format";

const METHOD_ORDER = ["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "OTHER", "PAYSTACK"] as const;
const sumTotals = (t: MethodTotals) => METHOD_ORDER.reduce((s, m) => s + t[m], 0);

// Day End is only for opening the day. Counting the money and closing happens
// on the Finance Posting page.
export default function DayEndPage() {
  const { user, hasPermission } = useAuth();
  const canOpen = hasPermission("day.open");
  const canClose = hasPermission("day.close");
  const isOwner = user?.role === "OWNER";

  const [current, setCurrent] = useState<CurrentDayResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
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
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load the business day");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

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
  const hoursOpen =
    day && current?.asOf ? (new Date(current.asOf).getTime() - new Date(day.openedAt).getTime()) / 3_600_000 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#071A2F]">Day End</h1>
          <p className="text-sm text-gray-500">Open the day with a counted float. Closing and counting the money is done in Finance Posting.</p>
        </div>
        <button onClick={reload} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#071A2F] hover:bg-gray-50">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && !current && <p className="text-gray-500">Loading…</p>}

      {current && !day && (
        <>
          <div className="flex items-center gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <span className="rounded-xl bg-gray-100 p-2.5 text-gray-500"><Lock size={20} /></span>
            <div>
              <p className="font-semibold text-[#071A2F]">The business day is closed</p>
              <p className="text-sm text-gray-500">
                {current.requireOpenDay ? "Sales are blocked until the day is opened." : "You can still sell, but opening the day lets you cash up at the end."}
              </p>
            </div>
          </div>
          {canOpen ? (
            <OpenDayForm
              suggestedFloat={current.suggestedFloat ?? 0}
              lastClosedNote={
                current.lastClosed?.closedAt
                  ? `Last closed ${dateTime(current.lastClosed.closedAt)}${current.lastClosed.totalVariance ? ` (${varianceLabel(current.lastClosed.totalVariance)})` : ""}`
                  : undefined
              }
              onOpened={reload}
            />
          ) : (
            <p className="text-sm text-gray-500">Ask a manager or cashier with permission to open the day.</p>
          )}
        </>
      )}

      {current && day && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#071A2F] p-5 text-white">
            <div>
              <p className="flex items-center gap-2 text-sm text-white/70"><span className="h-2 w-2 rounded-full bg-green-400" /> Day open · FP-{String(day.number).padStart(4, "0")}</p>
              <p className="text-lg font-semibold">Since {dateTime(day.openedAt)} · opened by {day.openedBy}</p>
              <p className="text-sm text-white/70">Opening float {money(day.openingFloat)}</p>
            </div>
            {hoursOpen > 24 && (
              <p className="flex items-center gap-2 rounded-lg bg-amber-500/20 px-3 py-2 text-sm text-amber-200"><Clock size={14} /> Open for over 24 hours. Remember to close it.</p>
            )}
          </div>

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
              <p className="mt-3 text-right text-sm font-bold text-[#071A2F]">Total {money(sumTotals(current.mine.totals))}</p>
              {!canClose && <p className="mt-2 text-xs text-gray-500">Hand your cash and Mobile Money to the manager at the end of your shift. They will count and close the day.</p>}
            </section>
          )}

          {canClose && (
            <Link href="/dashboard/finance-posting" className="flex items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 hover:ring-[#FF6B00]/40">
              <div>
                <p className="font-semibold text-[#071A2F]">Ready to close?</p>
                <p className="text-sm text-gray-500">
                  Go to Finance Posting to count the money and close the day.
                  {(current.openTabs ?? 0) > 0 && ` ${current.openTabs} table tab${current.openTabs === 1 ? " is" : "s are"} still open and must be paid or cancelled first.`}
                </p>
              </div>
              <ArrowRight className="shrink-0 text-[#FF6B00]" />
            </Link>
          )}
        </>
      )}

      {isOwner && current && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div>
            <p className="font-semibold text-[#071A2F]">Require an open day before selling</p>
            <p className="text-sm text-gray-500">When on, the POS and table orders refuse sales until someone opens the day. Off by default.</p>
          </div>
          <button onClick={toggleRequire} disabled={savingSetting} className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${current.requireOpenDay ? "bg-green-600 text-white" : "border border-gray-200 text-[#071A2F]"}`}>
            {current.requireOpenDay ? "On. Click to turn off" : "Off. Click to turn on"}
          </button>
        </section>
      )}
    </div>
  );
}
