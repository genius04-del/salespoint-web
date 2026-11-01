import { apiFetch } from "@/lib/apiClient";
import type { AuditLogResponse } from "@/lib/types";

export function listAuditLogs(params: {
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params.action) qs.set("action", params.action);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 50));
  return apiFetch<AuditLogResponse>(`/audit-logs?${qs.toString()}`);
}

export function listAuditActions() {
  return apiFetch<{ actions: string[] }>("/audit-logs/actions");
}