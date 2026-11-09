export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  businessId: string;
}

export interface LoginResponse {
  user: AppUser;
  accessToken: string;
}

export interface MeResponse {
  user: AppUser;
  permissions: string[];
}

export interface Category {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Prisma's Decimal fields (costPrice, sellingPrice) serialize to JSON as
// STRINGS, not numbers — Decimal implements its own toJSON(). Always
// Number(product.costPrice) before doing math or formatting as currency.
export interface Product {
  id: string;
  businessId: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  currentQuantity: number;
  minStockLevel: number;
  imageUrl: string | null;
  isActive: boolean;
  hasRecipe?: boolean; // made from ingredients: its stock lives in the ingredients
  createdAt: string;
  updatedAt: string;
}

export type InventoryMovementType =
  | "OPENING_STOCK"
  | "PURCHASE"
  | "SALE"
  | "RETURN"
  | "ADJUSTMENT"
  | "DAMAGE"
  | "TRANSFER";

export interface InventoryMovement {
  id: string;
  businessId: string;
  productId: string;
  product: { id: string; name: string; sku: string | null };
  type: InventoryMovementType;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string | null;
  reference: string | null;
  userId: string | null;
  createdAt: string;
}

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string | null;
  currentQuantity: number;
  minStockLevel: number;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SalePaymentMethod = "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER" | "PAYSTACK" | "OTHER";

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  unitPrice: string;
  unitCost: string;
  quantity: number;
  discount: string;
  lineTotal: string;
}

export interface Sale {
  id: string;
  businessId: string;
  cashierId: string;
  customerId: string | null;
  receiptNumber: string;
  status: "COMPLETED" | "CANCELLED";
  subtotal: string;
  discountTotal: string;
  total: string;
  paymentMethod: SalePaymentMethod;
  paymentStatus: string;
  amountTendered: string | null;
  changeGiven: string | null;
  notes: string | null;
  items: SaleItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Business {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  currency: string;
  businessType: string;
  isActive: boolean;
  restaurantModeEnabled: boolean;
  // Whether THIS business has its own Paystack keys configured — never the
  // keys themselves, which are write-only (see /business/paystack-settings).
  paystackConfigured: boolean;
  paystackPublicKey: string | null;
}

export interface CustomerSaleSummary {
  id: string;
  receiptNumber: string;
  total: string;
  status: "COMPLETED" | "CANCELLED";
  createdAt: string;
}

export interface CustomerDetail extends Customer {
  sales: CustomerSaleSummary[];
}

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierWithBalance extends Supplier {
  outstandingBalance: number;
}

export interface SupplierPurchaseSummary {
  id: string;
  totalCost: string;
  amountPaid: string;
  paymentStatus: PurchasePaymentStatus;
  createdAt: string;
}

export interface SupplierDetail extends SupplierWithBalance {
  purchases: SupplierPurchaseSummary[];
}

export type PurchasePaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  productName: string;
  costPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface PurchasePayment {
  id: string;
  businessId: string;
  purchaseId: string;
  amount: string;
  method: SalePaymentMethod;
  reference: string | null;
  notes: string | null;
  userId: string | null;
  createdAt: string;
}

export interface Purchase {
  id: string;
  businessId: string;
  supplierId: string;
  supplier?: { id: string; name: string };
  recordedById: string;
  totalCost: string;
  amountPaid: string;
  paymentStatus: PurchasePaymentStatus;
  notes: string | null;
  items: PurchaseItem[];
  payments: PurchasePayment[];
  createdAt: string;
  updatedAt: string;
}
