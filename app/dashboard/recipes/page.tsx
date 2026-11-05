"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { listIngredients } from "@/lib/api/kitchenStock";
import type { Ingredient } from "@/lib/stockTypes";
import { BatchRecipeModal } from "@/components/kitchen/BatchRecipeModal";
import { MenuRecipes } from "@/components/kitchen/MenuRecipes";
import { primaryBtn } from "@/components/kitchen/Modal";
import { cedi, errMsg, qty } from "@/components/kitchen/format";

type Tab = "production" | "menu";

// "2 kg Raw steak + 0.1 kg Seasoning", for the whole batch.
function batchSummary(r: Ingredient) {
  const y = Number(r.batchYield ?? 1);
  return r.components
    .map((c) => `${qty(Number(c.quantity) * y, 3)} ${c.component.unit} ${c.component.name}`)
    .join(" + ");
}

function ProductionRecipes() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("stock.manage");
  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<{ recipe?: Ingredient } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { ingredients } = await listIngredients();
        if (!cancelled) {
          setItems(ingredients);
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

  const recipes = items.filter((i) => i.isPrepared && i.isActive);
  const costPerUnit = (r: Ingredient) =>
    r.components.reduce((s, c) => {
      const ing = items.find((i) => i.id === c.componentId);
      return s + Number(c.quantity) * Number(ing?.costPerUnit ?? 0);
    }, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-gray-500">
          What the kitchen makes in batches: jollof, dough, sauces, marinated meat. Say what goes in and how much comes out. The Stock Journal then does the maths for you.
        </p>
        {canEdit && (
          <button onClick={() => setDialog({})} className={`${primaryBtn} flex items-center gap-1`}>
            <Plus size={16} /> New recipe
          </button>
        )}
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && <p className="text-gray-500">Loading…</p>}
      {!loading && !error && recipes.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm ring-1 ring-black/5">
          No recipes yet. Tap <b>New recipe</b>, for example Jollof rice: rice, tomato paste, oil and spices, making 20 kg.
        </p>
      )}

      {recipes.length > 0 && (
        <div className="space-y-2">
          {recipes.map((r) => (
            <div key={r.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#071A2F]">{r.name}</p>
                  {r.components.length > 0 ? (
                    <p className="mt-1 text-sm text-gray-600">
                      <span className="font-medium text-[#071A2F]">Makes {qty(r.batchYield ?? 1)} {r.unit}</span> from {batchSummary(r)}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-amber-700">No recipe yet. Open it and say what goes in.</p>
                  )}
                  {r.components.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">About {cedi(costPerUnit(r))} per {r.unit}</p>
                  )}
                </div>
                {canEdit && (
                  <button onClick={() => setDialog({ recipe: r })} title="Edit recipe" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                    <Pencil size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {dialog && (
        <BatchRecipeModal
          recipe={dialog.recipe}
          all={items}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

export default function RecipesPage() {
  const [tab, setTab] = useState<Tab>("production");
  const tabs: { id: Tab; label: string }[] = [
    { id: "production", label: "Kitchen recipes" },
    { id: "menu", label: "Menu items" },
  ];
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#071A2F]">Recipes</h1>
      <p className="mb-4 text-sm text-gray-500">
        Set these once. <b>Kitchen recipes</b> are what you cook in batches. <b>Menu items</b> are what one portion sold to a customer uses.
      </p>
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.id ? "border-[#FF6B00] text-[#FF6B00]" : "border-transparent text-gray-600 hover:text-[#071A2F]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tab === "production" ? <ProductionRecipes /> : <MenuRecipes />}
    </div>
  );
}
