// Quantities come as decimal strings like "6.000" — show them without trailing zeros.
export function qty(v: string | number | null | undefined, maxDecimals = 3) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-GH", { maximumFractionDigits: maxDecimals });
}

export function cedi(v: string | number | null | undefined) {
  const n = Number(v ?? 0);
  return `GH₵ ${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function when(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// "" and non-numeric text become NaN so callers can reject them explicitly.
export function num(text: string) {
  return text.trim() === "" ? NaN : Number(text);
}

export function errMsg(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}
