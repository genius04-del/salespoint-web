"use client";

import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getBusiness } from "@/lib/api/business";
import { listStockCounts, startStockCount } from "@/lib/api/stockCounts";
import type { StockCountSummary } from "@/lib/stockTypes";
import { CountSheet } from "@/components/kitchen/CountSheet";
import { StatusBadge } from "@/components/kitchen/StatusBadge";
import { inputClass, primaryBtn } from "@/components/kitchen/Modal";
import { cedi, errMsg, when } from "@/components/kitchen/format";

export default function DailyStockPage() {
  const { hasPermission } = useAuth();
  const canCount = hasPermission("stock.count");

  const [counts, setCounts] = useState<StockCountSummary[]>([]);
  const [restaurant, setRestaurant] = useState(false);
  const [scope, setScope] = useState<"ALL" | "INGREDIENTS" | "PRODUCTS">("ALL");
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, biz] = await Promise.all([listStockCounts(), getBusiness()]);
        if (cancelled) return;
        setCounts(list.counts);
        setRestaurant(biz.business.restaurantModeEnabled);
        setError("");
      } catch (e) {
        if (!cancelled) setError(errMsg(e, "Could not load stock counts"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const draft = counts.find((c) => c.status === "DRAFT");

  async function start() {
    setBusy(true);
    setError("");
    try {
      const { count } = await startStockCount(restaurant ? scope : "PRODUCTS");
      setOpenId(count.id);
    } catch (e) {
      setError(errMsg(e, "Could not start the count"));
    } finally {
      setBusy(false);
    }
  }

  if (openId) {
    return (
      <CountSheet
        id={openId}
        onBack={() => {
          setOpenId(null);
          setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#071A2F]">Daily Stock</h1>
        <p className="text-sm text-gray-500">Count what is physically on the shelves, compare with the system, and have a manager approve the corrections.</p>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {canCount && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <span className="rounded-xl bg-[#FF6B00]/10 p-2.5 text-[#FF6B00]"><ClipboardList size={20} /></span>
          {draft ? (
            <>
              <div className="flex-1">
                <p className="font-semibold text-[#071A2F]">A count is in progress</p>
                <p className="text-sm text-gray-500">Started {when(draft.createdAt)} by {draft.countedByName ?? "staff"}</p>
              </div>
              <button onClick={() => setOpenId(draft.id)} className={primaryBtn}>Continue counting</button>
            </>
          ) : (
            <>
              <div className="flex-1">
                <p className="font-semibold text-[#071A2F]">Start today&apos;s count</p>
                <p className="text-sm text-gray-500">The system takes a snapshot of what it expects, so sales made while you count do not cause false differences.</p>
              </div>
              {restaurant && (
                <select className={`${inputClass} w-44`} value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
                  <option value="ALL">Everything</option>
                  <option value="INGREDIENTS">Ingredients only</option>
                  <option value="PRODUCTS">Products only</option>
                </select>
              )}
              <button onClick={start} disabled={busy} className={primaryBtn}>{busy ? "Starting…" : "Start count"}</button>
            </>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-lg font-bold text-[#071A2F]">History</h2>
        {loading && <p className="text-gray-500">Loading…</p>}
        {!loading && counts.length === 0 && <p className="text-sm text-gray-500">No counts yet.</p>}
        {counts.length > 0 && (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Counted by</th>
                  <th className="px-4 py-3 text-right">Items</th>
                  <th className="px-4 py-3 text-right">Net difference</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {counts.map((c) => (
                  <tr key={c.id} onClick={() => setOpenId(c.id)} className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-[#071A2F]">{when(c.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-600">{c.countedByName ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{c._count.lines}</td>
                    <td className={`px-4 py-3 text-right font-medium ${c.totalVarianceValue && Number(c.totalVarianceValue) < 0 ? "text-red-600" : "text-gray-600"}`}>
                      {c.totalVarianceValue === null ? "—" : cedi(c.totalVarianceValue)}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
