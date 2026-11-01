"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createStaff } from "@/lib/api/staff";
import type { StaffRole } from "@/lib/types";

export const ROLE_LABELS: Record<StaffRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  CASHIER: "Cashier",
  INVENTORY_OFFICER: "Inventory Officer",
  ACCOUNTANT: "Accountant",
  KITCHEN_STAFF: "Kitchen Staff",
};

export function StaffFormModal({
  isOwner,
  onClose,
  onSaved,
}: {
  isOwner: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("CASHIER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const roles = (Object.keys(ROLE_LABELS) as StaffRole[]).filter(
    (r) => isOwner || r !== "OWNER"
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createStaff({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        role,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add staff member");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF6B00]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[#071A2F]">Add Staff Member</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <input className={input} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        <input className={input} type="email" placeholder="Email (used to log in)" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={input} placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className={input} type="password" placeholder="Temporary password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        <select className={input} value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
          {roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[#FF6B00] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add staff member"}
        </button>
      </form>
    </div>
  );
}