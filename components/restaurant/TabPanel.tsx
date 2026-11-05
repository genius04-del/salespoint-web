"use client";

import { useState } from "react";
import { Banknote, Printer, X } from "lucide-react";
import type { Business, Sale } from "@/lib/types";
import type { DiningTable, KitchenStatus, Order } from "@/lib/restaurantTypes";
import { orderTotal } from "@/lib/restaurantTypes";
import { addOrderItems, cancelOrder, checkoutOrder, openOrder, setItemStatus, type NewOrderItem } from "@/lib/api/restaurant";
import { ReceiptModal } from "@/components/ReceiptModal";
import { Modal } from "@/components/kitchen/Modal";
import { errMsg } from "@/components/kitchen/format";
import { ItemPicker } from "./ItemPicker";

export const STATUS_STYLE: Record<KitchenStatus, string> = {
  NEW: "bg-blue-50 text-blue-700",
  PREPARING: "bg-amber-50 text-amber-700",
  READY: "bg-green-50 text-green-700",
  SERVED: "bg-gray-100 text-gray-500",
  CANCELLED: "bg-red-50 text-red-600 line-through",
};

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "MOBILE_MONEY", label: "Mobile money" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "OTHER", label: "Other" },
] as const;

const money = (n: number) => `GH₵ ${n.toFixed(2)}`;

type Mode = "view" | "add" | "pay" | "cancel" | "bill";

export function TabPanel({
  table,
  order,
  business,
  canCancel,
  canKitchen,
  onClose,
  onChanged,
}: {
  table: DiningTable | null; // null = takeaway
  order: Order | null;
  business: Business | null;
  canCancel: boolean;
  canKitchen: boolean;
  onClose: () => void;
  onChanged: (orderId?: string) => void;
}) {
  const [mode, setMode] = useState<Mode>(order ? "view" : "add");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]["value"]>("CASH");
  const [tendered, setTendered] = useState("");
  const [reason, setReason] = useState("");
  const [receipt, setReceipt] = useState<Sale | null>(null);

  const total = order ? orderTotal(order) : 0;
  const label = table ? table.name : "Takeaway";

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(errMsg(e, "Something went wrong"));
    } finally {
      setBusy(false);
    }
  }

  const send = (items: NewOrderItem[]) =>
    run(async () => {
      if (order) {
        await addOrderItems(order.id, items);
        onChanged();
      } else {
        const { order: created } = await openOrder({ tableId: table?.id, items });
        onChanged(created.id);
      }
      setMode("view");
    });

  const pay = () =>
    run(async () => {
      if (!order) return;
      const t = tendered.trim() === "" ? undefined : Number(tendered);
      if (method === "CASH" && t !== undefined && (!Number.isFinite(t) || t < total)) throw new Error("The cash given is less than the bill.");
      const { sale } = await checkoutOrder(order.id, { paymentMethod: method, amountTendered: method === "CASH" ? t : undefined });
      setReceipt(sale);
    });

  const cancel = () =>
    run(async () => {
      if (!order) return;
      if (!reason.trim()) throw new Error("Say why the order is cancelled.");
      await cancelOrder(order.id, reason.trim());
      onChanged();
      onClose();
    });

  const dropItem = (id: string) => run(async () => { await setItemStatus(id, "CANCELLED"); onChanged(); });

  if (receipt) {
    return (
      <ReceiptModal
        sale={receipt}
        business={business}
        title="Paid. Receipt"
        actionLabel="Done"
        onNewSale={() => { onChanged(); onClose(); }}
      />
    );
  }

  if (mode === "bill" && order) {
    const items = order.items.filter((i) => i.kitchenStatus !== "CANCELLED");
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 print:bg-white print:px-0">
        <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white shadow-lg print:max-h-none print:shadow-none">
          <div id="receipt-print-area" className="px-6 py-5 text-sm">
            <div className="mb-3 text-center">
              <p className="font-bold text-[#071A2F]">{business?.name ?? "SalesPoint"}</p>
              {business?.address && <p className="text-xs text-gray-500">{business.address}</p>}
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Bill, not a receipt</p>
            </div>
            <div className="mb-2 flex justify-between text-xs text-gray-500">
              <span>{label}</span>
              <span>{new Date().toLocaleString("en-GH")}</span>
            </div>
            <div className="space-y-1.5 border-y border-dashed border-gray-200 py-3">
              {items.map((i) => (
                <div key={i.id} className="flex justify-between gap-2">
                  <span className="text-gray-700">{i.quantity} × {i.productName}</span>
                  <span className="font-medium text-gray-800">{money(Number(i.unitPrice) * i.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between text-base font-bold text-[#071A2F]"><span>Total due</span><span>{money(total)}</span></div>
            <p className="mt-4 text-center text-xs text-gray-400">Thank you for dining with us!</p>
          </div>
          <div className="flex gap-3 border-t border-gray-100 px-6 py-4 print:hidden">
            <button onClick={() => window.print()} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700"><Printer size={16} /> Print</button>
            <button onClick={() => setMode("view")} className="flex-1 rounded-lg bg-[#FF6B00] px-4 py-2.5 font-semibold text-white">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Modal title={order ? `${label}: open tab` : `${label}: new order`} onClose={onClose} wide>
      {mode === "add" && (
        <ItemPicker busy={busy} error={error} onSend={send} onClose={() => (order ? setMode("view") : onClose())} />
      )}

      {mode !== "add" && order && (
        <div className="space-y-4">
          <div className="divide-y divide-gray-100 rounded-xl ring-1 ring-gray-100">
            {order.items.map((i) => (
              <div key={i.id} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className={i.kitchenStatus === "CANCELLED" ? "text-gray-400 line-through" : "text-[#071A2F]"}>{i.quantity} × {i.productName}</p>
                  {i.notes && <p className="text-xs text-gray-500">{i.notes}</p>}
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[i.kitchenStatus]}`}>{i.kitchenStatus.toLowerCase()}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-gray-700">{money(Number(i.unitPrice) * i.quantity)}</span>
                  {canKitchen && i.kitchenStatus !== "CANCELLED" && i.kitchenStatus !== "SERVED" && (
                    <button title="Remove this item" onClick={() => dropItem(i.id)} disabled={busy} className="rounded p-1 text-gray-400 hover:text-red-600"><X size={14} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-base font-bold text-[#071A2F]">
            <span>Total due</span>
            <span>{money(total)}</span>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}

          {mode === "view" && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setMode("add")} className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-[#071A2F]">Add items</button>
              <button onClick={() => setMode("bill")} className="flex items-center justify-center gap-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-[#071A2F]"><Printer size={14} /> Print bill</button>
              <button disabled={total <= 0} onClick={() => setMode("pay")} className="col-span-2 flex items-center justify-center gap-1 rounded-xl bg-[#FF6B00] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Banknote size={16} /> Take payment</button>
              {canCancel && (
                <button onClick={() => setMode("cancel")} className="col-span-2 text-sm text-red-600 hover:underline">Cancel this order</button>
              )}
            </div>
          )}

          {mode === "pay" && (
            <div className="space-y-3 rounded-xl bg-gray-50 p-3">
              <div className="grid grid-cols-2 gap-2">
                {METHODS.map((m) => (
                  <button key={m.value} onClick={() => setMethod(m.value)} className={`rounded-lg px-3 py-2 text-sm font-medium ${method === m.value ? "bg-[#071A2F] text-white" : "bg-white text-gray-700 ring-1 ring-gray-200"}`}>{m.label}</button>
                ))}
              </div>
              {method === "CASH" && (
                <div>
                  <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" inputMode="decimal" placeholder="Cash given (optional)" value={tendered} onChange={(e) => setTendered(e.target.value)} />
                  {Number(tendered) > total && <p className="mt-1 text-sm text-green-700">Change to give back: <b>{money(Number(tendered) - total)}</b></p>}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setMode("view")} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">Back</button>
                <button disabled={busy} onClick={pay} className="flex-1 rounded-lg bg-[#FF6B00] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : `Confirm ${money(total)}`}</button>
              </div>
            </div>
          )}

          {mode === "cancel" && (
            <div className="space-y-2 rounded-xl bg-red-50 p-3">
              <p className="text-sm text-red-700">This voids the whole tab and puts the stock back. Items already cooked are your loss.</p>
              <input className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm" placeholder="Why is it cancelled?" value={reason} onChange={(e) => setReason(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={() => setMode("view")} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">Back</button>
                <button disabled={busy} onClick={cancel} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Cancel the order</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
