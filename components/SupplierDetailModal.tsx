"use client";

import { useEffect, useState } from "react";
import { X, Truck } from "lucide-react";
import type { SupplierDetail } from "@/lib/types";
import { getSupplier } from "@/lib/api/suppliers";
import { ApiError } from "@/lib/apiClient";

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-success/10 text-success",
  PARTIAL: "bg-warning/10 text-warning",
  UNPAID: "bg-danger/10 text-danger",
};

export function SupplierDetailModal({ supplierId, onClose }: { supplierId: string; onClose: () => void }) {
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSupplier(supplierId)
      .then((res) => setSupplier(res.supplier))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load supplier."));
  }, [supplierId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-navy">{supplier?.name ?? "Supplier"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {supplier && (
          <>
            <div className="mb-5 space-y-1 text-sm text-gray-600">
              {supplier.phone && <p>📞 {supplier.phone}</p>}
              {supplier.email && <p>✉️ {supplier.email}</p>}
              {supplier.address && <p>📍 {supplier.address}</p>}
            </div>

            <div
              className={`mb-5 rounded-lg px-4 py-3 ${
                supplier.outstandingBalance > 0 ? "bg-danger/10" : "bg-success/10"
              }`}
            >
              <p className="text-xs text-gray-500">Outstanding balance</p>
              <p
                className={`text-xl font-bold ${
                  supplier.outstandingBalance > 0 ? "text-danger" : "text-success"
                }`}
              >
                GHS {supplier.outstandingBalance.toFixed(2)}
              </p>
            </div>

            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary-navy">
              <Truck size={16} />
              Purchase History
            </h3>
            {supplier.purchases.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No purchases recorded yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {supplier.purchases.map((purchase) => (
                  <li key={purchase.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">
                        {new Date(purchase.createdAt).toLocaleDateString("en-GH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[purchase.paymentStatus]
                        }`}
                      >
                        {purchase.paymentStatus}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-primary-navy">
                        GHS {Number(purchase.totalCost).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Paid GHS {Number(purchase.amountPaid).toFixed(2)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
