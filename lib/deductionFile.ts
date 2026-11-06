import type { DeductionRecord } from "@/lib/api/stockDeduction";

export const refOf = (n: number) => `SD-${String(n).padStart(4, "0")}`;

const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

// The file a manager downloads from Deduct Sales and uploads in Stock Adjustment.
export function buildDeductionCsv(d: DeductionRecord): string {
  const rows: (string | number)[][] = [
    ["SalesPoint stock deduction"],
    ["Reference", refOf(d.number)],
    ["From", new Date(d.fromAt).toLocaleString("en-GH")],
    ["To", new Date(d.toAt).toLocaleString("en-GH")],
    ["Sales", d.salesCount],
    [],
    ["Type", "Item", "Unit", "Quantity to deduct", "Item ID"],
    ...d.lines.map((l) => [l.kind, l.name, l.unit, l.quantity, l.id]),
  ];
  return rows.map((r) => r.map(q).join(",")).join("\r\n");
}

export function downloadDeduction(d: DeductionRecord) {
  const blob = new Blob(["﻿" + buildDeductionCsv(d)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${refOf(d.number)}-stock-deduction.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Reads one CSV line, honouring quotes.
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

export interface ParsedDeduction {
  number: number;
  lines: { kind: "INGREDIENT" | "PRODUCT"; name: string; unit: string; quantity: number; id: string }[];
}

export function parseDeductionCsv(text: string): ParsedDeduction {
  const rows = text.replace(/^﻿/, "").split(/\r?\n/).map(splitLine);
  const refRow = rows.find((r) => r[0]?.trim().toLowerCase() === "reference");
  const match = refRow?.[1]?.match(/SD-(\d+)/i);
  if (!match) throw new Error("This is not a SalesPoint deduction file. Download it from Deduct Sales.");
  const headerAt = rows.findIndex((r) => r[0]?.trim().toLowerCase() === "type");
  if (headerAt < 0) throw new Error("The item list is missing from this file.");
  const lines: ParsedDeduction["lines"] = [];
  for (const r of rows.slice(headerAt + 1)) {
    if (!r[0]?.trim()) continue;
    const kind = r[0].trim().toUpperCase();
    const quantity = Number(r[3]);
    if ((kind !== "INGREDIENT" && kind !== "PRODUCT") || !Number.isFinite(quantity) || !r[4]?.trim()) {
      throw new Error("A row in this file could not be read. Download it again and upload it without changing it.");
    }
    lines.push({ kind, name: r[1], unit: r[2], quantity, id: r[4].trim() });
  }
  if (lines.length === 0) throw new Error("This file has no items.");
  return { number: Number(match[1]), lines };
}
