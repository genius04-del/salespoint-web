import { apiFetch } from "@/lib/apiClient";
import type { CloseShiftResponse, CurrentShiftResponse, OpenableCashier, ShiftInfo, TillStaff } from "@/lib/shiftTypes";

export const getCurrentShift = () => apiFetch<CurrentShiftResponse>("/shifts/current");

export const openShift = (input: { openingFloat: number; pin?: string; takeOverFromShiftId?: string; notes?: string }) =>
  apiFetch<{ shift: ShiftInfo }>("/shifts/open", { method: "POST", body: input });

export const listOpenableCashiers = () => apiFetch<{ cashiers: OpenableCashier[] }>("/shifts/cashiers");

export const openShiftFor = (input: { userId: string; openingFloat: number; takeOverFromShiftId?: string; notes?: string }) =>
  apiFetch<{ shift: ShiftInfo }>("/shifts/open-for", { method: "POST", body: input });

export const closeShift = (input: { countedCash: number; notes?: string }) =>
  apiFetch<CloseShiftResponse>("/shifts/close", { method: "POST", body: input });

export const listShifts = () => apiFetch<{ shifts: ShiftInfo[] }>("/shifts");

export const setRequireShift = (requireShift: boolean) =>
  apiFetch<{ requireShift: boolean }>("/shifts/settings", { method: "PUT", body: { requireShift } });

// ---- Till access (manager) ----
export const getTillAccess = () => apiFetch<{ businessCode: string; staff: TillStaff[] }>("/till-access");

export const setStaffPin = (userId: string, pin: string) =>
  apiFetch<{ user: { id: string; name: string; staffNumber: number } }>(`/till-access/${userId}/pin`, { method: "PUT", body: { pin } });

export const removeStaffPin = (userId: string) => apiFetch<{ message: string }>(`/till-access/${userId}/pin`, { method: "DELETE" });

export const unlockStaffPin = (userId: string) => apiFetch<{ message: string }>(`/till-access/${userId}/unlock`, { method: "POST" });
