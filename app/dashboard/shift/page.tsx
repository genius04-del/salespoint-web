"use client";

import { useEffect, useState } from "react";
import { CircleCheck, CircleAlert, Lock, Play, ArrowRightLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { closeShift, getCurrentShift, listOpenableCashiers, listShifts, openShift, openShiftFor, setRequireShift } from "@/lib/api/shifts";
import type { CloseShiftResponse, CurrentShiftResponse, OpenableCashier, ShiftInfo } from "@/lib/shiftTypes";
import { PinInput } from "@/components/shift/PinInput";
import { Field, inputClass, primaryBtn, ghostBtn } from "@/components/kitchen/Modal";
import { cedi, errMsg, num, when } from "@/components/kitchen/format";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash", MOBILE_MONEY: "Mobile money", BANK_TRANSFER: "Bank transfer", OTHER: "Other", PAYSTACK: "Paystack",
};

function Money({ v, signed = false }: { v: number | null; signed?: boolean }) {
  if (v === null) return <span className="text-gray-400">—</span>;
  const cls = signed && v !== 0 ? (v < 0 ? "text-red-600" : "text-green-600") : "";
  return <span className={cls}>{signed && v > 0 ? "+" : ""}{cedi(v)}</span>;
}

export default function ShiftPage() {
  const { user, hasPermission } = useAuth();
  const canUse = hasPermission("shift.use");
  const canSeeAll = hasPermission("shift.view");
  const canOpenFor = hasPermission("shift.open_for");
  const isOwner = user?.role === "OWNER";

  const [cur, setCur] = useState<CurrentShiftResponse | null>(null);
  const [history, setHistory] = useState<ShiftInfo[]>([]);
  const [cashiers, setCashiers] = useState<OpenableCashier[]>([]);
  const [pin, setPin] = useState("");
  const [forId, setForId] = useState("");
  const [forFloat, setForFloat] = useState("");
  const [forTake, setForTake] = useState("");
  const [forMsg, setForMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [float, setFloat] = useState("");
  const [takeOver, setTakeOver] = useState("");
  const [openNotes, setOpenNotes] = useState("");
  const [counted, setCounted] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CloseShiftResponse | null>(null);
  const [opened, setOpened] = useState<ShiftInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await getCurrentShift();
        if (cancelled) return;
        setCur(c);
        if (canSeeAll) {
          const h = await listShifts();
          if (!cancelled) setHistory(h.shifts);
        }
        if (canOpenFor) {
          const o = await listOpenableCashiers();
          if (!cancelled) setCashiers(o.cashiers);
        }
        if (!cancelled) setError("");
      } catch (e) {
        if (!cancelled) setError(errMsg(e, "Could not load your shift"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, canSeeAll, canOpenFor]);

  const reload = () => setReloadKey((k) => k + 1);
  const picked = cur?.handovers.find((h) => h.id === takeOver) ?? null;

  async function doOpen(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const f = num(float);
    if (!(f >= 0)) return setError("Count the cash in the drawer and enter it (zero if empty).");
    if (cur?.pin.required && pin.length < 4) return setError("Enter your PIN to open your shift.");
    setBusy(true);
    try {
      const { shift } = await openShift({ openingFloat: f, pin: cur?.pin.required ? pin : undefined, takeOverFromShiftId: takeOver || undefined, notes: openNotes.trim() || undefined });
      setOpened(shift);
      setPin("");
      setFloat("");
      setTakeOver("");
      setOpenNotes("");
      reload();
    } catch (err) {
      setPin("");
      setError(errMsg(err, "Could not open the shift"));
    } finally {
      setBusy(false);
    }
  }

  async function doClose(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const c = num(counted);
    if (!(c >= 0)) return setError("Count the cash in the drawer and enter it (zero if empty).");
    setBusy(true);
    try {
      const res = await closeShift({ countedCash: c, notes: closeNotes.trim() || undefined });
      setResult(res);
      setCounted("");
      setCloseNotes("");
      reload();
    } catch (err) {
      setError(errMsg(err, "Could not close the shift"));
    } finally {
      setBusy(false);
    }
  }

  async function doOpenFor(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setForMsg("");
    const f = num(forFloat);
    if (!forId) return setError("Choose the cashier.");
    if (!(f >= 0)) return setError("Count the drawer and enter the cash (zero if empty).");
    setBusy(true);
    try {
      const { shift } = await openShiftFor({ userId: forId, openingFloat: f, takeOverFromShiftId: forTake || undefined });
      setForMsg(`Shift opened for ${shift.userName ?? "the cashier"}.`);
      setForId("");
      setForFloat("");
      setForTake("");
      reload();
    } catch (err) {
      setError(errMsg(err, "Could not open the shift"));
    } finally {
      setBusy(false);
    }
  }

  async function toggleRequire() {
    if (!cur) return;
    setError("");
    try {
      const r = await setRequireShift(!cur.requireShift);
      setCur({ ...cur, requireShift: r.requireShift });
    } catch (err) {
      setError(errMsg(err, "Could not save the setting"));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#071A2F]">My Shift</h1>
        <p className="text-sm text-gray-500">Count in when you start, count out when you finish, and hand the drawer to the next person.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700"><CircleAlert size={16} className="mt-0.5 shrink-0" /> {error}</div>
      )}
      {loading && !cur && <p className="text-gray-500">Loading…</p>}

      {/* ---- just closed: the handover slip ---- */}
      {result && (
        <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-2">
            <CircleCheck className="text-green-600" size={22} />
            <h2 className="text-lg font-bold text-[#071A2F]">Shift closed. Hand over the drawer.</h2>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div><dt className="text-gray-500">Sales</dt><dd className="font-semibold text-[#071A2F]">{result.shift.salesCount} · {cedi(result.shift.salesTotal)}</dd></div>
            <div><dt className="text-gray-500">Expected cash</dt><dd className="font-semibold text-[#071A2F]"><Money v={result.shift.expectedCash} /></dd></div>
            <div><dt className="text-gray-500">You counted</dt><dd className="font-semibold text-[#071A2F]"><Money v={result.shift.countedCash} /></dd></div>
            <div>
              <dt className="text-gray-500">Difference</dt>
              <dd className="font-semibold">{result.kind === "BALANCED" ? <span className="text-green-600">Balanced</span> : <Money v={result.shift.variance} signed />}</dd>
            </div>
          </dl>
          <p className="text-sm text-gray-500">The next cashier will see GH₵ {Number(result.shift.countedCash ?? 0).toLocaleString("en-GH")} waiting to be taken over.</p>
          <div className="flex flex-wrap gap-2">
            <a href="/till" className={`${primaryBtn} inline-flex items-center gap-1`}><ArrowRightLeft size={14} /> Switch cashier</a>
            <button onClick={() => setResult(null)} className={ghostBtn}>Done</button>
          </div>
        </div>
      )}

      {/* ---- no shift open ---- */}
      {canUse && cur && !cur.shift && !result && (
        <form onSubmit={doOpen} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-gray-100 p-2.5 text-gray-500"><Lock size={20} /></span>
            <div>
              <p className="font-semibold text-[#071A2F]">You have no open shift</p>
              <p className="text-sm text-gray-500">{cur.requireShift ? "You can't sell until you open one." : "Open a shift so the cash you take is counted against you."}</p>
            </div>
          </div>

          {cur.handovers.length > 0 && (
            <Field label="Taking over from">
              <select className={inputClass} value={takeOver} onChange={(e) => setTakeOver(e.target.value)}>
                <option value="">Starting fresh (nobody)</option>
                {cur.handovers.map((h) => (
                  <option key={h.id} value={h.id}>{h.userName ?? "A colleague"} · closed {when(h.closedAt)}</option>
                ))}
              </select>
            </Field>
          )}
          {picked && (
            <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              {picked.userName ?? "They"} said they left the drawer with <b>{cedi(picked.countedCash)}</b>. Count it yourself and enter what you actually find. Any gap is recorded.
            </p>
          )}
          <Field label="Cash in the drawer now (GH₵)">
            <input className={inputClass} inputMode="decimal" value={float} onChange={(e) => setFloat(e.target.value)} placeholder="0.00" />
          </Field>
          {cur.pin.required && (
            cur.pin.set ? (
              <div>
                <p className="mb-1 text-sm font-medium text-[#071A2F]">Your PIN</p>
                <PinInput value={pin} onChange={(v) => { setPin(v); setError(""); }} disabled={busy} />
              </div>
            ) : (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">You don&apos;t have a PIN yet. Ask a manager to set one, or to open your shift for you.</p>
            )
          )}
          <Field label="Note">
            <input className={inputClass} value={openNotes} onChange={(e) => setOpenNotes(e.target.value)} placeholder="Optional" />
          </Field>
          <button disabled={busy || (cur.pin.required && (!cur.pin.set || pin.length < 4))} className={`${primaryBtn} inline-flex items-center gap-1`}><Play size={14} /> {busy ? "Opening…" : "Open my shift"}</button>
          {opened && opened.handoverDifference !== null && opened.handoverDifference !== 0 && (
            <p className="text-sm text-amber-700">Handover gap recorded: {cedi(opened.handoverDifference)}</p>
          )}
        </form>
      )}

      {/* ---- shift open ---- */}
      {cur?.shift && cur.live && !result && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-[#071A2F]">Shift open since {when(cur.shift.openedAt)}</p>
              <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">Open</span>
            </div>
            {cur.shift.handoverDifference !== null && cur.shift.handoverDifference !== 0 && (
              <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
                At handover you found {cedi(Math.abs(cur.shift.handoverDifference))} {cur.shift.handoverDifference < 0 ? "less" : "more"} than was left.
              </p>
            )}
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt className="text-gray-500">Started with</dt><dd className="font-semibold text-[#071A2F]"><Money v={cur.shift.openingFloat} /></dd></div>
              <div><dt className="text-gray-500">Sales</dt><dd className="font-semibold text-[#071A2F]">{cur.live.salesCount} · {cedi(cur.live.salesTotal)}</dd></div>
              {(Object.entries(cur.live.byMethod) as [string, number][]).filter(([, v]) => v > 0).map(([k, v]) => (
                <div key={k}><dt className="text-gray-500">{METHOD_LABELS[k] ?? k}</dt><dd className="font-semibold text-[#071A2F]">{cedi(v)}</dd></div>
              ))}
            </dl>
            {canSeeAll && (
              <p className="mt-3 text-xs text-gray-500">Expected cash in drawer (managers only): <b>{cedi(cur.live.expectedCash)}</b></p>
            )}
          </div>

          {canUse && (
            <form onSubmit={doClose} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <div>
                <h2 className="text-lg font-bold text-[#071A2F]">Close my shift</h2>
                <p className="text-sm text-gray-500">Count only the cash in the drawer, notes and coins. Mobile money and Paystack are not counted here.</p>
              </div>
              <Field label="Cash counted (GH₵)">
                <input className={inputClass} inputMode="decimal" value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Note">
                <input className={inputClass} value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} placeholder="Optional" />
              </Field>
              <button disabled={busy} className={primaryBtn}>{busy ? "Closing…" : "Close shift and hand over"}</button>
            </form>
          )}
        </div>
      )}

      {/* ---- manager opens a shift for a cashier ---- */}
      {canOpenFor && cur && (
        <form onSubmit={doOpenFor} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div>
            <h2 className="text-lg font-bold text-[#071A2F]">Open a shift for a cashier</h2>
            <p className="text-sm text-gray-500">For a cashier with no PIN, or who forgot it or got locked out. You count the drawer with them and open it on their behalf. It is recorded as opened by you.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cashier">
              <select className={inputClass} value={forId} onChange={(e) => setForId(e.target.value)}>
                <option value="">Choose…</option>
                {cashiers.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.hasOpenShift}>
                    {c.name}{c.hasOpenShift ? " (shift already open)" : c.hasPin ? "" : " (no PIN)"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cash in the drawer (GH₵)">
              <input className={inputClass} inputMode="decimal" value={forFloat} onChange={(e) => setForFloat(e.target.value)} placeholder="0.00" />
            </Field>
          </div>
          {cur.handovers.length > 0 && (
            <Field label="Taking over from">
              <select className={inputClass} value={forTake} onChange={(e) => setForTake(e.target.value)}>
                <option value="">Starting fresh</option>
                {cur.handovers.map((h) => (
                  <option key={h.id} value={h.id}>{h.userName ?? "A colleague"} · left {cedi(h.countedCash)}</option>
                ))}
              </select>
            </Field>
          )}
          {forMsg && <p className="text-sm text-green-700">{forMsg}</p>}
          <button disabled={busy} className={primaryBtn}>{busy ? "Opening…" : "Open shift for them"}</button>
        </form>
      )}

      {/* ---- owner setting ---- */}
      {isOwner && cur && (
        <label className="flex items-start gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <input type="checkbox" className="mt-1" checked={cur.requireShift} onChange={toggleRequire} />
          <span>
            <span className="block font-semibold text-[#071A2F]">Cashiers must open a shift before selling</span>
            <span className="text-sm text-gray-500">Every sale and tab payment then belongs to a named cashier with a counted drawer.</span>
          </span>
        </label>
      )}

      {/* ---- manager history ---- */}
      {canSeeAll && (
        <div>
          <h2 className="mb-2 text-lg font-bold text-[#071A2F]">All shifts</h2>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">No shifts yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Cashier</th>
                    <th className="px-4 py-3">Opened</th>
                    <th className="px-4 py-3 text-right">Sales</th>
                    <th className="px-4 py-3 text-right">Expected</th>
                    <th className="px-4 py-3 text-right">Counted</th>
                    <th className="px-4 py-3 text-right">Difference</th>
                    <th className="px-4 py-3 text-right">Handover gap</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((s) => (
                    <tr key={s.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 font-medium text-[#071A2F]">{s.userName ?? "—"}{s.openedByName && <span className="ml-2 text-xs font-normal text-gray-400">opened by {s.openedByName}</span>}{s.status === "OPEN" && <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">open</span>}</td>
                      <td className="px-4 py-3 text-gray-600">{when(s.openedAt)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{s.salesTotal === null ? "—" : `${s.salesCount} · ${cedi(s.salesTotal)}`}</td>
                      <td className="px-4 py-3 text-right text-gray-600"><Money v={s.expectedCash} /></td>
                      <td className="px-4 py-3 text-right text-gray-600"><Money v={s.countedCash} /></td>
                      <td className="px-4 py-3 text-right font-medium"><Money v={s.variance} signed /></td>
                      <td className="px-4 py-3 text-right font-medium"><Money v={s.handoverDifference} signed /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
