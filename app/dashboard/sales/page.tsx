 "use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { listSales } from "@/lib/api/sales";
import { SaleDetailModal } from "@/components/SaleDetailModal";
import type { SaleListItem } from "@/lib/types";

const money = (n: number | string) =>
  `GH₵ ${Number(n).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SalesPage() {
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { sales } = await listSales({
          from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
          to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
        });
        if (!cancelled) setSales(sales);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load sales");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to, reloadKey]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter(
      (s) => s.receiptNumber.toLowerCase().includes(q) || s.cashier.name.toLowerCase().includes(q)
    );
  }, [sales, search]);

  const completedTotal = visible
    .filter((s) => s.status === "COMPLETED")
    .reduce((sum, s) => sum + Number(s.total), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#071A2F]">Sales</h1>
          <p className="text-sm text-gray-500">
            {visible.length} sale{visible.length === 1 ? "" : "s"} · {money(completedTotal)} completed
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Receipt or cashier"
              className="rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#FF6B00]"
            />
          </div>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            aria-label="From date"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            aria-label="To date"
          />
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Receipt</th>
              <th className="px-4 py-3">Date</th>
 <th className="px-4 py-3">Cashier</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  No sales found.
                </td>
              </tr>
            )}
            {!loading &&
              visible.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setOpenId(s.id)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-[#071A2F]">{s.receiptNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(s.createdAt).toLocaleString("en-GH")}</td>
                  <td className="px-4 py-3 text-gray-600">{s.cashier.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.paymentMethod.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-right font-medium">{money(s.total)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        s.status === "CANCELLED" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                      }`}
                    >
                      {s.status === "CANCELLED" ? "Cancelled" : "Completed"}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {openId && (
        <SaleDetailModal saleId={openId} onClose={() => setOpenId(null)} onChanged={refresh} />
      )}
    </div>
  );
}