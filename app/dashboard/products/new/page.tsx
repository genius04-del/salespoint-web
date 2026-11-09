"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Category } from "@/lib/types";
import { listCategories, createProduct } from "@/lib/api/products";
import { getBusiness } from "@/lib/api/business";
import { ProductForm, type ProductFormValues } from "@/components/ProductForm";

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurant, setRestaurant] = useState(false);

  useEffect(() => {
    listCategories()
      .then((res) => setCategories(res.categories))
      .catch(() => {
        // Non-fatal — the form just offers no category options.
      });
    getBusiness()
      .then((res) => setRestaurant(!!res.business.restaurantModeEnabled))
      .catch(() => {
        // Non-fatal — the form falls back to the normal shop fields.
      });
  }, []);

  async function handleSubmit(values: ProductFormValues) {
    const dish = restaurant && values.kind === "dish";
    await createProduct({
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      categoryId: values.categoryId || undefined,
      sku: values.sku.trim() || undefined,
      barcode: values.barcode.trim() || undefined,
      unit: dish ? "unit" : values.unit.trim() || "unit",
      costPrice: dish ? 0 : Number(values.costPrice) || 0,
      sellingPrice: Number(values.sellingPrice),
      minStockLevel: dish ? 0 : Number(values.minStockLevel) || 0,
      openingStock: dish ? 0 : Number(values.openingStock) || 0,
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
        <h1 className="mb-5 text-lg font-bold text-primary-navy">Add Product</h1>
        <ProductForm
          mode="create"
          restaurant={restaurant}
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/dashboard/products")}
        />
      </div>
    </div>
  );
}
