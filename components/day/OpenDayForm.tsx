"use client";

import { useState } from "react";
import { Sunrise } from "lucide-react";
import { openDay } from "@/lib/api/days";
import { money } from "./format";

export function OpenDayForm({
  suggestedFloat,
  lastClosedNote,
  onOpened,
}: {
  suggestedFloat: number;
  lastClosedNote?: string;
  onOpened: () => void;
}) {
  const [float, setFloat] = useState(String(suggestedFloat || ""));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await openDay({ openingFloat: Number(float || 0), notes: notes.trim() || undefined });
      onOpened();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the day");
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF6B00]";

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-orange-50 p-2.5 text-[#FF6B00]">
          <Sunrise size={22} />
        </span>
        <div>
          <h2 className="font-semibold text-[#071A2F]">Open the business day</h2>
          <p className="text-sm text-gray-500">Count the cash already in the drawer and enter it as the opening float.</p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {lastClosedNote && <p className="text-xs text-gray-500">{lastClosedNote}</p>}

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Opening cash float (GH₵)</label>
        <input
          className={input}
          type="number"
          min="0"
          step="0.01"
          value={float}
          onChange={(e) => setFloat(e.target.value)}
          placeholder="0.00"
        />
        {suggestedFloat > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            Suggested from yesterday&apos;s closing count: {money(suggestedFloat)}
          </p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Note (optional)</label>
        <input className={input} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
      </div>
      <button
        disabled={busy}
        className="w-full rounded-lg bg-[#FF6B00] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Opening…" : "Open day"}
      </button>
    </form>
  );
}
