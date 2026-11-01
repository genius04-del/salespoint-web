"use client";

import { useEffect, useState } from "react";
import { X, Receipt } from "lucide-react";
import type { CustomerDetail } from "@/lib/types";
import { getCustomer } from "@/lib/api/customers";
import { ApiError } from "@/lib/apiClient";

export function CustomerDetailModal({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCustomer(customerId)
      .then((res) => setCustomer(res.customer))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load customer."));
  }, [customerId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-navy">{customer?.name ?? "Customer"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {customer && (
          <>
            <div className="mb-5 space-y-1 text-sm text-gray-600">
              {customer.phone && <p>📞 {customer.phone}</p>}
              {customer.email && <p>✉️ {customer.email}</p>}
              {customer.address && <p>📍 {customer.address}</p>}
              {customer.notes && <p className="italic text-gray-500">{customer.notes}</p>}
            </div>

            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary-navy">
              <Receipt size={16} />
              Purchase History
            </h3>
            {customer.sales.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No sales recorded yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {customer.sales.map((sale) => (
                  <li key={sale.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{sale.receiptNumber}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(sale.createdAt).toLocaleDateString("en-GH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-primary-navy">GHS {Number(sale.total).toFixed(2)}</p>
                      {sale.status === "CANCELLED" && (
                        <span className="text-xs text-danger">Cancelled</span>
                      )}
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
