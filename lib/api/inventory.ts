import { apiFetch } from "@/lib/apiClient";
import type { InventoryMovement, InventoryMovementType, LowStockProduct } from "@/lib/types";

export function listMovements(productId?: string) {
  const qs = productId ? `?productId=${productId}` : "";
  return apiFetch<{ movements: InventoryMovement[] }>(`/inventory/movements${qs}`);
}

export function lowStock() {
  return apiFetch<{ products: LowStockProduct[] }>("/inventory/low-stock");
}

// PURCHASE/SALE are only ever created automatically by the Purchases/POS
// modules, never recorded by hand here.
export type ManualMovementType = Exclude<InventoryMovementType, "PURCHASE" | "SALE">;

export interface CreateMovementInput {
  productId: string;
  type: ManualMovementType;
  quantityChange: number; // positive = stock in, negative = stock out
  reason: string;
}

export function createMovement(input: CreateMovementInput) {
  return apiFetch<{ movement: InventoryMovement; previousQuantity: number; newQuantity: number }>(
    "/inventory/movements",
    { method: "POST", body: input }
  );
}
