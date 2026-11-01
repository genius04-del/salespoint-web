"use client";

import { useCallback, useEffect, useState } from "react";
import { PackagePlus, TriangleAlert, ArrowUp, ArrowDown } from "lucide-react";
import type { InventoryMovement, LowStockProduct, Product } from "@/lib/types";
import { listMovements, lowStock } from "@/lib/api/inventory";
import { listProducts } from "@/lib/api/products";
import { ApiError } from "@/lib/apiClient";
import { RecordAdjustmentModal } from "@/components/RecordAdjustmentModal";

const TYPE_STYLES: Record<string, string> = {
  OPENING_STOCK: "bg-primary-navy/10 text-primary-navy",
  PURCHASE: "bg-success/10 text-success",
  SALE: "bg-preparing/10 text-preparing",
  RETURN: "bg-success/10 text-success",
  ADJUSTMENT: "bg-warning/10 text-warning",
  DAMAGE: "bg-danger/10 text-danger",
  TRANSFER: "bg-gray-100 text-gray-600",
};

export default function InventoryPage() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [movementsRes, lowStockRes, productsRes] = await Promise.all([
        listMovements(),
        lowStock(),
        listProducts(),
      ]);
      setMovements(movementsRes.movements);
      setLowStockProducts(lowStockRes.products);
      setProducts(productsRes.products);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load inventory data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // See the matching comment in app/dashboard/products/page.tsx for why
    // this is wrapped in an IIFE rather than calling loadAll() directly.
    (async () => {
      await loadAll();
    })();
  }, [loadAll]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-primary-navy">Inventory</h1>
        <button
          onClick={() => setShowAdjustmentModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-2 text-sm font-semibold text-white hover:bg-light-orange"
        >
          <PackagePlus size={16} />
          Record Adjustment
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : (
        <>
          {lowStockProducts.length > 0 && (
            <div className="mb-6 rounded-xl border border-warning/30 bg-warning/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-warning">
                <TriangleAlert size={18} />
                <h2 className="font-semibold">Low Stock ({lowStockProducts.length})</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {lowStockProducts.map((p) => (
                  <span
                    key={p.id}
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-warning/30"
                  >
                    {p.name} — {p.currentQuantity} left (min {p.minStockLevel})
                  </span>
                ))}
              </div>
            </div>
          )}

          <h2 className="mb-3 font-semibold text-primary-navy">Recent Stock Movements</h2>
          {movements.length === 0 ? (
            <div className="rounded-xl bg-white py-12 text-center text-gray-400 ring-1 ring-black/5">
              No stock movements recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/5">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium text-right">Change</th>
                    <th className="px-4 py-3 font-medium text-right">New Qty</th>
                    <th className="px-4 py-3 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {new Date(m.createdAt).toLocaleDateString("en-GH", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium text-primary-navy">{m.product.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            TYPE_STYLES[m.type] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {m.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center gap-0.5 font-medium ${
                            m.quantityChange >= 0 ? "text-success" : "text-danger"
                          }`}
                        >
                          {m.quantityChange >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                          {Math.abs(m.quantityChange)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{m.newQuantity}</td>
                      <td className="px-4 py-3 text-gray-500">{m.reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showAdjustmentModal && (
        <RecordAdjustmentModal
          products={products}
          onClose={() => setShowAdjustmentModal(false)}
          onRecorded={loadAll}
        />
      )}
    </div>
  );
}
