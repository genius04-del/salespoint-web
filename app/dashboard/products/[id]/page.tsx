"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { listCategories, getProduct, updateProduct } from "@/lib/api/products";
import { ApiError } from "@/lib/apiClient";
import { getBusiness } from "@/lib/api/business";
import { ProductForm, type ProductFormValues } from "@/components/ProductForm";

// Next.js 16: a Client Component page's dynamic segment arrives as a
// Promise — unwrapped here with React's use() hook (see
// node_modules/next/dist/docs/.../dynamic-routes.md for why).
export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurant, setRestaurant] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getProduct(id), listCategories()])
      .then(([productRes, categoriesRes]) => {
        setProduct(productRes.product);
        setCategories(categoriesRes.categories);
      })
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : "Could not load product.");
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    getBusiness()
      .then((res) => setRestaurant(!!res.business.restaurantModeEnabled))
      .catch(() => {
        // Non-fatal — the form falls back to the normal shop fields.
      });
  }, []);

  async function handleSubmit(values: ProductFormValues) {
    const dish = restaurant && values.kind === "dish";
    await updateProduct(id, {
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      categoryId: values.categoryId || undefined,
      sku: values.sku.trim() || undefined,
      barcode: values.barcode.trim() || undefined,
      sellingPrice: Number(values.sellingPrice),
      // A dish's cost comes from its recipe, so never overwrite it from here.
      ...(dish
        ? {}
        : {
            unit: values.unit.trim() || "unit",
            costPrice: Number(values.costPrice) || 0,
            minStockLevel: Number(values.minStockLevel) || 0,
          }),
    });
    router.push("/dashboard/products");
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/dashboard/products"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} />
        Back to Products
      </Link>

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h1 className="mb-5 text-lg font-bold text-primary-navy">Edit Product</h1>

        {isLoading ? (
          <p className="py-8 text-center text-gray-400">Loading…</p>
        ) : loadError ? (
          <p className="py-8 text-center text-danger">{loadError}</p>
        ) : product ? (
          <ProductForm
            mode="edit"
            categories={categories}
            product={product}
            restaurant={restaurant}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/dashboard/products")}
          />
        ) : null}
      </div>
    </div>
  );
}
