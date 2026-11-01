import { apiFetch } from "@/lib/apiClient";
import type { SupplierDetail, SupplierWithBalance } from "@/lib/types";

export function listSuppliers(search?: string) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiFetch<{ suppliers: SupplierWithBalance[] }>(`/suppliers${qs}`);
}

export function getSupplier(id: string) {
  return apiFetch<{ supplier: SupplierDetail }>(`/suppliers/${id}`);
}

export interface SupplierInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export function createSupplier(input: SupplierInput) {
  return apiFetch<{ supplier: SupplierWithBalance }>("/suppliers", { method: "POST", body: input });
}

export function updateSupplier(id: string, input: Partial<SupplierInput>) {
  return apiFetch<{ supplier: SupplierWithBalance }>(`/suppliers/${id}`, { method: "PATCH", body: input });
}

export function deleteSupplier(id: string) {
  return apiFetch<void>(`/suppliers/${id}`, { method: "DELETE" });
}
