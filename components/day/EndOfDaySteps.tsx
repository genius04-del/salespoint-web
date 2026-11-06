"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { closeDay } from "@/lib/api/days";
import type { CurrentDayResponse } from "@/lib/dayTypes";

// What is left after the finance posting: the stock steps, then closing the day.
export function EndOfDaySteps({ current, onClosed }: { current: CurrentDayResponse; onClosed: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const day = current.day!;
  const steps = current.stockSteps ?? null;
  const dayEnd = !!steps?.dayEnd;
  const made = !steps || steps.sales === 0; // every sale is inside a deduction
  const applied = made && (steps?.pendingNumber ?? null) === null;
  const openTabs = current.openTabs ?? 0;

  const rows: { done: boolean; title: string; text: string; href?: string }[] = [
    { done: day.posted, title: "Finance posting", text: day.posted ? `Saved by ${day.postedBy}. The cashiers can go.` : "Count the money. Cashiers can leave once this is saved.", href: day.posted ? undefined : "/dashboard/finance-posting" },
  ];
  if (dayEnd) {
    rows.push(
      { done: made, title: "Deduct sales from stock", text: made ? "Done." : `${steps!.sales} sale${steps!.sales === 1 ? "" : "s"} still to deduct.`, href: made ? undefined : "/dashboard/stock-deduction" },
      { done: applied, title: "Stock adjustment", text: applied ? "Saved to stock." : steps!.pendingNumber !== null ? `Upload SD-${String(steps!.pendingNumber).padStart(4, "0")}.` : "Upload the deduction file.", href: applied ? undefined : "/dashboard/stock-adjustment" }
    );
  }
  if (steps) {
    rows.push({ done: steps.counted, title: "Daily stock", text: steps.counted ? "Counted." : "Count the stock.", href: steps.counted ? undefined : "/dashboard/stock-count" });
  }

  const ready = day.posted && applied && openTabs === 0 && (!dayEnd || applied);

  async function close() {
    if (steps && !steps.counted && !window.confirm("Daily stock has not been counted today. Close the day anyway?")) return;
    setBusy(true);
    setError("");
    try {
      await closeDay();
      onClosed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not close the day");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div>
        <h2 className="font-semibold text-[#071A2F]">End of day</h2>
        <p className="text-sm text-gray-500">Do these in order. Close the day last.</p>
      </div>
      <ol className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.title} className="flex items-start gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
            {r.done ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-600" /> : <Circle size={20} className="mt-0.5 shrink-0 text-gray-300" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#071A2F]">{i + 1}. {r.title}</p>
              <p className="text-xs text-gray-500">{r.text}</p>
            </div>
            {r.href && <Link href={r.href} className="shrink-0 rounded-lg bg-[#071A2F] px-3 py-1.5 text-xs font-semibold text-white">Open</Link>}
          </li>
        ))}
      </ol>
      {openTabs > 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{openTabs} table tab{openTabs === 1 ? " is" : "s are"} still open. Pay or cancel {openTabs === 1 ? "it" : "them"} before closing.</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button onClick={close} disabled={!ready || busy} className="w-full rounded-xl bg-[#FF6B00] px-5 py-3 text-base font-semibold text-white disabled:opacity-40 sm:w-auto">
        {busy ? "Closing…" : "Close the day"}
      </button>
    </section>
  );
}
