import { apiFetch } from "@/lib/apiClient";
import type { Category, Product } from "@/lib/types";

// ---- Categories ----

export function listCategories() {
  return apiFetch<{ categories: Category[] }>("/categories");
}

export function createCategory(input: { name: string; description?: string }) {
  return apiFetch<{ category: Category }>("/categories", { method: "POST", body: input });
}

export function updateCategory(
  id: string,
  input: Partial<{ name: string; description: string; isActive: boolean }>
) {
  return apiFetch<{ category: Category }>(`/categories/${id}`, { method: "PATCH", body: input });
}

export function deleteCategory(id: string) {
  return apiFetch<void>(`/categories/${id}`, { method: "DELETE" });
}

// ---- Products ----

export interface ProductListParams {
  search?: string;
  categoryId?: string;
  includeInactive?: boolean;
}

export function listProducts(params: ProductListParams = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("categoryId", params.categoryId);
  if (params.includeInactive) query.set("includeInactive", "true");
  const qs = query.toString();
  return apiFetch<{ products: Product[] }>(`/products${qs ? `?${qs}` : ""}`);
}

export function getProduct(id: string) {
  return apiFetch<{ product: Product }>(`/products/${id}`);
}

export interface CreateProductInput {
  name: string;
  description?: string;
  categoryId?: string;
  sku?: string;
  barcode?: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  minStockLevel: number;
  imageUrl?: string;
  openingStock: number;
}

export function createProduct(input: CreateProductInput) {
  return apiFetch<{ product: Product }>("/products", { method: "POST", body: input });
}

export type UpdateProductInput = Partial<Omit<CreateProductInput, "openingStock">> & {
  isActive?: boolean;
};

export function updateProduct(id: string, input: UpdateProductInput) {
  return apiFetch<{ product: Product }>(`/products/${id}`, { method: "PATCH", body: input });
}

// Mirrors the backend exactly: hard-deletes if the product has no
// inventory history, otherwise deactivates it instead — either way this
// always comes back 200 with a body, never a bare 204, so callers don't
// need to special-case it.
export function deleteProduct(id: string) {
  return apiFetch<{ product?: Product; note?: string }>(`/products/${id}`, { method: "DELETE" });
}
