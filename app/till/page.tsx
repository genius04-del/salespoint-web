"use client";

import { useEffect, useState } from "react";
import { Store, Delete, CircleAlert } from "lucide-react";

const STORE_KEY = "sp_till_code";
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const;

function readSaved() {
  try {
    return localStorage.getItem(STORE_KEY) ?? "";
  } catch {
    return "";
  }
}

export default function TillLoginPage() {
  const [code, setCode] = useState("");
  const [staffNumber, setStaffNumber] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // The till code rarely changes on a device, so remember it.
  useEffect(() => {
    (async () => {
      setCode(readSaved());
    })();
  }, []);

  async function signIn(currentPin: string) {
    setError("");
    const n = Number(staffNumber);
    if (!code.trim() || !Number.isInteger(n) || n < 1) {
      setError("Enter the till code and your staff number first.");
      return;
    }
    if (currentPin.length < 4) {
      setError("Your PIN is 4 to 6 digits.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessCode: code.trim(), staffNumber: n, pin: currentPin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not sign in.");
        setPin("");
        setBusy(false);
        return;
      }
      try {
        localStorage.setItem(STORE_KEY, code.trim().toUpperCase());
      } catch {
        // Private mode: the code just won't be remembered.
      }
      // A full load lets the app restore the session from the new cookie.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/dashboard/pos";
    } catch {
      setError("Could not reach the server. Check the connection.");
      setBusy(false);
    }
  }

  function press(key: (typeof KEYS)[number]) {
    if (busy) return;
    setError("");
    if (key === "clear") return setPin("");
    if (key === "back") return setPin((p) => p.slice(0, -1));
    setPin((p) => (p.length >= 6 ? p : p + key));
  }

  // The physical keyboard drives the PIN too. Listening on the window (not a
  // div) means it works without clicking anywhere first, but typing in the
  // till code / staff number boxes is left alone.
  // No deps array: re-binds each render so it always sees the latest state.
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typingInField = t?.tagName === "INPUT" || t?.tagName === "TEXTAREA";
      if (e.key === "Enter") {
        if (!typingInField || pin.length >= 4) void signIn(pin);
        return;
      }
      if (typingInField) return;
      if (/^\d$/.test(e.key)) press(e.key as (typeof KEYS)[number]);
      else if (e.key === "Backspace") press("back");
      else if (e.key === "Escape") press("clear");
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-background px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange text-white shadow-sm shadow-brand-orange/30">
            <Store size={26} strokeWidth={2.25} />
          </div>
          <h1 className="text-2xl font-bold tracking-wide text-primary-navy">Start your shift</h1>
          <p className="text-sm text-gray-500">Sign in with your staff number and PIN</p>
        </div>

        <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Till code</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                autoCapitalize="characters"
                autoComplete="off"
                maxLength={12}
                placeholder="ABC234"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-lg font-semibold tracking-widest outline-none focus:border-brand-orange"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Staff number</span>
              <input
                value={staffNumber}
                onChange={(e) => setStaffNumber(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-lg font-semibold outline-none focus:border-brand-orange"
              />
            </label>
          </div>

          <div className="flex justify-center gap-3 py-2" aria-label={`${pin.length} digits entered`}>
            {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
              <span key={i} className={`h-3.5 w-3.5 rounded-full ${i < pin.length ? "bg-primary-navy" : "bg-gray-200"}`} />
            ))}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              <CircleAlert size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => press(k)}
                disabled={busy}
                aria-label={k === "back" ? "Delete" : k === "clear" ? "Clear" : k}
                className="flex h-14 items-center justify-center rounded-xl bg-gray-50 text-xl font-semibold text-primary-navy active:bg-gray-200 disabled:opacity-60"
              >
                {k === "back" ? <Delete size={22} /> : k === "clear" ? <span className="text-sm text-gray-500">Clear</span> : k}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => signIn(pin)}
            disabled={busy || pin.length < 4}
            className="h-12 w-full rounded-xl bg-brand-orange text-base font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          Manager or owner? <a href="/login" className="font-semibold text-brand-orange">Sign in with your email</a>
        </p>
      </div>
    </div>
  );
}
