"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, Lock, Unlock } from "lucide-react";
import { getTillAccess, removeStaffPin, setStaffPin, unlockStaffPin } from "@/lib/api/shifts";
import type { TillStaff } from "@/lib/shiftTypes";
import { Field, Modal, ghostBtn, inputClass, primaryBtn } from "@/components/kitchen/Modal";
import { errMsg } from "@/components/kitchen/format";

function PinModal({ person, onClose, onDone }: { person: TillStaff; onClose: () => void; onDone: () => void }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await setStaffPin(person.id, pin);
      onDone();
    } catch (err) {
      setError(errMsg(err, "Could not save the PIN"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`${person.hasPin ? "Reset" : "Set"} PIN for ${person.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="New PIN" hint="4 to 6 digits. Avoid 1234 or 0000. Tell it to them privately; it is not shown again.">
          <input
            className={`${inputClass} text-center text-xl tracking-[0.4em]`}
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>
          <button disabled={busy || pin.length < 4} className={primaryBtn}>{busy ? "Saving…" : "Save PIN"}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function TillAccessPage() {
  const [code, setCode] = useState("");
  const [staff, setStaff] = useState<TillStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<TillStaff | null>(null);
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getTillAccess();
        if (!cancelled) {
          setCode(res.businessCode);
          setStaff(res.staff);
          setError("");
        }
      } catch (e) {
        if (!cancelled) setError(errMsg(e, "Could not load till access"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  async function act(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
      reload();
    } catch (e) {
      setError(errMsg(e, "Something went wrong"));
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/till`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the address is shown on screen anyway.
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#071A2F]">Till Access</h1>
        <p className="text-sm text-gray-500">Cashiers sign in on the till with a staff number and PIN. No email or password to type.</p>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Your till code</p>
          <p className="text-3xl font-bold tracking-[0.3em] text-[#071A2F]">{code || "······"}</p>
        </div>
        <div className="text-right text-sm text-gray-500">
          <p>Cashiers open <b className="text-[#071A2F]">{typeof window === "undefined" ? "/till" : `${window.location.host}/till`}</b></p>
          <button onClick={copyLink} className="mt-1 inline-flex items-center gap-1 font-medium text-[#FF6B00]">
            <Copy size={14} /> {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-500">Loading…</p>}
      {!loading && staff.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm ring-1 ring-black/5">
          No cashiers yet. Add staff with the Cashier role in Staff, then come back to give them a PIN.
        </p>
      )}

      {staff.length > 0 && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Staff number</th>
                <th className="px-4 py-3">PIN</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-[#071A2F]">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.staffNumber ?? "—"}</td>
                  <td className="px-4 py-3">
                    {s.locked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600"><Lock size={12} /> Locked</span>
                    ) : s.hasPin ? (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Set</span>
                    ) : (
                      <span className="text-xs text-gray-400">Not set</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {s.locked && (
                        <button title="Unlock" onClick={() => act(() => unlockStaffPin(s.id))} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><Unlock size={16} /></button>
                      )}
                      <button title={s.hasPin ? "Reset PIN" : "Set PIN"} onClick={() => setEditing(s)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><KeyRound size={16} /></button>
                      {s.hasPin && (
                        <button onClick={() => act(() => removeStaffPin(s.id))} className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50">Remove</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <PinModal
          person={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
