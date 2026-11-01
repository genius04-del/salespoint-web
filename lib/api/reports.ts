import { apiFetch } from "@/lib/apiClient";
import type { DashboardReport, ReportRange } from "@/lib/types";

export function getDashboardReport(range: ReportRange = "today") {
  return apiFetch<DashboardReport>(`/reports/dashboard?range=${range}`);
}