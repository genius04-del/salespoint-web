 "use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus, ShieldCheck } from "lucide-react";
import { listStaff, updateStaff } from "@/lib/api/staff";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS, StaffFormModal } from "@/components/StaffFormModal";
import { StaffPermissionsModal } from "@/components/StaffPermissionsModal";
import type { StaffMember, StaffRole } from "@/lib/types";

export default function StaffPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { staff } = await listStaff();
        if (!cancelled) setStaff(staff);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load staff");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  async function change(id: string, body: { role?: StaffRole; isActive?: boolean }) {
    setError("");
    try {
      await updateStaff(id, body);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#071A2F]">Staff</h1>
          <p className="text-sm text-gray-500">{staff.length} team member{staff.length === 1 ? "" : "s"}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-[#FF6B00] px-4 py-2 text-sm font-semibold text-white"
        >
          <UserPlus size={16} /> Add staff
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">Loading…</td></tr>
            )}
            {!loading &&
              staff.map((m) => {
                const isSelf = m.id === user?.id;
                const locked = m.role === "OWNER" && !isOwner;
                return (
                  <tr key={m.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#071A2F]">
                        {m.name} {isSelf && <span className="text-xs text-gray-400">(you)</span>}
                      </p>
                      <p className="text-xs text-gray-500">{m.email}{m.phone ? ` · ${m.phone}` : ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={m.role}
                        disabled={isSelf || locked}
                        onChange={(e) => change(m.id, { role: e.target.value as StaffRole })}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        {(Object.keys(ROLE_LABELS) as StaffRole[])
                          .filter((r) => isOwner || r !== "OWNER")
                          .map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        {!isOwner && m.role === "OWNER" && <option value="OWNER">Owner</option>}
                      </select>
                      {(m.extraPermissions.length > 0 || m.revokedPermissions.length > 0) && (
                        <span className="ml-2 text-xs text-[#FF6B00]">custom</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        m.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {m.isActive ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {isOwner && m.role !== "OWNER" && (
                          <button
                            onClick={() => setEditing(m)}
                            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-[#071A2F] hover:bg-gray-50"
                          >
                            <ShieldCheck size={14} /> Permissions
                          </button>
                        )}
                        {!isSelf && !locked && (
                          <button
                            onClick={() => change(m.id, { isActive: !m.isActive })}
                            className={m.isActive
                              ? "rounded-lg border px-2.5 py-1 text-xs font-medium border-red-200 text-red-600 hover:bg-red-50"
                              : "rounded-lg border px-2.5 py-1 text-xs font-medium border-green-200 text-green-700 hover:bg-green-50"}
                          >
                            {m.isActive ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <StaffFormModal isOwner={isOwner} onClose={() => setShowAdd(false)} onSaved={refresh} />
      )}
      {editing && (
        <StaffPermissionsModal member={editing} onClose={() => setEditing(null)} onSaved={refresh} />
      )}
    </div>
  );
}