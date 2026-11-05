// Decimals arrive from the API as strings.

export type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "NEEDS_CLEANING";
export type KitchenStatus = "NEW" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";

export interface DiningTable {
  id: string;
  name: string;
  capacity: number | null;
  status: TableStatus;
  isActive: boolean;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  unitPrice: string;
  quantity: number;
  notes: string | null;
  kitchenStatus: KitchenStatus;
  createdAt: string;
}

export interface Order {
  id: string;
  tableId: string | null;
  table: DiningTable | null;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  notes: string | null;
  createdAt: string;
  createdByName?: string | null;
  saleId: string | null;
  items: OrderItem[];
}

// What the customer owes now: everything not cancelled.
export const orderTotal = (o: Order) =>
  o.items.filter((i) => i.kitchenStatus !== "CANCELLED").reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
