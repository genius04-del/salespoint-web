import { apiFetch } from "@/lib/apiClient";

export type BranchType = "OUTLET" | "PRODUCTION";

export interface Branch {
  id: string;
  name: string;
  branchType: BranchType;
  isActive: boolean;
}

export interface GroupMe {
  current: { id: string; name: string; branchType: BranchType; inGroup: boolean } | null;
  isGroupAdmin: boolean;
  group: { id: string; name: string } | null;
  branches: Branch[];
  canEnable: boolean;
}

export interface GroupReportRow {
  id: string;
  name: string;
  branchType: BranchType;
  sales: number;
  total: number;
  byMethod: Record<string, number>;
  cancelled: number;
  dayOpen: { number: number; openedAt: string } | null;
  lastClosed: { number: number; closedAt: string | null; variance: number | null } | null;
}

export interface GroupReport {
  rows: GroupReportRow[];
  totals: { sales: number; total: number; byMethod: Record<string, number> };
}

export const getGroupMe = () => apiFetch<GroupMe>("/groups/me");
export const enableGroup = (name?: string) => apiFetch<{ group: { id: string; name: string } }>("/groups/enable", { method: "POST", body: { name } });
export const addBranch = (input: {
  name: string;
  branchType: BranchType;
  address?: string;
  copyMenu: boolean;
  manager?: { name: string; email: string; password: string };
}) => apiFetch<{ branch: Branch; manager: { name: string; email: string } | null; menu: { created: number; updated: number } | null }>("/groups/branches", { method: "POST", body: input });
export const syncMenu = (branchId: string) => apiFetch<{ menu: { created: number; updated: number } }>(`/groups/branches/${branchId}/sync-menu`, { method: "POST", body: {} });
export const switchBranch = (businessId: string) => apiFetch<{ accessToken: string }>("/groups/switch", { method: "POST", body: { businessId } });
export const getGroupReport = (from: string, to: string) => apiFetch<GroupReport>(`/groups/report?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
