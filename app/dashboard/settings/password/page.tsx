"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import PasswordField from "@/components/PasswordField";
import { changePassword } from "@/lib/api/account";
import { ApiError } from "@/lib/apiClient";

export default function ChangePasswordPage() {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (password.length < 8) return setError("New password must be at least 8 characters.");
    if (password !== confirm) return setError("New passwords do not match.");
    if (password === current) return setError("New password must be different from the current one.");
    setIsSaving(true);
    try {
      const res = await changePassword({ currentPassword: current, newPassword: password });
      setSuccess(res.message);
      setCurrent("");
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change password.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <h2 className="text-lg font-bold text-primary-navy">Change password</h2>
      <p className="mb-5 mt-1 text-sm text-gray-600">
        You stay signed in here; your other devices will be signed out.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField id="current" label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
        <PasswordField id="new" label="New password" value={password} onChange={setPassword} autoComplete="new-password" hint="At least 8 characters." />
        <PasswordField id="confirm" label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        {error && (
          <p className="flex items-start gap-2 text-sm text-danger">
            <CircleAlert size={16} className="mt-0.5 shrink-0" /> {error}
          </p>
        )}
        {success && (
          <p className="flex items-start gap-2 text-sm text-success">
            <CircleCheck size={16} className="mt-0.5 shrink-0" /> {success}
          </p>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-brand-orange px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {isSaving ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
