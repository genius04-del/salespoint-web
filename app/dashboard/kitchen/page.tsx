 "use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { listOrders, setItemStatus } from "@/lib/api/restaurant";
import { useRestaurantMode } from "@/lib/useRestaurantMode";
import type { KitchenOrderItem, KitchenStatus, RestaurantOrder } from "@/lib/types";

const COLUMNS: { status: KitchenStatus; label: string; next: KitchenStatus; action: string; tone: string }[] = [
  { status: "NEW", label: "New", next: "PREPARING", action: "Start preparing", tone: "border-gray-200" },
  { status: "PREPARING", label: "Preparing", next: "READY", action: "Mark ready", tone: "border-blue-200" },
  { status: "READY", label: "Ready", next: "SERVED", action: "Mark served", tone: "border-green-200" },
];

function minutesAgo(iso: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

type Ticket = { item: KitchenOrderItem; order: RestaurantOrder };

export default function KitchenPage() {
  const restaurantMode = useRestaurantMode();
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (restaurantMode !== true) return;
    let cancelled = false;
    async function load() {
      try {
        const { orders } = await listOrders({ status: "OPEN" });
        if (cancelled) return;
        setOrders(orders);
        setNow(Date.now());
        setError("");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load orders");
      }
    }
    (async () => {
      await load();
    })();
    const timer = setInterval(load, 10000); // keep the board fresh
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [restaurantMode, reloadKey]);

  async function advance(itemId: string, status: KitchenStatus) {
    setError("");
    try {
      await setItemStatus(itemId, status);
      setReloadKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  if (restaurantMode === false) {
    return (
      <p className="rounded-xl bg-white p-6 text-sm text-gray-600 shadow-sm">
        Restaurant mode is off. The owner can turn it on under <b>Restaurant Mode</b>.
      </p>
    );
  }

  const tickets: Ticket[] = orders.flatMap((order) => order.items.map((item) => ({ item, order })));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#071A2F]">Kitchen</h1>
        <p className="text-sm text-gray-500">Refreshes every 10 seconds.</p>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = tickets
            .filter((t) => t.item.kitchenStatus === col.status)
            .sort((a, b) => a.item.createdAt.localeCompare(b.item.createdAt));
          return (
            <section key={col.status} className="rounded-2xl bg-gray-100/70 p-3">
              <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold text-[#071A2F]">
                {col.label}
                <span className="rounded-full bg-white px-2 py-0.5 text-xs">{list.length}</span>
              </h2>
              <div className="space-y-2">
                {list.length === 0 && <p className="px-1 text-sm text-gray-400">Nothing here.</p>}
                {list.map(({ item, order }) => (
                  <div key={item.id} className={`rounded-xl border bg-white p-3 ${col.tone}`}>
                    <div className="flex items-start justify-between">
                      <p className="font-semibold text-[#071A2F]">
 {item.quantity} × {item.productName}
                      </p>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={12} /> {minutesAgo(item.createdAt, now)}m
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {order.table ? `Table ${order.table.name}` : "Takeaway"}
                    </p>
                    {item.notes && (
                      <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">{item.notes}</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => advance(item.id, col.next)}
                        className="flex-1 rounded-lg bg-[#FF6B00] px-3 py-1.5 text-sm font-medium text-white"
                      >
                        {col.action}
                      </button>
                      <button
                        onClick={() => advance(item.id, "CANCELLED")}
                        className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50"
                        title="Cancel this item (e.g. out of an ingredient)"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}