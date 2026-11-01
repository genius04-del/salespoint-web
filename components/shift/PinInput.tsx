"use client";

// Four-to-six digit PIN entry for a touch till: dots, big keys, no letters.
// Digits are never shown on screen.
import { useEffect } from "react";
import { Delete } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const;

export function PinInput({ value, onChange, disabled = false }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  function press(k: (typeof KEYS)[number]) {
    if (disabled) return;
    if (k === "clear") return onChange("");
    if (k === "back") return onChange(value.slice(0, -1));
    if (value.length < 6) onChange(value + k);
  }
  // Physical keyboard works too (digits, Backspace, Esc to clear).
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA") return;
      if (/^\d$/.test(e.key)) press(e.key as (typeof KEYS)[number]);
      else if (e.key === "Backspace") press("back");
      else if (e.key === "Escape") press("clear");
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  });

  return (
    <div className="mx-auto w-full max-w-[260px]">
      <div className="flex justify-center gap-3 py-3" aria-label={`${value.length} digits entered`}>
        {Array.from({ length: Math.max(4, value.length) }).map((_, i) => (
          <span key={i} className={`h-3.5 w-3.5 rounded-full ${i < value.length ? "bg-[#071A2F]" : "bg-gray-200"}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            disabled={disabled}
            aria-label={k === "back" ? "Delete" : k === "clear" ? "Clear" : k}
            className="flex h-12 items-center justify-center rounded-xl bg-gray-50 text-lg font-semibold text-[#071A2F] active:bg-gray-200 disabled:opacity-60"
          >
            {k === "back" ? <Delete size={20} /> : k === "clear" ? <span className="text-sm text-gray-500">Clear</span> : k}
          </button>
        ))}
      </div>
    </div>
  );
}
