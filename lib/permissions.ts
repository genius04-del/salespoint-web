/**
 * Mirrors src/services/permissions.ts on the backend exactly — every string
 * here must match a real backend permission key. These only decide what the
 * UI shows; the backend is the actual authority and re-checks every call
 * regardless of what this file lets through.
 */
export const PERMISSIONS = {
  salesCreate: "sales.create",
  salesView: "sales.view",
  salesCancel: "sales.cancel",
  productsManage: "products.manage",
  inventoryView: "inventory.view",
  inventoryManage: "inventory.manage",
  customersManage: "customers.manage",
  suppliersView: "suppliers.view",
  suppliersManage: "suppliers.manage",
  purchasesView: "purchases.view",
  purchasesManage: "purchases.manage",
  purchasesPay: "purchases.pay",
  expensesManage: "expenses.manage",
  financeView: "finance.view",
  accountsManage: "accounts.manage",
  reportsView: "reports.view",
  reportsStock: "reports.stock",
  staffManage: "staff.manage",
  auditView: "audit.view",
  tablesManage: "tables.manage",
  kitchenManage: "kitchen.manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
