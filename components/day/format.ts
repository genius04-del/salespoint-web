export const money = (n: number | string) =>
  `GH₵ ${Number(n).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const signedMoney = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${money(Math.abs(n))}`;

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function varianceTone(variance: number) {
  if (Math.abs(variance) < 0.005) return "text-green-700 bg-green-50";
  return variance > 0 ? "text-blue-700 bg-blue-50" : "text-red-700 bg-red-50";
}

export function varianceLabel(variance: number) {
  if (Math.abs(variance) < 0.005) return "Balanced";
  return variance > 0 ? `Over ${money(variance)}` : `Short ${money(Math.abs(variance))}`;
}
