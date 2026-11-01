"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Truck } from "lucide-react";
import type { Purchase, SupplierWithBalance } from "@/lib/types";
import { listPurchases } from "@/lib/api/purchases";
import { listSuppliers } from "@/lib/api/suppliers";
import { ApiError } from "@/lib/apiClient";

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-success/10 text-success",
  PARTIAL: "bg-warning/10 text-warning",
  UNPAID: "bg-danger/10 text-danger",
};

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierWithBalance[]>([]);
  const [supplierFilter, setSupplierFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPurchases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listPurchases({ supplierId: supplierFilter || undefined });
      setPurchases(res.purchases);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load purchases.");
    } finally {
      setIsLoading(false);
    }
  }, [supplierFilter]);

  useEffect(() => {
    listSuppliers()
      .then((res) => setSuppliers(res.suppliers))
      .catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      await loadPurchases();
    })();
  }, [loadPurchases]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-primary-navy">Purchases</h1>
        <Link
          href="/dashboard/purchases/new"
          className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-2 text-sm font-semibold text-white hover:bg-light-orange"
        >
          <Plus size={16} />
          Record Purchase
        </Link>
      </div>

      <select
        value={supplierFilter}
        onChange={(e) => setSupplierFilter(e.target.value)}
        className="mb-4 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
      >
        <option value="">All suppliers</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      {error && <div className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : purchases.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-white py-16 text-center ring-1 ring-black/5">
          <Truck size={32} className="text-gray-300" />
          <p className="text-gray-500">No purchases recorded yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <ul className="divide-y divide-gray-50">
            {purchases.map((purchase) => (
              <li key={purchase.id}>
                <Link
                  href={`/dashboard/purchases/${purchase.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-app-background"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-primary-navy">{purchase.supplier?.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(purchase.createdAt).toLocaleDateString("en-GH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[purchase.paymentStatus]}`}
                  >
                    {purchase.paymentStatus}
                  </span>
                  <p className="w-24 shrink-0 text-right font-medium text-primary-navy">
                    GHS {Number(purchase.totalCost).toFixed(2)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
