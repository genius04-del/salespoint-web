"use client";

import { CircleCheck, Printer, TriangleAlert } from "lucide-react";
import type { Business, Sale } from "@/lib/types";

interface ReceiptModalProps {
  sale: Sale;
  business: Business | null;
  warning?: string | null;
  onNewSale: () => void;
}

export function ReceiptModal({ sale, business, warning, onNewSale }: ReceiptModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 print:bg-white print:px-0">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white shadow-lg print:max-h-none print:shadow-none">
        <div className="flex flex-col items-center gap-2 border-b border-dashed border-gray-200 px-6 py-6 text-center print:hidden">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CircleCheck size={28} />
          </span>
          <p className="font-semibold text-primary-navy">Sale completed</p>
        </div>

        {warning && (
          <div className="mx-6 mt-4 flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning print:hidden">
            <TriangleAlert size={18} className="mt-0.5 shrink-0" />
            <span>{warning}</span>
          </div>
        )}

        <div id="receipt-print-area" className="px-6 py-5 text-sm">
          <div className="mb-4 text-center">
            <p className="font-bold text-primary-navy">{business?.name ?? "SalesPoint"}</p>
            {business?.address && <p className="text-xs text-gray-500">{business.address}</p>}
            {business?.phone && <p className="text-xs text-gray-500">{business.phone}</p>}
          </div>

          <div className="mb-3 flex justify-between text-xs text-gray-500">
            <span>Receipt {sale.receiptNumber}</span>
            <span>{new Date(sale.createdAt).toLocaleString("en-GH")}</span>
          </div>

          <div className="space-y-1.5 border-y border-dashed border-gray-200 py-3">
            {sale.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-2">
                <span className="text-gray-700">
                  {item.quantity} × {item.productName}
                </span>
                <span className="shrink-0 font-medium text-gray-800">
                  GHS {Number(item.lineTotal).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-1 text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>GHS {Number(sale.subtotal).toFixed(2)}</span>
            </div>
            {Number(sale.discountTotal) > 0 && (
              <div className="flex justify-between">
                <span>Discount</span>
                <span>− GHS {Number(sale.discountTotal).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-primary-navy">
              <span>Total</span>
              <span>GHS {Number(sale.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1 text-xs text-gray-500">
              <span>Paid via</span>
              <span>{sale.paymentMethod.replace("_", " ")}</span>
            </div>
            {sale.amountTendered && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Tendered</span>
                <span>GHS {Number(sale.amountTendered).toFixed(2)}</span>
              </div>
            )}
            {sale.changeGiven && Number(sale.changeGiven) > 0 && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Change</span>
                <span>GHS {Number(sale.changeGiven).toFixed(2)}</span>
              </div>
            )}
          </div>

          <p className="mt-5 text-center text-xs text-gray-400">Thank you for your business!</p>
        </div>

        <div className="flex gap-3 border-t border-gray-100 px-6 py-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700"
          >
            <Printer size={16} />
            Print
          </button>
          <button
            onClick={onNewSale}
            className="flex-1 rounded-lg bg-brand-orange px-4 py-2.5 font-semibold text-white hover:bg-light-orange"
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}
