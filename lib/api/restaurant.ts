import { apiFetch } from "@/lib/apiClient";
import type {
  KitchenOrderItem,
  KitchenStatus,
  RestaurantOrder,
  RestaurantTable,
  Sale,
  TableStatus,
} from "@/lib/types";

// ---- Tables ----
export const listTables = () => apiFetch<{ tables: RestaurantTable[] }>("/tables");

export const createTable = (body: { name: string; capacity?: number }) =>
  apiFetch<{ table: RestaurantTable }>("/tables", { method: "POST", body });

export const updateTable = (
  id: string,
  body: { name?: string; capacity?: number | null; status?: TableStatus; isActive?: boolean }
) => apiFetch<{ table: RestaurantTable }>(`/tables/${id}`, { method: "PATCH", body });

// ---- Orders ----
export const listOrders = (params: { status?: string; tableId?: string } = {}) => {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.tableId) qs.set("tableId", params.tableId);
  const q = qs.toString();
  return apiFetch<{ orders: RestaurantOrder[] }>(`/orders${q ? `?${q}` : ""}`);
};

export const getOrder = (id: string) => apiFetch<{ order: RestaurantOrder }>(`/orders/${id}`);

export interface OrderLineInput {
  productId: string;
  quantity: number;
  notes?: string;
}

export const createOrder = (body: { tableId?: string; items: OrderLineInput[]; notes?: string }) =>
  apiFetch<{ order: RestaurantOrder }>("/orders", { method: "POST", body });

export const addOrderItems = (orderId: string, items: OrderLineInput[]) =>
  apiFetch<{ items: KitchenOrderItem[] }>(`/orders/${orderId}/items`, {
    method: "POST",
    body: { items },
  });

export const setItemStatus = (itemId: string, status: KitchenStatus) =>
  apiFetch<{ item: KitchenOrderItem }>(`/orders/items/${itemId}/status`, {
    method: "PATCH",
    body: { status },
  });

export const cancelOrder = (orderId: string, reason: string) =>
  apiFetch(`/orders/${orderId}/cancel`, { method: "POST", body: { reason } });

export const checkoutOrder = (
  orderId: string,
  body: {
    paymentMethod: "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER" | "OTHER";
    amountTendered?: number;
  }
) => apiFetch<{ sale: Sale }>(`/orders/${orderId}/checkout`, { method: "POST", body });