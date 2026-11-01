import { apiFetch } from "@/lib/apiClient";
import type { Business } from "@/lib/types";

export function getBusiness() {
  return apiFetch<{ business: Business }>("/business");
}

export interface UpdateBusinessInput {
  name?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  currency?: string;
  businessType?: string;
  restaurantModeEnabled?: boolean;
}

export function updateBusiness(input: UpdateBusinessInput) {
  return apiFetch<{ business: Business }>("/business", { method: "PATCH", body: input });
}

export interface PaystackSettingsStatus {
  publicKey: string | null;
  isConfigured: boolean;
  configuredAt: string | null;
}

export function getPaystackSettings() {
  return apiFetch<PaystackSettingsStatus>("/business/paystack-settings");
}

export function updatePaystackSettings(input: { publicKey: string; secretKey: string }) {
  return apiFetch<PaystackSettingsStatus>("/business/paystack-settings", {
    method: "PUT",
    body: input,
  });
}

export function deletePaystackSettings() {
  return apiFetch<{ isConfigured: boolean }>("/business/paystack-settings", { method: "DELETE" });
}
