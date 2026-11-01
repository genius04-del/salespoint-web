import { apiFetch } from "@/lib/apiClient";
import type { Customer, CustomerDetail } from "@/lib/types";

export function listCustomers(search?: string) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiFetch<{ customers: Customer[] }>(`/customers${qs}`);
}

export function getCustomer(id: string) {
  return apiFetch<{ customer: CustomerDetail }>(`/customers/${id}`);
}

export interface CustomerInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export function createCustomer(input: CustomerInput) {
  return apiFetch<{ customer: Customer }>("/customers", { method: "POST", body: input });
}

export function updateCustomer(id: string, input: Partial<CustomerInput>) {
  return apiFetch<{ customer: Customer }>(`/customers/${id}`, { method: "PATCH", body: input });
}

export function deleteCustomer(id: string) {
  return apiFetch<void>(`/customers/${id}`, { method: "DELETE" });
}
