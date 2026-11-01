import { apiFetch } from "@/lib/apiClient";
import type { Sale, SaleDetail, SaleListItem, SalePaymentMethod } from "@/lib/types";

// ---- POS checkout (original) ----

export interface CheckoutLineInput {
  productId: string;
  quantity: number;
  discount: number;
}

export interface CheckoutInput {
  items: CheckoutLineInput[];
  customerId?: string;
  // PAYSTACK is deliberately not offered by this screen — the backend
  // rejects it here on purpose (it uses the separate verified
  // initialize/webhook flow from /payments/paystack/*).
  paymentMethod: Exclude<SalePaymentMethod, "PAYSTACK">;
  amountTendered?: number;
}

export function checkout(input: CheckoutInput) {
  return apiFetch<{ sale: Sale }>("/sales/checkout", { method: "POST", body: input });
}

// ---- Sales history ----

export function listSales(params: { from?: string; to?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const q = qs.toString();
  return apiFetch<{ sales: SaleListItem[] }>(`/sales${q ? `?${q}` : ""}`);
}

// Returns the cashier's name too; SaleDetail extends Sale, so the POS
// page keeps working with it unchanged.
export function getSale(id: string) {
  return apiFetch<{ sale: SaleDetail }>(`/sales/${id}`);
}

export function cancelSale(id: string, reason: string) {
  return apiFetch<{ sale: SaleDetail }>(`/sales/${id}/cancel`, {
    method: "POST",
    body: { reason },
  });
}