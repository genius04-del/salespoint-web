"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { listOrders, setItemStatus } from "@/lib/api/restaurant";
import type { KitchenStatus, Order, OrderItem } from "@/lib/restaurantTypes";
import { errMsg } from "@/components/kitchen/format";

type Ticket = { item: OrderItem; order: Order };
const COLUMNS: { status: KitchenStatus; title: string; next: KitchenStatus; action: string; cls: string }[] = [
  { status: "NEW", title: "New", next: "PREPARING", action: "Start cooking", cls: "bg-blue-50" },
  { status: "PREPARING", title: "Preparing", next: "READY", action: "Mark ready", cls: "bg-amber-50" },
  { status: "READY", title: "Ready to serve", next: "SERVED", action: "Served", cls: "bg-green-50" },
];

const mins = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

export default function KitchenPage() {
  const { hasPermission } = useAuth();
  const canAct = hasPermission("kitchen.manage");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOrders((await listOrders("OPEN")).orders);
      setError("");
    } catch (e) {
      setError(errMsg(e, "Could not load orders"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => { await load(); })();
    const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 10000);
    return () => clearInterval(t);
  }, [load]);

  const tickets: Ticket[] = orders.flatMap((order) => order.items.map((item) => ({ item, order })));

  async function advance(t: Ticket, next: KitchenStatus) {
    setBusyId(t.item.id);
    try {
      await setItemStatus(t.item.id, next);
      await load();
    } catch (e) {
      setError(errMsg(e, "Could not update the item"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#071A2F]">Kitchen orders</h1>
          <p className="text-sm text-gray-500">New orders appear here by themselves every few seconds.</p>
        </div>
        <button onClick={() => void load()} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"><RefreshCw size={14} /> Refresh</button>
      </div>
      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && <p className="text-gray-500">Loading…</p>}
      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = tickets.filter((t) => t.item.kitchenStatus === col.status).sort((a, b) => a.item.createdAt.localeCompare(b.item.createdAt));
          return (
            <div key={col.status} className={`rounded-2xl p-3 ${col.cls}`}>
              <h2 className="mb-3 flex items-center justify-between font-semibold text-[#071A2F]">{col.title}<span className="rounded-full bg-white px-2 py-0.5 text-xs">{list.length}</span></h2>
              <div className="space-y-2">
                {list.length === 0 && <p className="py-4 text-center text-sm text-gray-400">Nothing here</p>}
                {list.map((t) => {
                  const waited = mins(t.item.createdAt);
                  return (
                    <div key={t.item.id} className="rounded-xl bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-[#071A2F]">{t.item.quantity} × {t.item.productName}</p>
                        <span className={`shrink-0 text-xs ${waited >= 15 ? "font-semibold text-red-600" : "text-gray-500"}`}>{waited} min</span>
                      </div>
                      <p className="text-xs text-gray-500">{t.order.table?.name ?? "Takeaway"}{t.order.createdByName ? ` · ${t.order.createdByName}` : ""}</p>
                      {t.item.notes && <p className="mt-1 rounded bg-yellow-50 px-2 py-1 text-xs text-yellow-800">{t.item.notes}</p>}
                      {canAct && (
                        <button disabled={busyId === t.item.id} onClick={() => advance(t, col.next)} className="mt-2 w-full rounded-lg bg-[#071A2F] px-3 py-2 text-sm font-medium text-white disabled:opacity-60">{col.action}</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
