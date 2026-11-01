"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleAlert, CircleCheck } from "lucide-react";
import PasswordField from "@/components/PasswordField";
import { resetPassword } from "@/lib/api/account";
import { ApiError } from "@/lib/apiClient";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setIsSaving(true);
    try {
      await resetPassword({ token, newPassword: password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset password.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-sm text-danger">This reset link is missing its token.</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-brand-orange">
          Back to login
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <CircleCheck className="mx-auto text-success" size={40} />
        <h2 className="mt-3 text-lg font-bold text-primary-navy">Password updated</h2>
        <p className="mt-1 text-sm text-gray-600">You can now log in with your new password.</p>
        <Link
          href="/login"
          className="mt-5 inline-block rounded-lg bg-brand-orange px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PasswordField id="new" label="New password" value={password} onChange={setPassword} autoComplete="new-password" hint="At least 8 characters." />
      <PasswordField id="confirm" label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      {error && (
        <p className="flex items-start gap-2 text-sm text-danger">
          <CircleAlert size={16} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isSaving}
        className="w-full rounded-lg bg-brand-orange py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {isSaving ? "Saving…" : "Reset password"}
      </button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-gray-600 hover:text-primary-navy">
          Back to login
        </Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-app-background p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h1 className="mb-1 text-xl font-bold text-primary-navy">Reset your password</h1>
        <p className="mb-5 text-sm text-gray-600">Choose a new password for your SalesPoint account.</p>
        <Suspense fallback={<p className="text-sm text-gray-500">Loading…</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </main>
  );
}
