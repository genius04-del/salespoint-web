"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Tags, Pencil, Trash2, TriangleAlert, Package } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { listProducts, listCategories, deleteProduct } from "@/lib/api/products";
import { ApiError } from "@/lib/apiClient";
import { getBusiness } from "@/lib/api/business";
import { CategoryManagerModal } from "@/components/CategoryManagerModal";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const res = await listCategories();
      setCategories(res.categories);
    } catch {
      // Non-fatal — the filter dropdown just shows fewer options; the
      // product list itself doesn't depend on this succeeding.
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listProducts({
        search: search || undefined,
        categoryId: categoryFilter || undefined,
      });
      setProducts(res.products);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load products.");
    } finally {
      setIsLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    // Wrapped in an IIFE rather than calling loadCategories() directly —
    // react-hooks/set-state-in-effect flags a synchronous top-level call
    // to a useCallback-memoized function that sets state; an inline async
    // wrapper (same pattern AuthContext.tsx already uses) satisfies it.
    (async () => {
      await loadCategories();
    })();
  }, [loadCategories]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getBusiness();
        setRestaurant(!!res.business.restaurantModeEnabled);
      } catch {
        // Non-fatal — shows the normal shop columns.
      }
    })();
  }, []);

  useEffect(() => {
    // Debounce search so every keystroke doesn't fire a request.
    const timer = setTimeout(loadProducts, 300);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  async function handleDelete(product: Product) {
    if (!confirm(`Remove "${product.name}"? If it has sale/purchase history it will be deactivated instead of deleted.`)) {
      return;
    }
    setDeletingId(product.id);
    try {
      await deleteProduct(product.id);
      loadProducts();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not remove product.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-primary-navy">Products</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryManager(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Tags size={16} />
            Categories
          </button>
          <Link
            href="/dashboard/products/new"
            className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-2 text-sm font-semibold text-white hover:bg-light-orange"
          >
            <Plus size={16} />
            Add Product
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, or barcode…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-white py-16 text-center ring-1 ring-black/5">
          <Package size={32} className="text-gray-300" />
          <p className="text-gray-500">No products found.</p>
          <Link href="/dashboard/products/new" className="text-sm font-medium text-brand-orange hover:underline">
            Add your first product
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                {!restaurant && <th className="px-4 py-3 font-medium text-right">Cost</th>}
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium text-right">Stock</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const lowStock = product.currentQuantity <= product.minStockLevel;
                return (
                  <tr key={product.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-primary-navy">{product.name}</div>
                      {product.sku && <div className="text-xs text-gray-400">SKU: {product.sku}</div>}
                      {!product.isActive && (
                        <span className="mt-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{product.category?.name ?? "—"}</td>
                    {!restaurant && (
                      <td className="px-4 py-3 text-right text-gray-600">
                        GHS {Number(product.costPrice).toFixed(2)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right font-medium text-primary-navy">
                      GHS {Number(product.sellingPrice).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {restaurant && product.hasRecipe ? (
                        <span className="text-xs text-gray-400">From ingredients</span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            lowStock ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                          }`}
                        >
                          {lowStock && <TriangleAlert size={12} />}
                          {product.currentQuantity} {product.unit}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/dashboard/products/${product.id}`}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          aria-label="Edit"
                        >
                          <Pencil size={16} />
                        </Link>
                        <button
                          onClick={() => handleDelete(product)}
                          disabled={deletingId === product.id}
                          className="rounded p-1.5 text-gray-400 hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                          aria-label="Remove"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCategoryManager && (
        <CategoryManagerModal
          categories={categories}
          onClose={() => setShowCategoryManager(false)}
          onChanged={loadCategories}
        />
      )}
    </div>
  );
}
