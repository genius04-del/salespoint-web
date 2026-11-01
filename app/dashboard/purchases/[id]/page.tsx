"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import type { Purchase } from "@/lib/types";
import { getPurchase } from "@/lib/api/purchases";
import { ApiError } from "@/lib/apiClient";
import { RecordPurchasePaymentModal } from "@/components/RecordPurchasePaymentModal";

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-success/10 text-success",
  PARTIAL: "bg-warning/10 text-warning",
  UNPAID: "bg-danger/10 text-danger",
};

// Next.js 16: a Client Component page's dynamic segment arrives as a
// Promise — unwrapped here with React's use() hook (see
// node_modules/next/dist/docs/.../dynamic-routes.md for why).
export default function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getPurchase(id);
      setPurchase(res.purchase);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this purchase.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const outstanding = purchase ? Number(purchase.totalCost) - Number(purchase.amountPaid) : 0;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard/purchases"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} />
        Back to Purchases
      </Link>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : error ? (
        <p className="py-8 text-center text-danger">{error}</p>
      ) : purchase ? (
        <>
          <div className="mb-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h1 className="text-lg font-bold text-primary-navy">{purchase.supplier?.name}</h1>
                <p className="text-xs text-gray-400">
                  {new Date(purchase.createdAt).toLocaleDateString("en-GH", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[purchase.paymentStatus]}`}>
                {purchase.paymentStatus}
              </span>
            </div>

            <ul className="mb-4 divide-y divide-gray-100 border-y border-gray-100">
              {purchase.items.map((item) => (
                <li key={item.id} className="flex justify-between py-2.5 text-sm">
                  <span className="text-gray-700">
                    {item.quantity} × {item.productName} @ GHS {Number(item.costPrice).toFixed(2)}
                  </span>
                  <span className="font-medium text-gray-800">GHS {Number(item.lineTotal).toFixed(2)}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Total</span>
                <span>GHS {Number(purchase.totalCost).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Paid</span>
                <span>GHS {Number(purchase.amountPaid).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-primary-navy">
                <span>Outstanding</span>
                <span>GHS {outstanding.toFixed(2)}</span>
              </div>
            </div>

            {purchase.notes && <p className="mt-4 text-sm italic text-gray-500">{purchase.notes}</p>}
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-primary-navy">Payments</h2>
              {outstanding > 0 && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="flex items-center gap-1 text-sm font-medium text-brand-orange hover:underline"
                >
                  <Plus size={14} />
                  Record Payment
                </button>
              )}
            </div>

            {purchase.payments.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">No payments recorded yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {purchase.payments.map((payment) => (
                  <li key={payment.id} className="flex justify-between py-2.5 text-sm">
                    <div>
                      <p className="text-gray-700">{payment.method.replace("_", " ")}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(payment.createdAt).toLocaleDateString("en-GH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <span className="font-medium text-success">GHS {Number(payment.amount).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}

      {showPaymentModal && purchase && (
        <RecordPurchasePaymentModal
          purchaseId={purchase.id}
          outstanding={outstanding}
          onClose={() => setShowPaymentModal(false)}
          onRecorded={load}
        />
      )}
    </div>
  );
}
