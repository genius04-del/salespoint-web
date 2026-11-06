import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Warehouse,
  Truck,
  Users,
  Handshake,
  Landmark,
  BarChart3,
  ChefHat,
  UtensilsCrossed,
  IdCard,
  History,
  Settings,
  ClipboardCheck,
  PieChart,
  Soup,
  Scale,
  Hash,
  KeyRound,
  BookOpen,
  HandCoins,
  PackageCheck,
} from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions";

export interface NavItem {
  title: string;
  icon: LucideIcon;
  permission: string | null;
  href?: string;
  restaurantOnly?: boolean; // hidden unless the business has restaurant mode on
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, permission: PERMISSIONS.reportsView, href: "/dashboard" },
  { title: "POS", icon: ShoppingCart, permission: PERMISSIONS.salesCreate, href: "/dashboard/pos" },
  { title: "Sales", icon: Receipt, permission: PERMISSIONS.salesView, href: "/dashboard/sales" },
  { title: "Products", icon: Package, permission: PERMISSIONS.productsManage, href: "/dashboard/products" },
  { title: "Inventory", icon: Warehouse, permission: PERMISSIONS.inventoryView, href: "/dashboard/inventory" },
  { title: "Purchases", icon: Truck, permission: PERMISSIONS.purchasesView, href: "/dashboard/purchases" },
  { title: "Customers", icon: Users, permission: PERMISSIONS.customersManage, href: "/dashboard/customers" },
  { title: "Suppliers", icon: Handshake, permission: PERMISSIONS.suppliersView, href: "/dashboard/suppliers" },
  { title: "Day End", icon: ClipboardCheck, permission: "day.view", href: "/dashboard/day" },
  { title: "Sales Mix", icon: PieChart, permission: "reports.view", href: "/dashboard/sales-mix" },
  { title: "Finance", icon: Landmark, permission: PERMISSIONS.financeView, href: "/dashboard/finance" },
  { title: "Reports", icon: BarChart3, permission: PERMISSIONS.reportsView, href: "/dashboard/reports" },
  { title: "Kitchen", icon: ChefHat, permission: PERMISSIONS.kitchenManage, href: "/dashboard/kitchen", restaurantOnly: true },
  { title: "Tables", icon: UtensilsCrossed, permission: PERMISSIONS.salesCreate, href: "/dashboard/tables", restaurantOnly: true },
  { title: "Staff", icon: IdCard, permission: PERMISSIONS.staffManage, href: "/dashboard/staff" },
  { title: "Restaurant Mode", icon: UtensilsCrossed, permission: PERMISSIONS.staffManage, href: "/dashboard/settings/restaurant" },
  { title: "Audit Log", icon: History, permission: PERMISSIONS.auditView, href: "/dashboard/audit" },
  { title: "Settings", icon: Settings, permission: null, href: "/dashboard/settings/paystack" },
  { title: "Kitchen Stock", icon: Soup, permission: "stock.view", href: "/dashboard/kitchen-stock/production", restaurantOnly: true },
{ title: "Daily Stock", icon: ClipboardCheck, permission: "stock.view", href: "/dashboard/stock-count" },
{ title: "Stock Variance", icon: Scale, permission: "stock.view", href: "/dashboard/stock-variance" },
{ title: "My Shift", icon: Hash, permission: "shift.use", href: "/dashboard/shift" },
{ title: "Till Access", icon: KeyRound, permission: "staff.manage", href: "/dashboard/till-access" },
{ title: "Recipes", icon: BookOpen, permission: "stock.view", href: "/dashboard/recipes" },
{ title: "Finance Posting", icon: HandCoins, permission: "day.close", href: "/dashboard/finance-posting" },
{ title: "Deduct Sales", icon: Scale, permission: "stock.manage", href: "/dashboard/stock-deduction" },
{ title: "Stock Adjustment", icon: PackageCheck, permission: "stock.manage", href: "/dashboard/stock-adjustment" },
];
