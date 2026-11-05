"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { listRecipes } from "@/lib/api/kitchenStock";
import type { RecipeSummary } from "@/lib/stockTypes";
import { RecipeEditorModal } from "@/components/kitchen/RecipeEditorModal";
import { inputClass } from "@/components/kitchen/Modal";
import { cedi, errMsg } from "@/components/kitchen/format";

export function MenuRecipes() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("stock.manage");

  const [rows, setRows] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<RecipeSummary | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { recipes } = await listRecipes();
        if (!cancelled) {
          setRows(recipes);
          setError("");
        }
      } catch (e) {
        if (!cancelled) setError(errMsg(e, "Could not load recipes"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const shown = rows.filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        What one portion of a menu item uses. When it is sold, these ingredients (and packaging such as boxes) come off stock. Products without a recipe, like bottled drinks, are counted as whole units.
      </p>
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className={`${inputClass} pl-9`} placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && <p className="text-gray-500">Loading…</p>}

      {shown.length > 0 && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Recipe</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.productId} onClick={() => setOpen(r)} className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#071A2F]">{r.name}</td>
                  <td className="px-4 py-3">
                    {r.hasRecipe ? (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">{r.ingredientCount} ingredients</span>
                    ) : (
                      <span className="text-xs text-gray-400">Counted as whole units</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{r.hasRecipe ? cedi(r.recipeCost) : "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{cedi(r.sellingPrice)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{r.marginPercent === null ? "—" : `${r.marginPercent}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !error && shown.length === 0 && <p className="text-sm text-gray-500">No products match.</p>}

      {open && (
        <RecipeEditorModal
          recipe={open}
          canEdit={canEdit}
          onClose={() => setOpen(null)}
          onDone={() => {
            setOpen(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
