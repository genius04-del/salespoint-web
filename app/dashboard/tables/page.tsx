"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getBusiness } from "@/lib/api/business";
import { createTable, listOrders, listTables, setTableStatus } from "@/lib/api/restaurant";
import type { Business } from "@/lib/types";
import type { DiningTable, Order, TableStatus } from "@/lib/restaurantTypes";
import { orderTotal } from "@/lib/restaurantTypes";
import { TabPanel } from "@/components/restaurant/TabPanel";
import { Field, Modal, ghostBtn, inputClass, primaryBtn } from "@/components/kitchen/Modal";
import { errMsg } from "@/components/kitchen/format";

const STATUS: Record<TableStatus, { label: string; cls: string }> = {
  AVAILABLE: { label: "Free", cls: "bg-green-50 text-green-700 ring-green-200" },
  OCCUPIED: { label: "Open tab", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  RESERVED: { label: "Reserved", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
  NEEDS_CLEANING: { label: "Needs cleaning", cls: "bg-gray-100 text-gray-600 ring-gray-200" },
};

const mins = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

// What is open on screen: a table (maybe with a tab) or a takeaway order.
type Selection = { kind: "table"; tableId: string } | { kind: "takeaway"; orderId: string | null } | null;

export default function TablesPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("tables.manage");
  const canServe = hasPermission("sales.create");

  const [tables, setTables] = useState<DiningTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selection, setSelection] = useState<Selection>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, o] = await Promise.all([listTables(), listOrders("OPEN")]);
      setTables(t.tables);
      setOrders(o.orders);
      setError("");
    } catch (e) {
      setError(errMsg(e, "Could not load the tables"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
      try {
        setBusiness((await getBusiness()).business);
      } catch {
        // The receipt just shows no business header.
      }
    })();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 15000);
    return () => clearInterval(timer);
  }, [load]);

  const orderFor = (tableId: string) => orders.find((o) => o.tableId === tableId) ?? null;
  const takeaways = orders.filter((o) => !o.tableId);

  const selTable = selection?.kind === "table" ? tables.find((t) => t.id === selection.tableId) ?? null : null;
  const selOrder =
    selection?.kind === "table" ? orderFor(selection.tableId) : selection?.kind === "takeaway" && selection.orderId ? orders.find((o) => o.id === selection.orderId) ?? null : null;

  async function clean(t: DiningTable) {
    try {
      await setTableStatus(t.id, "AVAILABLE");
      await load();
    } catch (e) {
      setError(errMsg(e, "Could not update the table"));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#071A2F]">Tables</h1>
          <p className="text-sm text-gray-500">Tap a table to start an order or see its tab. Orders go straight to the kitchen.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className={`${ghostBtn} flex items-center gap-1`}><RefreshCw size={14} /> Refresh</button>
          {canServe && <button onClick={() => setSelection({ kind: "takeaway", orderId: null })} className={`${ghostBtn} flex items-center gap-1`}><ShoppingBag size={14} /> Takeaway</button>}
          {canManage && <button onClick={() => setAdding(true)} className={`${primaryBtn} flex items-center gap-1`}><Plus size={14} /> Add table</button>}
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && <p className="text-gray-500">Loading…</p>}
      {!loading && !error && tables.length === 0 && takeaways.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm ring-1 ring-black/5">
          No tables yet. {canManage ? "Tap Add table to create your first one." : "Ask a manager to add the tables."}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tables.map((t) => {
          const order = orderFor(t.id);
          const st = STATUS[order ? "OCCUPIED" : t.status];
          return (
            <div key={t.id} className={`rounded-2xl p-3 ring-1 ${st.cls}`}>
              <button
                onClick={() => (t.status === "NEEDS_CLEANING" && !order ? undefined : setSelection({ kind: "table", tableId: t.id }))}
                className="block w-full text-left"
              >
                <p className="text-lg font-bold text-[#071A2F]">{t.name}</p>
                <p className="text-xs">{st.label}{t.capacity ? ` · seats ${t.capacity}` : ""}</p>
                {order && (
                  <p className="mt-2 text-sm font-semibold text-[#071A2F]">
                    GH₵ {orderTotal(order).toFixed(2)}
                    <span className="block text-xs font-normal text-gray-500">{order.items.filter((i) => i.kitchenStatus !== "CANCELLED").length} items · {mins(order.createdAt)} min</span>
                  </p>
                )}
              </button>
              {!order && t.status === "NEEDS_CLEANING" && (
                <button onClick={() => void clean(t)} className="mt-2 rounded-lg bg-white px-3 py-1 text-xs font-semibold text-[#071A2F] ring-1 ring-gray-200">Mark clean</button>
              )}
            </div>
          );
        })}
        {takeaways.map((o, i) => (
          <button key={o.id} onClick={() => setSelection({ kind: "takeaway", orderId: o.id })} className="rounded-2xl bg-amber-50 p-3 text-left text-amber-700 ring-1 ring-amber-200">
            <p className="text-lg font-bold text-[#071A2F]">Takeaway {i + 1}</p>
            <p className="text-xs">Open tab</p>
            <p className="mt-2 text-sm font-semibold text-[#071A2F]">GH₵ {orderTotal(o).toFixed(2)}<span className="block text-xs font-normal text-gray-500">{mins(o.createdAt)} min</span></p>
          </button>
        ))}
      </div>

      {selection && (selection.kind === "takeaway" || selTable) && (
        <TabPanel
          key={selOrder?.id ?? `new-${selection.kind === "table" ? selection.tableId : "takeaway"}`}
          table={selTable}
          order={selOrder}
          business={business}
          canCancel={hasPermission("sales.cancel")}
          canKitchen={hasPermission("kitchen.manage")}
          onClose={() => setSelection(null)}
          onChanged={async (newOrderId) => {
            await load();
            if (newOrderId && selection.kind === "takeaway") setSelection({ kind: "takeaway", orderId: newOrderId });
          }}
        />
      )}
      {adding && <AddTableModal onClose={() => setAdding(false)} onDone={() => { setAdding(false); void load(); }} />}
    </div>
  );
}

function AddTableModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [seats, setSeats] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const cap = seats.trim() === "" ? undefined : Number(seats);
    if (cap !== undefined && (!Number.isInteger(cap) || cap < 1)) return setError("Seats must be a whole number.");
    setBusy(true);
    try {
      await createTable({ name: name.trim(), capacity: cap });
      onDone();
    } catch (err) {
      setError(errMsg(err, "Could not add the table"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Add table" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Table 1, Patio 3" /></Field>
        <Field label="Seats (optional)"><input className={inputClass} inputMode="numeric" value={seats} onChange={(e) => setSeats(e.target.value)} placeholder="4" /></Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>
          <button disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Add"}</button>
        </div>
      </form>
    </Modal>
  );
}
