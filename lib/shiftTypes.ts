export type PayTotals = { CASH: number; MOBILE_MONEY: number; BANK_TRANSFER: number; OTHER: number; PAYSTACK: number };

export interface ShiftInfo {
  id: string;
  userId: string;
  userName: string | null;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  openingFloat: number | null;
  openNotes: string | null;
  openedById: string | null;
  openedByName: string | null;
  takeOverFromId: string | null;
  handoverDifference: number | null;
  closedAt: string | null;
  expectedCash: number | null;
  countedCash: number | null;
  variance: number | null;
  closeNotes: string | null;
  salesCount: number | null;
  salesTotal: number | null;
}

export interface CurrentShiftResponse {
  requireShift: boolean;
  pin: { required: boolean; set: boolean };
  shift: ShiftInfo | null;
  live: { asOf: string; salesCount: number; salesTotal: number; byMethod: PayTotals; expectedCash: number } | null;
  handovers: { id: string; userName: string | null; closedAt: string; countedCash: number | null }[];
}

export interface CloseShiftResponse {
  shift: ShiftInfo;
  kind: "BALANCED" | "OVER" | "SHORT";
  byMethod: PayTotals;
}

export interface TillStaff {
  id: string;
  name: string;
  role: string;
  staffNumber: number | null;
  hasPin: boolean;
  locked: boolean;
}

export interface OpenableCashier {
  id: string;
  name: string;
  hasPin: boolean;
  hasOpenShift: boolean;
}
