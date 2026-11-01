"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2, Handshake } from "lucide-react";
import type { SupplierWithBalance } from "@/lib/types";
import { listSuppliers, deleteSupplier } from "@/lib/api/suppliers";
import { ApiError } from "@/lib/apiClient";
import { SupplierFormModal } from "@/components/SupplierFormModal";
import { SupplierDetailModal } from "@/components/SupplierDetailModal";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierWithBalance[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<SupplierWithBalance | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingSupplierId, setViewingSupplierId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSuppliers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listSuppliers(search || undefined);
      setSuppliers(res.suppliers);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load suppliers.");
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      (async () => {
        await loadSuppliers();
      })();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadSuppliers]);

  async function handleDelete(supplier: SupplierWithBalance) {
    if (!confirm(`Remove "${supplier.name}"? This only works if they have no purchases on record.`)) return;
    setDeletingId(supplier.id);
    try {
      await deleteSupplier(supplier.id);
      loadSuppliers();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not remove supplier.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-primary-navy">Suppliers</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-2 text-sm font-semibold text-white hover:bg-light-orange"
        >
          <Plus size={16} />
          Add Supplier
        </button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone…"
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
        />
      </div>

      {error && <div className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-white py-16 text-center ring-1 ring-black/5">
          <Handshake size={32} className="text-gray-300" />
          <p className="text-gray-500">No suppliers yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <ul className="divide-y divide-gray-50">
            {suppliers.map((supplier) => (
              <li key={supplier.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <button
                  onClick={() => setViewingSupplierId(supplier.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-medium text-primary-navy">{supplier.name}</p>
                  {supplier.phone && <p className="text-xs text-gray-500">{supplier.phone}</p>}
                </button>
                {supplier.outstandingBalance > 0 && (
                  <span className="shrink-0 rounded-full bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">
                    Owes GHS {supplier.outstandingBalance.toFixed(2)}
                  </span>
                )}
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setEditingSupplier(supplier)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(supplier)}
                    disabled={deletingId === supplier.id}
                    className="rounded p-1.5 text-gray-400 hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                    aria-label="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showAddModal && (
        <SupplierFormModal onClose={() => setShowAddModal(false)} onSaved={loadSuppliers} />
      )}
      {editingSupplier && (
        <SupplierFormModal
          supplier={editingSupplier}
          onClose={() => setEditingSupplier(null)}
          onSaved={loadSuppliers}
        />
      )}
      {viewingSupplierId && (
        <SupplierDetailModal supplierId={viewingSupplierId} onClose={() => setViewingSupplierId(null)} />
      )}
    </div>
  );
}
