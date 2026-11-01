 "use client";

import { createElement, Fragment, useEffect, useState } from "react";
import { X, Printer, Ban } from "lucide-react";
import { cancelSale, getSale } from "@/lib/api/sales";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/lib/permissions";
import type { SaleDetail } from "@/lib/types";

const money = (n: number | string) =>
  `GH₵ ${Number(n).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function SaleDetailModal({
  saleId,
  onClose,
  onChanged,
}: {
  saleId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { hasPermission } = useAuth();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { sale } = await getSale(saleId);
        if (!cancelled) setSale(sale);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load sale");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [saleId]);

  async function handleCancel() {
    if (!reason.trim()) {
      setError("Please give a reason for cancelling.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { sale: updated } = await cancelSale(saleId, reason.trim());
      setSale((prev) => (prev ? { ...prev, ...updated } : prev));
      setCancelling(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel sale");
    } finally {
      setBusy(false);
    }
  }

  const canCancel =
    sale && sale.status === "COMPLETED" && hasPermission(PERMISSIONS.salesCancel);

  return createElement(
    "div",
    { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 print:bg-white print:px-0" },
    createElement(
      "div",
      { className: "max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-lg print:max-h-none print:shadow-none" },
      createElement(
        "div",
        { className: "flex items-center justify-between border-b border-gray-100 px-5 py-4 print:hidden" },
        createElement("h2", { className: "font-semibold text-[#071A2F]" }, "Sale Details"),
        createElement("button", { onClick: onClose, "aria-label": "Close", className: "rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" }, createElement(X, { size: 18 })),
      ),
      createElement(
        "div",
        { className: "space-y-4 px-5 py-5" },
        error && createElement("div", { className: "rounded-lg bg-red-50 p-3 text-sm text-red-700" }, error),
        !sale && !error && createElement("p", { className: "text-sm text-gray-500" }, "Loading…"),
        sale && createElement(
          Fragment,
          null,
          createElement(
            "div",
            { className: "text-center" },
            createElement("p", { className: "text-lg font-bold text-[#071A2F]" }, sale.receiptNumber),
            createElement("p", { className: "text-xs text-gray-500" }, `${new Date(sale.createdAt).toLocaleString("en-GH")} · Cashier: ${sale.cashier.name}`),
            createElement("span", { className: `mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-medium ${sale.status === "CANCELLED" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}` }, `${sale.status === "CANCELLED" ? "Cancelled" : "Completed"} · ${sale.paymentStatus}`),
          ),
          createElement(
            "ul",
            { className: "divide-y divide-dashed divide-gray-200 border-y border-dashed border-gray-200" },
            ...sale.items.map((i) => createElement(
              "li",
              { key: i.id, className: "flex justify-between py-2 text-sm" },
              createElement(
                "div",
                null,
                createElement("p", { className: "text-gray-800" }, i.productName),
                createElement("p", { className: "text-xs text-gray-500" }, `${i.quantity} × ${money(i.unitPrice)}${Number(i.discount) > 0 ? ` (−${money(i.discount)})` : ""}`),
              ),
              createElement("span", { className: "font-medium" }, money(i.lineTotal)),
            )),
          ),
          createElement(
            "dl",
            { className: "space-y-1 text-sm" },
            createElement("div", { className: "flex justify-between text-gray-600" }, createElement("dt", null, "Subtotal"), createElement("dd", null, money(sale.subtotal))),
            Number(sale.discountTotal) > 0 && createElement("div", { className: "flex justify-between text-gray-600" }, createElement("dt", null, "Discount"), createElement("dd", null, `−${money(sale.discountTotal)}`)),
            createElement("div", { className: "flex justify-between text-base font-bold text-[#071A2F]" }, createElement("dt", null, "Total"), createElement("dd", null, money(sale.total))),
            createElement("div", { className: "flex justify-between text-gray-600" }, createElement("dt", null, "Paid by"), createElement("dd", null, sale.paymentMethod.replace(/_/g, " "))),
            sale.amountTendered && createElement("div", { className: "flex justify-between text-gray-600" }, createElement("dt", null, "Tendered / Change"), createElement("dd", null, `${money(sale.amountTendered)} / ${money(sale.changeGiven ?? 0)}`)),
          ),
          sale.notes && createElement("p", { className: "text-xs text-gray-500" }, `Note: ${sale.notes}`),
          cancelling && createElement(
            "div",
            { className: "space-y-2 rounded-xl bg-red-50 p-3 print:hidden" },
            createElement("p", { className: "text-sm text-red-800" }, `This restores stock and reverses the accounting entries${sale.paymentMethod === "PAYSTACK" ? ", and refunds the customer through Paystack" : ""}.`),
            createElement("input", { value: reason, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value), placeholder: "Reason for cancelling", className: "w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400" }),
            createElement(
              "div",
              { className: "flex gap-2" },
              createElement("button", { onClick: handleCancel, disabled: busy, className: "flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50" }, busy ? "Cancelling…" : "Confirm cancel"),
              createElement("button", { onClick: () => setCancelling(false), disabled: busy, className: "rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-white" }, "Keep sale"),
            ),
          ),
          createElement(
            "div",
            { className: "flex gap-2 print:hidden" },
            createElement("button", { onClick: () => window.print(), className: "flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-[#071A2F] hover:bg-gray-50" }, createElement(Printer, { size: 16 }), " Print"),
            canCancel && !cancelling && createElement("button", { onClick: () => setCancelling(true), className: "flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50" }, createElement(Ban, { size: 16 }), " Cancel sale"),
          ),
        ),
      ),
    ),
  );
}