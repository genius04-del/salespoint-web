"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { getCurrentShift, openShift } from "@/lib/api/shifts";
import type { CurrentShiftResponse } from "@/lib/shiftTypes";
import { PinInput } from "@/components/shift/PinInput";
import { inputClass, primaryBtn } from "@/components/kitchen/Modal";
import { cedi, errMsg, num, when } from "@/components/kitchen/format";

/**
 * Wraps a selling screen (POS, Tables). When the Owner has switched on
 * "Cashiers must open a shift before selling" and this person has no open
 * shift, the screen stays locked behind a PIN pad. The cashier counts the
 * drawer and types their PIN to unlock it; with no PIN, a manager has to open
 * the shift for them. When the setting is off, or a shift is open, the
 * wrapped screen shows as normal.
 */
export function ShiftGate({ children }: { children: React.ReactNode }) {
  const [cur, setCur] = useState<CurrentShiftResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [pin, setPin] = useState("");
  const [float, setFloat] = useState("");
  const [takeOver, setTakeOver] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await getCurrentShift();
        if (!cancelled) {
          setCur(c);
          setFailed(false);
        }
      } catch {
        // If the check itself fails (offline, no shift permission), don't
        // lock people out of selling here; the server enforces the rule anyway.
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (failed) return <>{children}</>;
  if (!cur) return <p className="p-6 text-gray-500">Loading…</p>;
  if (!cur.requireShift || cur.shift) return <>{children}</>;

  const needsPin = cur.pin.required;
  const picked = cur.handovers.find((h) => h.id === takeOver) ?? null;

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const f = num(float);
    if (!(f >= 0)) return setError("Count the cash in the drawer and enter it (zero if empty).");
    if (needsPin && pin.length < 4) return setError("Enter your PIN.");
    setBusy(true);
    try {
      await openShift({ openingFloat: f, pin: needsPin ? pin : undefined, takeOverFromShiftId: takeOver || undefined });
      setPin("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setPin("");
      setError(errMsg(err, "Could not open your shift"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-6">
      <form onSubmit={unlock} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="text-center">
          <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF6B00]/10 text-[#FF6B00]"><Lock size={22} /></span>
          <h1 className="text-xl font-bold text-[#071A2F]">Till is locked</h1>
          <p className="text-sm text-gray-500">{needsPin ? "Enter your PIN to open your shift." : "Open your shift to start selling."}</p>
        </div>

        {cur.handovers.length > 0 && (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Taking over from</span>
            <select className={inputClass} value={takeOver} onChange={(e) => setTakeOver(e.target.value)}>
              <option value="">Starting fresh</option>
              {cur.handovers.map((h) => (
                <option key={h.id} value={h.id}>{h.userName ?? "A colleague"}, closed {when(h.closedAt)}</option>
              ))}
            </select>
          </label>
        )}
        {picked && <p className="rounded-lg bg-blue-50 p-2 text-sm text-blue-800">They left {cedi(picked.countedCash)}. Count it and enter what you find.</p>}

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">Cash in the drawer now (GH₵)</span>
          <input className={inputClass} inputMode="decimal" value={float} onChange={(e) => setFloat(e.target.value)} placeholder="0.00" />
        </label>

        {needsPin && (
          cur.pin.set ? (
            <PinInput value={pin} onChange={(v) => { setPin(v); setError(""); }} disabled={busy} />
          ) : (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">You don&apos;t have a PIN yet. Ask a manager to set one, or to open your shift for you.</p>
          )
        )}

        {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700" role="alert">{error}</p>}

        {(!needsPin || cur.pin.set) && (
          <button disabled={busy || (needsPin && pin.length < 4)} className={`${primaryBtn} w-full`}>{busy ? "Opening…" : "Unlock and open shift"}</button>
        )}
        <p className="text-center text-xs text-gray-500">
          Forgot your PIN? A manager can open your shift for you. <Link href="/dashboard/shift" className="font-semibold text-[#FF6B00]">My Shift page</Link>
        </p>
      </form>
    </div>
  );
}
