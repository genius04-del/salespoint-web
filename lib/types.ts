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

// Prisma's Decimal fields serialize to JSON as STRINGS, not numbers —
// always Number(x) before doing math or formatting as currency.
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
  createdAt: string;
  updatedAt: string;
  hasRecipe?: boolean;
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

export type PurchasePaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

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

export interface PurchaseItem {
 id: string;
  purchaseId: string;
  productId: string | null;
  ingredientId: string | null;
  productName: string;
  unit: string | null;
  costPrice: string;
  quantity: string | number;
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
  paystackConfigured: boolean;
  paystackPublicKey: string | null;
}

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
export type NormalBalance = "DEBIT" | "CREDIT";

export interface Account {
  id: string;
  businessId: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  isSystem: boolean;
  isActive: boolean;
}

export interface TrialBalanceRow {
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
}

export interface TrialBalance {
  accounts: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
  balanced: boolean;
}

export interface LedgerEntry {
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface LedgerResult {
  account: { id: string; code: string; name: string; normalBalance: NormalBalance };
  entries: LedgerEntry[];
  closingBalance: number;
}

export interface Expense {
  id: string;
  businessId: string;
  categoryAccountId: string;
  categoryAccount?: { id: string; name: string; code: string };
  paymentAccountId: string;
  paymentAccount?: { id: string; name: string; code: string };
  amount: string;
  description: string | null;
  reference: string | null;
  recordedById: string;
  journalEntryId: string | null;
  createdAt: string;
}
export interface DashboardReportPeriod {
  label: string;
  from: string;
  to: string;
}

export interface DashboardReportPaymentMethod {
  method: SalePaymentMethod;
  orders: number;
  total: number;
}

export interface DashboardReportTransaction {
  date: string;
  type: string;
  description: string;
  amount: number;
}

export interface DashboardReport {
  period: DashboardReportPeriod;
  sales: { orders: number; total: number };
  profit: {
    revenue: number;
    costOfGoodsSold: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
  };
  balances: {
    cash: number;
    bank: number;
    mobileMoney: number;
    paystackClearing: number;
    accountsReceivable: number;
    accountsPayable: number;
  };
  paymentMethods: DashboardReportPaymentMethod[];
  lowStock: LowStockProduct[];
  recentTransactions: DashboardReportTransaction[];
}

export type ReportRange = "today" | "week" | "month" | "year";
export interface SaleListItem extends Omit<Sale, "items"> {
  cashier: { id: string; name: string };
}

export interface SaleDetail extends Sale {
  cashier: { id: string; name: string };
}
export type StaffRole =
  | "OWNER"
  | "MANAGER"
  | "CASHIER"
  | "INVENTORY_OFFICER"
  | "ACCOUNTANT"
  | "KITCHEN_STAFF";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  isActive: boolean;
  extraPermissions: string[];
  revokedPermissions: string[];
  createdAt: string;
}

export interface PermissionCatalogue {
  permissions: Record<string, string>; // key -> description
  roleDefaults: Record<string, string[]>;
}

export interface StaffPermissionDetail {
  user: { id: string; name: string; role: StaffRole };
  roleDefaults: string[];
  granted: string[];
  revoked: string[];
  effective: string[];
}
export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string; email: string; role: string } | null;
}

export interface AuditLogResponse {
  total: number;
  page: number;
  limit: number;
  logs: AuditLogEntry[];
}
export type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "NEEDS_CLEANING";
export type KitchenStatus = "NEW" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";

export interface RestaurantTable {
  id: string;
  name: string;
  capacity: number | null;
  status: TableStatus;
  isActive: boolean;
}

export interface KitchenOrderItem {
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

export interface RestaurantOrder {
  id: string;
  tableId: string | null;
  table: RestaurantTable | null;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  notes: string | null;
  items: KitchenOrderItem[];
  createdAt: string;
}
export interface SaleListItem extends Omit<Sale, "items"> {
  cashier: { id: string; name: string };
}

export interface SaleDetail extends Sale {
  cashier: { id: string; name: string };
}