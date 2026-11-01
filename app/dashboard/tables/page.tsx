 "use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, ShoppingBag } from "lucide-react";
import { createTable, listOrders, listTables, updateTable } from "@/lib/api/restaurant";
import { TableOrderModal } from "@/components/TableOrderModal";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/lib/permissions";
import { useRestaurantMode } from "@/lib/useRestaurantMode";
import type { RestaurantOrder, RestaurantTable } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  AVAILABLE: "border-green-200 bg-green-50 text-green-700",
  OCCUPIED: "border-[#FF6B00]/40 bg-orange-50 text-[#FF6B00]",
  RESERVED: "border-blue-200 bg-blue-50 text-blue-700",
  NEEDS_CLEANING: "border-amber-200 bg-amber-50 text-amber-700",
};

type Open = { tableId: string | null; title: string; orderId: string | null } | null;

export default function TablesPage() {
  const { hasPermission } = useAuth();
  const restaurantMode = useRestaurantMode();
  const canManage = hasPermission(PERMISSIONS.tablesManage);

  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Open>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [newName, setNewName] = useState("");
  const [newCap, setNewCap] = useState("");

  useEffect(() => {
    if (restaurantMode !== true) return;
    let cancelled = false;
    (async () => {
      try {
        const [t, o] = await Promise.all([listTables(), listOrders({ status: "OPEN" })]);
        if (cancelled) return;
        setTables(t.tables);
        setOrders(o.orders);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load tables");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, restaurantMode]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  async function addTable(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await createTable({
        name: newName.trim(),
        capacity: newCap ? Number(newCap) : undefined,
      });
      setNewName("");
      setNewCap("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add table");
    }
  }

  async function markAvailable(id: string) {
    try {
      await updateTable(id, { status: "AVAILABLE" });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  if (restaurantMode === false) {
    return (
      <p className="rounded-xl bg-white p-6 text-sm text-gray-600 shadow-sm">
        Restaurant mode is off. The owner can turn it on under <b>Restaurant Mode</b>.
      </p>
    );
  }

  const takeaway = orders.filter((o) => !o.tableId);
  const orderForTable = (id: string) => orders.find((o) => o.tableId === id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#071A2F]">Tables</h1>
        <button
          onClick={() => setOpen({ tableId: null, title: "Takeaway order", orderId: null })}
          className="flex items-center gap-2 rounded-lg bg-[#FF6B00] px-4 py-2 text-sm font-semibold text-white"
        >
          <ShoppingBag size={16} /> New takeaway
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tables.map((t) => {
          const order = orderForTable(t.id);
          return (
            <div key={t.id} className={`rounded-2xl border p-4 ${STATUS_STYLE[t.status]}`}>
 <button
                className="w-full text-left"
                onClick={() =>
                  setOpen({ tableId: t.id, title: `Table ${t.name}`, orderId: order?.id ?? null })
                }
              >
                <p className="text-lg font-bold">{t.name}</p>
                <p className="text-xs">
                  {t.status.replace(/_/g, " ").toLowerCase()}
                  {t.capacity ? ` · seats ${t.capacity}` : ""}
                </p>
                {order && <p className="mt-1 text-xs font-medium">{order.items.length} items on tab</p>}
              </button>
              {t.status === "NEEDS_CLEANING" && canManage && (
                <button
                  onClick={() => markAvailable(t.id)}
                  className="mt-2 w-full rounded-lg bg-white px-2 py-1 text-xs font-medium text-amber-700"
                >
                  Mark available
                </button>
              )}
            </div>
          );
        })}
        {tables.length === 0 && (
          <p className="col-span-full text-sm text-gray-500">
            No tables yet.{canManage ? " Add one below." : " Ask a manager to add tables."}
          </p>
        )}
      </div>

      {takeaway.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-3 font-semibold text-[#071A2F]">Open takeaway orders</h2>
          <div className="flex flex-wrap gap-2">
            {takeaway.map((o) => (
              <button
                key={o.id}
                onClick={() => setOpen({ tableId: null, title: "Takeaway order", orderId: o.id })}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm hover:border-[#FF6B00]"
              >
                {o.items.length} items · {new Date(o.createdAt).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}
              </button>
            ))}
          </div>
        </section>
      )}

      {canManage && (
        <form onSubmit={addTable} className="flex flex-wrap items-end gap-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div>
            <label className="mb-1 block text-xs text-gray-500">New table name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              placeholder="e.g. T1 or Patio 2"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Seats</label>
            <input
              value={newCap}
              onChange={(e) => setNewCap(e.target.value)}
              type="number"
              min="1"
              className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <button className="flex items-center gap-1 rounded-lg bg-[#071A2F] px-4 py-2 text-sm font-semibold text-white">
            <Plus size={16} /> Add table
          </button>
        </form>
      )}

      {open && (
        <TableOrderModal
          key={`${open.tableId}-${open.orderId}`}
          tableId={open.tableId}
          title={open.title}
          orderId={open.orderId}
          onClose={() => setOpen(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}