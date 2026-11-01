import { apiFetch } from "@/lib/apiClient";
import type { MixRange, SalesMixResponse } from "@/lib/dayTypes";

export function getSalesMix(params: { range?: MixRange; from?: string; to?: string; dayId?: string }) {
  const qs = new URLSearchParams();
  if (params.dayId) {
    qs.set("dayId", params.dayId);
  } else {
    qs.set("range", params.range ?? "today");
    if (params.range === "custom") {
      if (params.from) qs.set("from", params.from);
      if (params.to) qs.set("to", params.to);
    }
  }
  return apiFetch<SalesMixResponse>(`/reports/sales-mix?${qs.toString()}`);
}
