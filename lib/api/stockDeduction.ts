import { apiFetch } from "@/lib/apiClient";

export interface UsageLine {
  kind: "INGREDIENT" | "PRODUCT";
  id: string;
  name: string;
  unit: string;
  quantity: number;
  before: number;
  after: number;
  soldAs?: string[];
}

export interface DeductionPreview {
  enabled: boolean;
  from?: string;
  to?: string;
  openTabs?: number;
  salesCount?: number;
  sold?: number;
  lines?: UsageLine[];
  pending?: { id: string; number: number } | null;
}

export interface DeductionRecord {
  id: string;
  number: number;
  status: "PENDING" | "APPLIED";
  fromAt: string;
  toAt: string;
  salesCount: number;
  by: string;
  appliedBy: string | null;
  appliedAt: string | null;
  lines: UsageLine[];
}

export const previewDeduction = () => apiFetch<DeductionPreview>("/stock-deductions/preview");
export const createDeduction = () => apiFetch<{ deduction: DeductionRecord }>("/stock-deductions", { method: "POST", body: {} });
export const applyDeduction = (number: number, lines: { kind: string; id: string; quantity: number }[]) =>
  apiFetch<{ deduction: DeductionRecord }>("/stock-deductions/apply", { method: "POST", body: { number, lines } });
export const cancelDeduction = (id: string) => apiFetch<{ message: string }>(`/stock-deductions/${id}`, { method: "DELETE" });
export const listDeductions = () => apiFetch<{ deductions: DeductionRecord[] }>("/stock-deductions");
