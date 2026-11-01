 "use client";

import { useEffect, useMemo, useState } from "react";
import { X, Plus, Minus, ChefHat, Banknote } from "lucide-react";
import { listProducts } from "@/lib/api/products";
import {
  addOrderItems,
  cancelOrder,
  checkoutOrder,
  createOrder,
  getOrder,
} from "@/lib/api/restaurant";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/lib/permissions";
import type { Product, RestaurantOrder } from "@/lib/types";

const money = (n: number | string) =>
  `GH₵ ${Number(n).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type CartLine = { product: Product; quantity: number; notes: string };
type Method = "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER" | "OTHER";

const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-gray-100 text-gray-600",
  PREPARING: "bg-blue-50 text-blue-700",
  READY: "bg-green-50 text-green-700",
  SERVED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-600 line-through",
};

export function TableOrderModal({
  tableId,
  title,
  orderId,
  onClose,
  onChanged,
}: {
  tableId: string | null;
  title: string;
  orderId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { hasPermission } = useAuth();
  const [order, setOrder] = useState<RestaurantOrder | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState<Method>("CASH");
  const [tendered, setTendered] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { products } = await listProducts();
        if (!cancelled) setProducts(products.filter((p) => p.isActive));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load menu");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      try {
        const { order } = await getOrder(orderId);
        if (!cancelled) setOrder(order);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load order");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, reloadKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => p.currentQuantity > 0)
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .slice(0, 30);
  }, [products, search]);

  const billable = (order?.items ?? []).filter((i) => i.kitchenStatus !== "CANCELLED");
  const orderTotal = billable.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
  const isOpen = !order || order.status === "OPEN";

  function addToCart(p: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === p.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === p.id
            ? { ...l, quantity: Math.min(l.quantity + 1, p.currentQuantity) }
            : l
        );
      }
      return [...prev, { product: p, quantity: 1, notes: "" }];
    });
  }

  function changeQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product.id === id
            ? { ...l, quantity: Math.min(l.quantity + delta, l.product.currentQuantity) }
            : l
        )
        .filter((l) => l.quantity > 0)
    );
  }

  function setNotes(id: string, notes: string) {
    setCart((prev) => prev.map((l) => (l.product.id === id ? { ...l, notes } : l)));
  }
 async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const sendToKitchen = () =>
    run(async () => {
      const items = cart.map((l) => ({
        productId: l.product.id,
        quantity: l.quantity,
        notes: l.notes.trim() || undefined,
      }));
      if (order) {
        await addOrderItems(order.id, items);
        setCart([]);
        setReloadKey((k) => k + 1);
      } else {
        const { order: created } = await createOrder({ tableId: tableId ?? undefined, items });
        setOrder(created);
        setCart([]);
      }
      onChanged();
    });

  const pay = () =>
    run(async () => {
      if (!order) return;
      const amount = tendered ? Number(tendered) : undefined;
      const { sale } = await checkoutOrder(order.id, {
        paymentMethod: method,
        amountTendered: method === "CASH" ? amount : undefined,
      });
      const change = sale.changeGiven ? ` Change: ${money(sale.changeGiven)}.` : "";
      setDone(`Paid. Receipt ${sale.receiptNumber}.${change}`);
      setOrder(null);
      setPaying(false);
      onChanged();
    });

  const cancel = () =>
    run(async () => {
      if (!order || !reason.trim()) throw new Error("Please give a reason");
      await cancelOrder(order.id, reason.trim());
      setDone("Order cancelled and stock restored.");
      setOrder(null);
      setCancelling(false);
      onChanged();
    });

  const cartTotal = cart.reduce((s, l) => s + Number(l.product.sellingPrice) * l.quantity, 0);
  const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF6B00]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-[#071A2F]">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {error && <div className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {done ? (
          <div className="space-y-4 p-8 text-center">
            <p className="text-lg font-semibold text-green-700">{done}</p>
            <button onClick={onClose} className="rounded-lg bg-[#FF6B00] px-5 py-2.5 text-sm font-semibold text-white">
              Done
            </button>
          </div>
        ) : (
          <div className="grid flex-1 gap-0 overflow-hidden md:grid-cols-2">
            {/* LEFT: menu */}
            <div className="flex flex-col overflow-hidden border-b border-gray-100 p-4 md:border-b-0 md:border-r">
              <input
                className={input}
                placeholder="Search menu…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="mt-3 grid flex-1 grid-cols-2 gap-2 overflow-y-auto">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    disabled={!isOpen}
                    onClick={() => addToCart(p)}
                    className="rounded-xl border border-gray-200 p-3 text-left hover:border-[#FF6B00] disabled:opacity-40"
                  >
                    <p className="text-sm font-medium text-[#071A2F]">{p.name}</p>
                    <p className="text-xs text-gray-500">{money(p.sellingPrice)}</p>
                  </button>
                ))}
                {filtered.length === 0 && <p className="col-span-2 text-sm text-gray-500">No items found.</p>}
              </div>
            </div>
            {/* RIGHT: order */}
            <div className="flex flex-col overflow-y-auto p-4">
              {order && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase text-gray-500">On the tab</p>
                  <ul className="divide-y divide-gray-100">
                    {order.items.map((i) => (
                      <li key={i.id} className="flex items-start justify-between py-2 text-sm">
                        <div>
                          <p className="text-gray-800">
                            {i.quantity} × {i.productName}
                          </p>
                          {i.notes && <p className="text-xs text-gray-500">{i.notes}</p>}
                          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[i.kitchenStatus]}`}>
                            {i.kitchenStatus.toLowerCase()}
                          </span>
                        </div>
                        <span className="font-medium">{money(Number(i.unitPrice) * i.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 flex justify-between border-t border-gray-100 pt-2 font-bold text-[#071A2F]">
                    <span>Tab total</span>
                    <span>{money(orderTotal)}</span>
                  </p>
                </div>
              )}

              {cart.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase text-gray-500">New items</p>
                  <ul className="space-y-2">
                    {cart.map((l) => (
                      <li key={l.product.id} className="rounded-lg bg-orange-50 p-2.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-[#071A2F]">{l.product.name}</span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => changeQty(l.product.id, -1)} className="rounded bg-white p-1" aria-label="Less">
                              <Minus size={14} />
                            </button>
                            <span className="w-5 text-center">{l.quantity}</span>
                            <button onClick={() => changeQty(l.product.id, 1)} className="rounded bg-white p-1" aria-label="More">
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                        <input
                          className="mt-2 w-full rounded border border-orange-100 bg-white px-2 py-1 text-xs"
                          placeholder="Note for kitchen (e.g. no onions)"
                          value={l.notes}
                          onChange={(e) => setNotes(l.product.id, e.target.value)}
                        />
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={sendToKitchen}
                    disabled={busy}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF6B00] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <ChefHat size={16} />
                    {busy ? "Sending…" : `Send to kitchen · ${money(cartTotal)}`}
                  </button>
                </div>
              )}

              {!order && cart.length === 0 && (
                <p className="text-sm text-gray-500">Tap items on the left to start a tab.</p>
              )}

              {order && order.status === "OPEN" && (
                <div className="mt-auto space-y-3 border-t border-gray-100 pt-4">
                  {paying ? (
                    <div className="space-y-2 rounded-xl bg-gray-50 p-3">
                      <select className={input} value={method} onChange={(e) => setMethod(e.target.value as Method)}>
                        <option value="CASH">Cash</option>
                        <option value="MOBILE_MONEY">Mobile Money</option>
                        <option value="BANK_TRANSFER">Bank transfer</option>
                        <option value="OTHER">Other</option>
                      </select>
                      {method === "CASH" && (
                        <input
                          className={input}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Amount tendered (optional)"
                          value={tendered}
                          onChange={(e) => setTendered(e.target.value)}
                        />
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={pay}
                          disabled={busy || billable.length === 0}
                          className="flex-1 rounded-lg bg-green-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {busy ? "Processing…" : `Confirm ${money(orderTotal)}`}
                        </button>
                        <button onClick={() => setPaying(false)} className="rounded-lg px-3 text-sm text-gray-600">
                          Back
                        </button>
                      </div>
                    </div>
                  ) : cancelling ? (
                    <div className="space-y-2 rounded-xl bg-red-50 p-3">
                      <input className={input} placeholder="Reason for cancelling" value={reason} onChange={(e) => setReason(e.target.value)} />
                      <div className="flex gap-2">
                        <button onClick={cancel} disabled={busy} className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                          Confirm cancel
                        </button>
                        <button onClick={() => setCancelling(false)} className="rounded-lg px-3 text-sm text-gray-600">
                          Keep
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPaying(true)}
                        disabled={billable.length === 0}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        <Banknote size={16} /> Pay {money(orderTotal)}
                      </button>
                      {hasPermission(PERMISSIONS.salesCancel) && (
                        <button
                          onClick={() => setCancelling(true)}
                          className="rounded-lg border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          Cancel tab
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}