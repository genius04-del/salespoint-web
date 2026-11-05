"use client";

import { useMemo, useState } from "react";
import { Printer, CheckCircle2, TriangleAlert } from "lucide-react";
import { ApiError } from "@/lib/apiClient";
import { closeDay } from "@/lib/api/days";
import { METHOD_LABELS } from "@/lib/dayTypes";
import type { CloseDayResponse, CountedMethod, ExpectedRow } from "@/lib/dayTypes";
import { DenominationCounter, denomAny, denomTotal, toDenominations, type DenomEntry } from "./DenominationCounter";
import { money, signedMoney, varianceLabel, varianceTone } from "./format";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function CashUpForm({
  expected,
  paystack,
  openTabs,
  onCancel,
  onNeedsRefresh,
  onClosed,
}: {
  expected: ExpectedRow[];
  paystack: number;
  openTabs: number;
  onCancel: () => void;
  onNeedsRefresh: () => void; // figures moved while counting
  onClosed: (result: CloseDayResponse) => void;
}) {
  const [typed, setCounted] = useState<Record<string, string>>({});
  const [denoms, setDenoms] = useState<DenomEntry>({});
  const [counting, setCounting] = useState(false);
  const cashByNotes = counting && denomAny(denoms);
  // Cash comes from the notes and coins when they are being counted.
  const counted = useMemo<Record<string, string>>(
    () => (cashByNotes ? { ...typed, CASH: String(denomTotal(denoms)) } : typed),
    [cashByNotes, typed, denoms]
  );
  const [notes, setNotes] = useState("");
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const lines = useMemo(
    () =>
      expected.map((e) => {
        const raw = counted[e.method];
        const entered = raw !== undefined && raw !== "";
        const value = entered ? Number(raw) : null;
        const variance = value === null ? null : round2(value - e.expected);
        return { ...e, entered, value, variance };
      }),
    [expected, counted]
  );

  const missing = lines.filter((l) => !l.entered && Math.abs(l.expected) >= 0.005);
  const differences = lines.filter((l) => l.variance !== null && Math.abs(l.variance) >= 0.005);
  const hasDifference = differences.length > 0;
  const totalExpected = round2(lines.reduce((s, l) => s + l.expected, 0));
  const totalCounted = round2(lines.reduce((s, l) => s + (l.value ?? 0), 0));

  const canSubmit =
    !busy &&
    openTabs === 0 &&
    missing.length === 0 &&
    (!hasDifference || (accept && notes.trim().length > 0));

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const result = await closeDay({
        counts: lines
          .filter((l) => l.entered)
          .map((l) => ({ method: l.method as CountedMethod, counted: l.value as number })),
        notes: notes.trim() || undefined,
        acceptVariance: hasDifference && accept,
        denominations: cashByNotes ? toDenominations(denoms) : undefined,
      });
      onClosed(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not close the day";
      setError(message);
      // 409 = the system's figures changed while you were counting (e.g. a sale
      // came in). Reload them so the comparison is against the real numbers.
      if (e instanceof ApiError && e.status === 409) onNeedsRefresh();
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-32 rounded-lg border border-gray-200 px-3 py-2 text-right text-sm outline-none focus:border-[#FF6B00]";

  return (
    <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <div>
        <h2 className="font-semibold text-[#071A2F]">Cash-up: count and compare</h2>
        <p className="text-sm text-gray-500">
          Count what is physically there for each method and type it in. The system compares it with what it expects.
        </p>
      </div>

      {openTabs > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          {openTabs} table tab{openTabs === 1 ? " is" : "s are"} still open. Pay or cancel {openTabs === 1 ? "it" : "them"} first.
        </div>
      )}
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2 pr-3">Method</th>
              <th className="py-2 pr-3 text-right">System expects</th>
              <th className="py-2 pr-3 text-right">You counted</th>
              <th className="py-2 text-right">Difference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {lines.map((l) => (
              <tr key={l.method}>
                <td className="py-3 pr-3">
                  <p className="font-medium text-[#071A2F]">{METHOD_LABELS[l.method]}</p>
                  {l.method === "CASH" && (
                    <p className="text-xs text-gray-400">
                      float {money(l.openingFloat)} + sales {money(l.sales)} − paid out {money(l.paidOut)}
                    </p>
                  )}
                  {l.method === "CASH" && (
                    <button type="button" onClick={() => setCounting((c) => !c)} className="mt-1 text-xs font-medium text-[#FF6B00] hover:underline">
                      {counting ? "Hide the notes and coins" : "Count notes and coins"}
                    </button>
                  )}
                  {l.method !== "CASH" && (l.sales > 0 || l.paidOut > 0) && (
                    <p className="text-xs text-gray-400">
                      sales {money(l.sales)}
                      {l.paidOut > 0 ? ` − paid out ${money(l.paidOut)}` : ""}
                    </p>
                  )}
                </td>
                <td className="py-3 pr-3 text-right font-medium">{money(l.expected)}</td>
                <td className="py-3 pr-3 text-right">
                  <input
                    className={input}
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={counted[l.method] ?? ""}
                    readOnly={l.method === "CASH" && cashByNotes}
                    onChange={(e) => setCounted((c) => ({ ...c, [l.method]: e.target.value }))}
                    placeholder="0.00"
                    aria-label={`${METHOD_LABELS[l.method]} counted`}
                  />
                </td>
                <td className="py-3 text-right">
                  {l.variance === null ? (
                    <span className="text-xs text-gray-400">—</span>
                  ) : (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${varianceTone(l.variance)}`}>
                      {varianceLabel(l.variance)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {counting && (
              <tr><td colSpan={4} className="pb-3"><DenominationCounter value={denoms} onChange={setDenoms} /></td></tr>
            )}
            <tr>
              <td className="py-3 pr-3">
                <p className="font-medium text-[#071A2F]">{METHOD_LABELS.PAYSTACK}</p>
                <p className="text-xs text-gray-400">Verified by Paystack. Nothing to count.</p>
              </td>
              <td className="py-3 pr-3 text-right font-medium">{money(paystack)}</td>
              <td className="py-3 pr-3 text-right text-xs text-gray-400">auto</td>
              <td />
            </tr>
          </tbody>
          <tfoot className="border-t border-gray-200 text-sm font-bold text-[#071A2F]">
            <tr>
              <td className="pt-3">Counted methods total</td>
              <td className="pt-3 text-right">{money(totalExpected)}</td>
              <td className="pt-3 text-right">{money(totalCounted)}</td>
              <td className="pt-3 text-right">{signedMoney(round2(totalCounted - totalExpected))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {hasDifference && (
        <div className="space-y-3 rounded-xl bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
            <TriangleAlert size={16} /> The count does not match.
          </p>
          <p className="text-xs text-amber-800">
            If you close anyway, each difference is posted to the books as <b>Cash Over/Short</b> so the ledger matches
            what is really there. Please give a reason.
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Why is it different? (e.g. change given wrongly, supplier paid from till)"
            className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FF6B00]"
          />
          <label className="flex items-start gap-2 text-sm text-amber-900">
            <input
              type="checkbox"
              checked={accept}
              onChange={(e) => setAccept(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#FF6B00]"
            />
            I have recounted and accept these differences.
          </label>
        </div>
      )}

      {!hasDifference && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Closing note (optional)"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF6B00]"
        />
      )}

      <div className="flex gap-3">
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="flex-1 rounded-lg bg-[#071A2F] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy ? "Closing…" : hasDifference ? "Close day with differences" : "Close day"}
        </button>
        <button onClick={onCancel} disabled={busy} className="rounded-lg px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100">
          Back
        </button>
      </div>
      {missing.length > 0 && (
        <p className="text-xs text-gray-500">
          Enter a count for {missing.map((m) => METHOD_LABELS[m.method]).join(", ")} (type 0 if there is none).
        </p>
      )}
    </div>
  );
}

export function ClosedSummary({ result, onDone }: { result: CloseDayResponse; onDone: () => void }) {
  return (
    <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 print:shadow-none">
      <div className="flex items-center gap-3">
        <span className={`rounded-full p-2 ${result.balanced ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>
          {result.balanced ? <CheckCircle2 size={24} /> : <TriangleAlert size={24} />}
        </span>
        <div>
          <h2 className="font-semibold text-[#071A2F]">
            {result.balanced ? "Day closed. Everything balanced." : "Day closed with differences."}
          </h2>
          <p className="text-sm text-gray-500">
            {result.orders} sale{result.orders === 1 ? "" : "s"} · closed by {result.day.closedBy}
          </p>
        </div>
      </div>

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
          {result.rows.map((r) => (
            <tr key={r.method}>
              <td className="py-2.5">{METHOD_LABELS[r.method]}</td>
              <td className="py-2.5 text-right">{money(r.expected)}</td>
              <td className="py-2.5 text-right">{money(r.counted)}</td>
              <td className="py-2.5 text-right">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${varianceTone(r.variance)}`}>
                  {varianceLabel(r.variance)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.day.closeNotes && <p className="text-sm text-gray-600">Note: {result.day.closeNotes}</p>}

      <div className="flex gap-3 print:hidden">
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-[#071A2F] hover:bg-gray-50">
          <Printer size={16} /> Print
        </button>
        <button onClick={onDone} className="rounded-lg bg-[#FF6B00] px-4 py-2 text-sm font-semibold text-white">
          Done
        </button>
      </div>
    </div>
  );
}
