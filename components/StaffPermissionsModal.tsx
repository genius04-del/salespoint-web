 "use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  getPermissionCatalogue,
  getStaffPermissions,
  saveStaffPermissions,
} from "@/lib/api/staff";
import type { PermissionCatalogue, StaffMember, StaffPermissionDetail } from "@/lib/types";

export function StaffPermissionsModal({
  member,
  onClose,
  onSaved,
}: {
  member: StaffMember;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [catalogue, setCatalogue] = useState<PermissionCatalogue | null>(null);
  const [detail, setDetail] = useState<StaffPermissionDetail | null>(null);
  const [allowed, setAllowed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cat, det] = await Promise.all([
          getPermissionCatalogue(),
          getStaffPermissions(member.id),
        ]);
        if (cancelled) return;
        setCatalogue(cat);
        setDetail(det);
        setAllowed(new Set(det.effective));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load permissions");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [member.id]);

  function toggle(key: string) {
    setAllowed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function save() {
    if (!catalogue || !detail) return;
    setBusy(true);
    setError("");
    const defaults = new Set(detail.roleDefaults);
    const keys = Object.keys(catalogue.permissions);
    const grant = keys.filter((k) => allowed.has(k) && !defaults.has(k));
    const revoke = keys.filter((k) => !allowed.has(k) && defaults.has(k));
    try {
      await saveStaffPermissions(member.id, { grant, revoke });
      setNote("Saved. Takes effect next time they log in (or within 15 minutes).");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save permissions");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-lg">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <div>
            <h2 className="font-semibold text-[#071A2F]">Permissions: {member.name}</h2>
            <p className="text-xs text-gray-500">
              Ticked = allowed. Starts from the {member.role.replace(/_/g, " ").toLowerCase()} role.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2 px-5 py-4">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {note && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{note}</div>}
          {!catalogue && !error && <p className="text-sm text-gray-500">Loading…</p>}

          {catalogue &&
            detail &&
            Object.entries(catalogue.permissions).map(([key, desc]) => {
              const isDefault = detail.roleDefaults.includes(key);
              const on = allowed.has(key);
              const changed = on !== isDefault;
              return (
                <label
                  key={key}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 ${
                    changed ? "bg-orange-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(key)}
                    className="mt-1 h-4 w-4 accent-[#FF6B00]"
                  />
                  <span className="text-sm">
                    <span className="font-medium text-[#071A2F]">{key}</span>
                    {changed && (
                      <span className="ml-2 text-xs text-[#FF6B00]">
                        {on ? "extra" : "removed"}
                      </span>
                    )}
                    <span className="block text-xs text-gray-500">{desc}</span>
                  </span>
                </label>
              );
            })}
        </div>

        <div className="sticky bottom-0 border-t border-gray-100 bg-white px-5 py-4">
          <button
            onClick={save}
            disabled={busy || !catalogue}
            className="w-full rounded-lg bg-[#FF6B00] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save permissions"}
          </button>
        </div>
      </div>
    </div>
  );
}