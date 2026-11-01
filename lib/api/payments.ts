import { apiFetch } from "@/lib/apiClient";

export interface InitializePaystackInput {
  items: { productId: string; quantity: number; discount: number }[];
  customerId?: string;
  customerEmail: string;
}

export interface InitializePaystackResult {
  reference: string;
  amount: string;
  authorizationUrl: string;
  accessCode: string;
}

export function initializePaystackPayment(input: InitializePaystackInput) {
  return apiFetch<InitializePaystackResult>("/payments/paystack/initialize", {
    method: "POST",
    body: input,
  });
}

export interface PaystackStatusResult {
  reference: string;
  status: "already_processed" | "success" | "failed" | "not_found";
  saleId?: string;
  reconciliationNeeded?: boolean;
}

// If the transaction is still PENDING on the backend, this call itself
// triggers a real verification against Paystack (not just a status read) —
// see the backend's finalizePaystackTransaction(). Safe to call repeatedly.
export function getPaystackStatus(reference: string) {
  return apiFetch<PaystackStatusResult>(`/payments/paystack/${reference}/status`);
}
