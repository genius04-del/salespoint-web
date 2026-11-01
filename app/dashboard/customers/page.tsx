"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2, Users, Phone } from "lucide-react";
import type { Customer } from "@/lib/types";
import { listCustomers, deleteCustomer } from "@/lib/api/customers";
import { ApiError } from "@/lib/apiClient";
import { CustomerFormModal } from "@/components/CustomerFormModal";
import { CustomerDetailModal } from "@/components/CustomerDetailModal";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listCustomers(search || undefined);
      setCustomers(res.customers);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load customers.");
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      (async () => {
        await loadCustomers();
      })();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadCustomers]);

  async function handleDelete(customer: Customer) {
    if (!confirm(`Remove "${customer.name}"? This only works if they have no sales on record.`)) return;
    setDeletingId(customer.id);
    try {
      await deleteCustomer(customer.id);
      loadCustomers();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not remove customer.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-primary-navy">Customers</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-2 text-sm font-semibold text-white hover:bg-light-orange"
        >
          <Plus size={16} />
          Add Customer
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
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-white py-16 text-center ring-1 ring-black/5">
          <Users size={32} className="text-gray-300" />
          <p className="text-gray-500">No customers yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <ul className="divide-y divide-gray-50">
            {customers.map((customer) => (
              <li key={customer.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <button
                  onClick={() => setViewingCustomerId(customer.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-medium text-primary-navy">{customer.name}</p>
                  {customer.phone && (
                    <p className="flex items-center gap-1 text-xs text-gray-500">
                      <Phone size={12} />
                      {customer.phone}
                    </p>
                  )}
                </button>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setEditingCustomer(customer)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(customer)}
                    disabled={deletingId === customer.id}
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
        <CustomerFormModal onClose={() => setShowAddModal(false)} onSaved={loadCustomers} />
      )}
      {editingCustomer && (
        <CustomerFormModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSaved={loadCustomers}
        />
      )}
      {viewingCustomerId && (
        <CustomerDetailModal customerId={viewingCustomerId} onClose={() => setViewingCustomerId(null)} />
      )}
    </div>
  );
}
