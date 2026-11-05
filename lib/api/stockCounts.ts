import { apiFetch } from "@/lib/apiClient";
import type {
  MovementReport,
  StockCountDetail,
  StockCountSummary,
  VarianceReport,
} from "@/lib/stockTypes";

export const listStockCounts = () => apiFetch<{ counts: StockCountSummary[] }>("/stock-counts");

export const getStockCount = (id: string) => apiFetch<{ count: StockCountDetail }>(`/stock-counts/${id}`);

export const startStockCount = (scope: "ALL" | "INGREDIENTS" | "PRODUCTS", notes?: string) =>
  apiFetch<{ count: { id: string } }>("/stock-counts", { method: "POST", body: { scope, notes } });

export const saveCountLines = (id: string, lines: { lineId: string; counted: number | null }[]) =>
  apiFetch<{ message: string }>(`/stock-counts/${id}/lines`, { method: "PUT", body: { lines } });

export const submitStockCount = (id: string) =>
  apiFetch<{ count: StockCountSummary }>(`/stock-counts/${id}/submit`, { method: "POST" });

export const approveStockCount = (id: string) =>
  apiFetch<{ count: StockCountSummary }>(`/stock-counts/${id}/approve`, { method: "POST" });

export const rejectStockCount = (id: string, note: string) =>
  apiFetch<{ count: StockCountSummary }>(`/stock-counts/${id}/reject`, { method: "POST", body: { note } });

export const deleteStockCount = (id: string) => apiFetch<{ message: string }>(`/stock-counts/${id}`, { method: "DELETE" });

export const getVarianceReport = (range: string) =>
  apiFetch<VarianceReport>(`/stock-variance?range=${encodeURIComponent(range)}`);

export const getVarianceReportBetween = (from: string, to: string) =>
  apiFetch<VarianceReport>(`/stock-variance?range=custom&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);

export const getMovementReport = (from: string, to: string) =>
  apiFetch<MovementReport>(`/stock-variance/report?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
