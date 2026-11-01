import { apiFetch } from "@/lib/apiClient";
import type {
  PermissionCatalogue,
  StaffMember,
  StaffPermissionDetail,
  StaffRole,
} from "@/lib/types";

export const listStaff = () => apiFetch<{ staff: StaffMember[] }>("/staff");

export const createStaff = (body: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: StaffRole;
}) => apiFetch("/staff", { method: "POST", body });

export const updateStaff = (
  id: string,
  body: { role?: StaffRole; isActive?: boolean; name?: string; phone?: string }
) => apiFetch(`/staff/${id}`, { method: "PATCH", body });

export const getPermissionCatalogue = () =>
  apiFetch<PermissionCatalogue>("/staff/permissions");

export const getStaffPermissions = (id: string) =>
  apiFetch<StaffPermissionDetail>(`/staff/${id}/permissions`);

export const saveStaffPermissions = (
  id: string,
  body: { grant: string[]; revoke: string[] }
) => apiFetch(`/staff/${id}/permissions`, { method: "PUT", body });