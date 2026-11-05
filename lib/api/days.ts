import { apiFetch } from "@/lib/apiClient";
import type {
  BusinessDayInfo,
  CloseDayResponse,
  CountedMethod,
  CurrentDayResponse,
  DayDetailResponse,
  Denominations,
} from "@/lib/dayTypes";

export const getCurrentDay = () => apiFetch<CurrentDayResponse>("/days/current");

export const openDay = (body: { openingFloat: number; notes?: string; denominations?: Denominations }) =>
  apiFetch<{ day: BusinessDayInfo }>("/days/open", { method: "POST", body });

export const closeDay = (body: {
  counts: { method: CountedMethod; counted: number }[];
  notes?: string;
  acceptVariance: boolean;
  denominations?: Denominations;
}) => apiFetch<CloseDayResponse>("/days/close", { method: "POST", body });

export const listDays = () => apiFetch<{ days: BusinessDayInfo[] }>("/days?limit=30");

export const getDay = (id: string) => apiFetch<DayDetailResponse>(`/days/${id}`);

export const setRequireOpenDay = (requireOpenDay: boolean) =>
  apiFetch<{ requireOpenDay: boolean }>("/days/settings", { method: "PUT", body: { requireOpenDay } });
