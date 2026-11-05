"use client";

import { money } from "./format";
import type { Denominations } from "@/lib/dayTypes";

// Ghana cedi notes and coins. The key is the face value.
export const NOTES = ["200", "100", "50", "20", "10", "5", "2"] as const;
export const COINS = ["1", "0.5", "0.2", "0.1", "0.05", "0.01"] as const;
const label = (v: string) => (Number(v) >= 1 ? `GH₵ ${v}` : `${Math.round(Number(v) * 100)}p`);

export type DenomEntry = Record<string, string>; // what is typed, per face value

export const denomTotal = (e: DenomEntry) =>
  Math.round(Object.entries(e).reduce((s, [v, n]) => s + Number(v) * (Number(n) || 0), 0) * 100) / 100;

export const denomAny = (e: DenomEntry) => Object.values(e).some((n) => Number(n) > 0);

export const toDenominations = (e: DenomEntry): Denominations | undefined => {
  const out: Denominations = {};
  for (const [v, n] of Object.entries(e)) if (Number(n) > 0) out[v] = Math.floor(Number(n));
  return Object.keys(out).length ? out : undefined;
};

export function DenominationCounter({ value, onChange }: { value: DenomEntry; onChange: (v: DenomEntry) => void }) {
  const set = (face: string, n: string) => onChange({ ...value, [face]: n.replace(/\D/g, "") });
  const group = (title: string, faces: readonly string[]) => (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase text-gray-500">{title}</p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {faces.map((f) => {
          const n = Number(value[f]) || 0;
          return (
            <label key={f} className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 ring-1 ring-gray-200">
              <span className="w-16 text-sm font-medium text-[#071A2F]">{label(f)}</span>
              <span className="text-gray-400">×</span>
              <input
                inputMode="numeric"
                className="w-16 rounded border border-gray-200 px-2 py-1 text-right text-sm outline-none focus:border-[#FF6B00]"
                value={value[f] ?? ""}
                onChange={(e) => set(f, e.target.value)}
                placeholder="0"
                aria-label={`How many ${label(f)}`}
              />
              <span className="ml-auto text-xs text-gray-500">{n ? money(n * Number(f)) : ""}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
  return (
    <div className="space-y-3 rounded-xl bg-gray-50 p-3">
      {group("Notes", NOTES)}
      {group("Coins", COINS)}
      <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-bold text-[#071A2F]">
        <span>Total counted</span>
        <span>{money(denomTotal(value))}</span>
      </div>
    </div>
  );
}
