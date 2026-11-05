"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { setAccessToken } from "@/lib/apiClient";
import { getGroupMe, switchBranch, type GroupMe } from "@/lib/api/groups";

// Shown to the chain owner: which branch they are in, a way to jump to another,
// and the all-branches report. Everyone else sees nothing.
export function BranchSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const [me, setMe] = useState<GroupMe | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setMe(await getGroupMe());
      } catch {
        // No switcher if this can't load.
      }
    })();
  }, []);

  if (!me?.isGroupAdmin || !me.current) return null;

  async function change(id: string) {
    if (id === me?.current?.id) return;
    setBusy(true);
    try {
      const res = await switchBranch(id);
      setAccessToken(res.accessToken);
      // A full reload so every screen starts clean in the new branch.
      window.location.href = "/dashboard";
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="mx-3 mb-2 rounded-xl bg-white/10 p-3">
      <label className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/50">
        <Building2 size={12} /> Branch
      </label>
      <select
        value={me.current.id}
        disabled={busy}
        onChange={(e) => void change(e.target.value)}
        className="w-full rounded-lg bg-white px-2 py-1.5 text-sm font-medium text-[#071A2F] outline-none"
      >
        {me.branches.filter((b) => b.isActive).map((b) => (
          <option key={b.id} value={b.id}>{b.name}{b.branchType === "PRODUCTION" ? " (production)" : ""}</option>
        ))}
      </select>
      {me.current.branchType === "PRODUCTION" && <p className="mt-1 text-[11px] text-amber-300">Production branch. It does not sell.</p>}
      <Link href="/dashboard/group" onClick={onNavigate} className="mt-2 block text-xs font-medium text-brand-orange hover:underline">All branches report</Link>
    </div>
  );
}
