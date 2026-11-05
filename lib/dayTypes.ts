// Types for Day End (open/close + cash-up) and Sales Mix.
// Kept in their own file so adding this feature never touches lib/types.ts.

export type CountedMethod = "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER" | "OTHER";
export type MethodTotals = Record<CountedMethod | "PAYSTACK", number>;
export type VarianceKind = "BALANCED" | "OVER" | "SHORT";

export interface ExpectedRow {
  method: CountedMethod;
  openingFloat: number;
  sales: number;
  paidOut: number;
  expected: number;
}

export interface ReconciledRow extends ExpectedRow {
  counted: number;
  variance: number;
  kind: VarianceKind;
}

export interface CashierFigures {
  cashierId: string;
  name: string;
  orders: number;
  totals: MethodTotals;
}

export type Denominations = Record<string, number>;

export interface BusinessDayInfo {
  id: string;
  number: number;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  openedBy: string;
  openingFloat: number;
  openNotes: string | null;
  openDenominations: Denominations | null;
  closeDenominations: Denominations | null;
  closedAt: string | null;
  closedBy: string | null;
  closeNotes: string | null;
  totalExpected: number | null;
  totalCounted: number | null;
  totalVariance: number | null;
}

export interface CurrentDayResponse {
  day: BusinessDayInfo | null;
  requireOpenDay: boolean;
  // when no day is open
  suggestedFloat?: number;
  lastClosed?: { id: string; closedAt: string | null; totalVariance: number | null } | null;
  // when a day is open
  asOf?: string;
  openTabs?: number;
  mine?: CashierFigures;
  // only for people who can close the day
  orders?: number;
  expected?: ExpectedRow[];
  paystack?: number;
  byCashier?: CashierFigures[];
}

export interface CloseDayResponse {
  day: BusinessDayInfo;
  rows: ReconciledRow[];
  balanced: boolean;
  paystack: number;
  orders: number;
}

export interface DayCountRow {
  method: CountedMethod;
  expected: number;
  counted: number;
  variance: number;
  posted: boolean;
}

export interface DayDetailResponse {
  day: BusinessDayInfo;
  counts: DayCountRow[];
  orders: number;
  paystack: number;
  byCashier: CashierFigures[];
}

export interface SalesMixProduct {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  quantitySharePct: number;
  revenueSharePct: number;
}

export interface SalesMixCategory {
  category: string;
  quantity: number;
  revenue: number;
  revenueSharePct: number;
}

export interface SalesMixResponse {
  period: { label: string; from: string; to: string };
  orders: number;
  totals: { itemsSold: number; revenue: number; cost: number; profit: number; distinctProducts: number };
  products: SalesMixProduct[];
  categories: SalesMixCategory[];
}

export type MixRange = "today" | "week" | "month" | "year" | "custom";

export const METHOD_LABELS: Record<CountedMethod | "PAYSTACK", string> = {
  CASH: "Cash",
  MOBILE_MONEY: "Mobile Money",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Other",
  PAYSTACK: "Paystack",
};
