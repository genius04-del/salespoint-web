import { apiFetch } from "@/lib/apiClient";
import type { Purchase, SalePaymentMethod } from "@/lib/types";

export interface PurchaseListParams {
  supplierId?: string;
  from?: string;
  to?: string;
}

export function listPurchases(params: PurchaseListParams = {}) {
  const query = new URLSearchParams();
  if (params.supplierId) query.set("supplierId", params.supplierId);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  const qs = query.toString();
  return apiFetch<{ purchases: Purchase[] }>(`/purchases${qs ? `?${qs}` : ""}`);
}

export function getPurchase(id: string) {
  return apiFetch<{ purchase: Purchase }>(`/purchases/${id}`);
}

export interface CreatePurchaseInput {
  supplierId: string;
  items: { productId?: string; ingredientId?: string; quantity: number; costPrice: number; lineTotal?: number }[];
  amountPaid?: number;
  paidWith?: "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER";
  notes?: string;
}

export function createPurchase(input: CreatePurchaseInput) {
  return apiFetch<{ purchase: Purchase }>("/purchases", { method: "POST", body: input });
}

// CASH/MOBILE_MONEY/BANK_TRANSFER/OTHER only — same reasoning as sales
// checkout: a Paystack payment needs the separate verified flow, not a
// same-request charge.
export interface RecordPaymentInput {
  amount: number;
  method: Exclude<SalePaymentMethod, "PAYSTACK">;
  reference?: string;
  notes?: string;
}

export function recordPurchasePayment(purchaseId: string, input: RecordPaymentInput) {
  return apiFetch<{ purchase: Purchase }>(`/purchases/${purchaseId}/payments`, {
    method: "POST",
    body: input,
  });
}
