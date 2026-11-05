"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getBusiness } from "@/lib/api/business";
import { getSale } from "@/lib/api/sales";
import { cancelSale, listSalesRegister, type RegisterSale } from "@/lib/api/restaurant";
import type { Business, Sale } from "@/lib/types";
import { ReceiptModal } from "@/components/ReceiptModal";
import { Modal, ghostBtn, inputClass, primaryBtn } from "@/components/kitchen/Modal";
import { errMsg } from "@/components/kitchen/format";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const startOf = (s: string) => new Date(`${s}T00:00:00`).toISOString();
const endOf = (s: string) => new Date(`${s}T23:59:59.999`).toISOString();
const money = (n: number) => `GH₵ ${n.toFixed(2)}`;
const METHOD_LABEL: Record<string, string> = { CASH: "Cash", MOBILE_MONEY: "Mobile money", BANK_TRANSFER: "Bank transfer", PAYSTACK: "Paystack", OTHER: "Other" };

export default function SalesRegisterPage() {
  const { hasPermission } = useAuth();
  const canCancel = hasPermission("sales.cancel");
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [cashier, setCashier] = useState("");
  const [q, setQ] = useState("");
  const [sales, setSales] = useState<RegisterSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [business, setBusiness] = useState<Business | null>(null);
  const [viewing, setViewing] = useState<Sale | null>(null);
  const [cancelling, setCancelling] = useState<RegisterSale | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listSalesRegister({ from: startOf(from), to: endOf(to), status: status || undefined, paymentMethod: method || undefined, q: q.trim() || undefined });
      setSales(res.sales);
      setError("");
    } catch (e) {
      setError(errMsg(e, "Could not load sales"));
    } finally {
      setLoading(false);
    }
  }, [from, to, status, method, q]);

  useEffect(() => {
    const t = setTimeout(() => { void load(); }, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    (async () => {
      try { setBusiness((await getBusiness()).business); } catch { /* receipt header only */ }
    })();
  }, []);

  const cashiers = useMemo(() => Array.from(new Set(sales.map((s) => s.cashier.name))).sort(), [sales]);
  const shown = cashier ? sales.filter((s) => s.cashier.name === cashier) : sales;
  const done = shown.filter((s) => s.status === "COMPLETED");
  const total = done.reduce((a, s) => a + Number(s.total), 0);
  const byMethod = done.reduce<Record<string, number>>((m, s) => ({ ...m, [s.paymentMethod]: (m[s.paymentMethod] ?? 0) + Number(s.total) }), {});

  async function open(id: string) {
    try { setViewing((await getSale(id)).sale); } catch (e) { setError(errMsg(e, "Could not open the sale")); }
  }

  function csv() {
    const rows = [["Receipt", "Time", "Cashier", "Table", "Items", "Method", "Total", "Status"],
      ...shown.map((s) => [s.receiptNumber, new Date(s.createdAt).toLocaleString("en-GH"), s.cashier.name, s.order?.table?.name ?? "", String(s._count.items), METHOD_LABEL[s.paymentMethod] ?? s.paymentMethod, Number(s.total).toFixed(2), s.status])];
    const body = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
    a.download = `sales-${from}-to-${to}.csv`;
    a.click();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#071A2F]">Sales register</h1>
          <p className="text-sm text-gray-500">Every sale, with who rang it and how it was paid.</p>
        </div>
        <button onClick={csv} disabled={shown.length === 0} className={`${ghostBtn} flex items-center gap-1`}><Download size={14} /> Download CSV</button>
      </div>

      <div className="grid gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 sm:grid-cols-3 lg:grid-cols-6">
        <input type="date" className={inputClass} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className={inputClass} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option>
        </select>
        <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="">All payments</option>
          {Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className={inputClass} value={cashier} onChange={(e) => setCashier(e.target.value)}>
          <option value="">All cashiers</option>
          {cashiers.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input className={inputClass} placeholder="Search receipt no." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Sales" value={String(done.length)} />
        <Tile label="Total taken" value={money(total)} />
        {Object.entries(byMethod).slice(0, 2).map(([m, v]) => <Tile key={m} label={METHOD_LABEL[m] ?? m} value={money(v)} />)}
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr><th className="px-3 py-2">Receipt</th><th className="px-3 py-2">Time</th><th className="px-3 py-2">Cashier</th><th className="px-3 py-2">Table</th><th className="px-3 py-2 text-right">Items</th><th className="px-3 py-2">Paid by</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400">Loading…</td></tr>}
            {!loading && shown.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400">No sales for these filters.</td></tr>}
            {shown.map((s) => (
              <tr key={s.id} onClick={() => void open(s.id)} className="cursor-pointer hover:bg-orange-50/40">
                <td className="px-3 py-2 font-medium text-[#071A2F]">{s.receiptNumber}</td>
                <td className="px-3 py-2 text-gray-600">{new Date(s.createdAt).toLocaleString("en-GH", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="px-3 py-2">{s.cashier.name}</td>
                <td className="px-3 py-2 text-gray-600">{s.order?.table?.name ?? "-"}</td>
                <td className="px-3 py-2 text-right">{s._count.items}</td>
                <td className="px-3 py-2">{METHOD_LABEL[s.paymentMethod] ?? s.paymentMethod}</td>
                <td className={`px-3 py-2 text-right font-medium ${s.status === "CANCELLED" ? "text-gray-400 line-through" : ""}`}>{money(Number(s.total))}</td>
                <td className="px-3 py-2">
                  {s.status === "CANCELLED" ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">Cancelled</span>
                    : <span className="flex items-center gap-2"><span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">Completed</span>
                      {canCancel && <button onClick={(e) => { e.stopPropagation(); setCancelling(s); }} className="text-xs text-red-600 hover:underline">Cancel</button>}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewing && <ReceiptModal sale={viewing} business={business} title={`Receipt ${viewing.receiptNumber}`} actionLabel="Close" onNewSale={() => setViewing(null)} />}
      {cancelling && <CancelModal sale={cancelling} onClose={() => setCancelling(null)} onDone={() => { setCancelling(null); void load(); }} />}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#071A2F]">{value}</p>
    </div>
  );
}

function CancelModal({ sale, onClose, onDone }: { sale: RegisterSale; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return setError("Say why this sale is cancelled.");
    setBusy(true);
    try { await cancelSale(sale.id, reason.trim()); onDone(); } catch (err) { setError(errMsg(err, "Could not cancel")); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Cancel ${sale.receiptNumber}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-gray-600">This puts the stock back and removes the sale from the day&apos;s totals.</p>
        <input className={inputClass} placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className={ghostBtn}>Back</button><button disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Cancel sale"}</button></div>
      </form>
    </Modal>
  );
}
