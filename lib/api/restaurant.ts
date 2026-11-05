import { apiFetch } from "@/lib/apiClient";
import type { DiningTable, KitchenStatus, Order, TableStatus } from "@/lib/restaurantTypes";
import type { Sale } from "@/lib/types";

// ---- Tables ----
export const listTables = () => apiFetch<{ tables: DiningTable[] }>("/tables");
export const createTable = (input: { name: string; capacity?: number }) =>
  apiFetch<{ table: DiningTable }>("/tables", { method: "POST", body: input });
export const setTableStatus = (id: string, status: TableStatus) =>
  apiFetch<{ table: DiningTable }>(`/tables/${id}/status`, { method: "POST", body: { status } });
export const updateTable = (id: string, input: Partial<{ name: string; capacity: number | null; isActive: boolean }>) =>
  apiFetch<{ table: DiningTable }>(`/tables/${id}`, { method: "PATCH", body: input });

// ---- Orders (tabs) ----
export const listOrders = (status: "OPEN" | "CLOSED" | "CANCELLED" = "OPEN") =>
  apiFetch<{ orders: Order[] }>(`/orders?status=${status}`);

export interface NewOrderItem {
  productId: string;
  quantity: number;
  notes?: string;
}
export const openOrder = (input: { tableId?: string; items: NewOrderItem[]; notes?: string }) =>
  apiFetch<{ order: Order }>("/orders", { method: "POST", body: input });
export const addOrderItems = (orderId: string, items: NewOrderItem[]) =>
  apiFetch<unknown>(`/orders/${orderId}/items`, { method: "POST", body: { items } });
export const setItemStatus = (itemId: string, status: KitchenStatus) =>
  apiFetch<unknown>(`/orders/items/${itemId}/status`, { method: "PATCH", body: { status } });
export const cancelOrder = (orderId: string, reason: string) =>
  apiFetch<{ message: string }>(`/orders/${orderId}/cancel`, { method: "POST", body: { reason } });
export const checkoutOrder = (
  orderId: string,
  input: { paymentMethod: "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER" | "OTHER"; amountTendered?: number; customerId?: string }
) => apiFetch<{ sale: Sale }>(`/orders/${orderId}/checkout`, { method: "POST", body: input });

// ---- Sales register ----
export interface RegisterSale {
  id: string;
  receiptNumber: string;
  status: "COMPLETED" | "CANCELLED";
  total: string;
  paymentMethod: string;
  createdAt: string;
  cashier: { id: string; name: string };
  _count: { items: number };
  order: { table: { name: string } | null } | null;
}
export interface RegisterQuery {
  from: string;
  to: string;
  status?: string;
  paymentMethod?: string;
  cashierId?: string;
  q?: string;
}
export function listSalesRegister(p: RegisterQuery) {
  const qs = new URLSearchParams({ from: p.from, to: p.to });
  if (p.status) qs.set("status", p.status);
  if (p.paymentMethod) qs.set("paymentMethod", p.paymentMethod);
  if (p.cashierId) qs.set("cashierId", p.cashierId);
  if (p.q) qs.set("q", p.q);
  return apiFetch<{ sales: RegisterSale[] }>(`/sales?${qs.toString()}`);
}
export const cancelSale = (id: string, reason: string) =>
  apiFetch<{ message?: string }>(`/sales/${id}/cancel`, { method: "POST", body: { reason } });
