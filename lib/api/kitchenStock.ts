import { apiFetch } from "@/lib/apiClient";
import type {
  Ingredient,
  PrepComponentRow,
  ProductionBatch,
  ProductionPreviewLine,
  RecipeLineRow,
  RecipeSummary,
} from "@/lib/stockTypes";

// ---- Ingredients ----
export const listIngredients = () => apiFetch<{ ingredients: Ingredient[] }>("/ingredients");

export interface CreateIngredientInput {
  name: string;
  unit: string;
  isPrepared: boolean;
  minStockLevel: number;
  costPerUnit: number;
  openingQuantity: number;
}
export const createIngredient = (input: CreateIngredientInput) =>
  apiFetch<{ ingredient: Ingredient }>("/ingredients", { method: "POST", body: input });

export const updateIngredient = (
  id: string,
  input: Partial<{ name: string; unit: string; minStockLevel: number; costPerUnit: number; isActive: boolean }>
) => apiFetch<{ ingredient: Ingredient }>(`/ingredients/${id}`, { method: "PATCH", body: input });

export const setPrepMakeup = (id: string, components: { ingredientId: string; quantity: number }[]) =>
  apiFetch<{ components: PrepComponentRow[] }>(`/ingredients/${id}/prep`, { method: "PUT", body: { components } });

export type PaidWith = "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "ON_CREDIT";
export const receiveIngredient = (
  id: string,
  input: { quantity: number; totalCost?: number; paidWith?: PaidWith; note?: string }
) => apiFetch<{ newQuantity: string }>(`/ingredients/${id}/receive`, { method: "POST", body: input });

export const wasteIngredient = (id: string, input: { quantity: number; reason: string }) =>
  apiFetch<{ newQuantity: string }>(`/ingredients/${id}/waste`, { method: "POST", body: input });

// ---- Recipes ----
export const listRecipes = () => apiFetch<{ recipes: RecipeSummary[] }>("/recipes");

export const getRecipe = (productId: string) =>
  apiFetch<{ product: { id: string; name: string; sellingPrice: string }; lines: RecipeLineRow[] }>(`/recipes/${productId}`);

export const saveRecipe = (productId: string, lines: { ingredientId: string; quantity: number }[]) =>
  apiFetch<{ message: string }>(`/recipes/${productId}`, { method: "PUT", body: { lines } });

// ---- Production (stock journal) ----
export const previewProduction = (outputId: string, quantity: number) =>
  apiFetch<{ output: { id: string; name: string; unit: string }; lines: ProductionPreviewLine[] }>(
    `/production/preview?outputId=${encodeURIComponent(outputId)}&quantity=${quantity}`
  );

export interface ProductionRunInput {
  outputId: string;
  quantity: number;
  lines?: { ingredientId: string; quantityUsed: number }[];
  notes?: string;
  allowShortage?: boolean;
}
export const recordProduction = (input: ProductionRunInput) =>
  apiFetch<{ batch: ProductionBatch }>("/production", { method: "POST", body: input });

export const listProduction = () => apiFetch<{ batches: ProductionBatch[] }>("/production");
