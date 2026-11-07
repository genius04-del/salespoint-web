// Decimals arrive from the API as strings — wrap in Number() before maths.

export interface PrepComponentRow {
  id: string;
  componentId: string;
  quantity: string;
  component: { id: string; name: string; unit: string };
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  isPrepared: boolean;
  category: string | null;
  batchYield: string | null;
  currentQuantity: string;
  minStockLevel: string;
  costPerUnit: string;
  packName: string | null;
  packSize: string | null;
  isActive: boolean;
  components: PrepComponentRow[];
}

export interface RecipeSummary {
  productId: string;
  name: string;
  sellingPrice: string;
  hasRecipe: boolean;
  ingredientCount: number;
  recipeCost: string;
  marginPercent: number | null;
}

export interface RecipeLineRow {
  id: string;
  ingredientId: string;
  quantity: string;
  ingredient: { id: string; name: string; unit: string; costPerUnit: string };
}

export interface ProductionPreviewLine {
  ingredientId: string;
  name: string;
  unit: string;
  standardQuantity: string;
  onHand: string;
  enough: boolean;
}

export interface ProductionBatch {
  id: string;
  outputId: string;
  number: number;
  quantityProduced: string;
  totalCost: string;
  reason: string | null;
  notes: string | null;
  createdAt: string;
  producedByName: string | null;
  output: { name: string; unit: string };
  lines: {
    id: string;
    ingredientId: string;
    quantityUsed: string;
    standardQuantity: string;
    unitCost: string;
    ingredient: { name: string; unit: string };
  }[];
}

export type StockCountStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

export interface StockCountSummary {
  id: string;
  status: StockCountStatus;
  scope: string;
  notes: string | null;
  createdAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  totalVarianceValue: string | null;
  countedByName: string | null;
  reviewedByName: string | null;
  _count: { lines: number };
}

export interface StockCountLine {
  id: string;
  itemType: "PRODUCT" | "INGREDIENT";
  itemName: string;
  unit: string;
  category: string | null;
  expected: string;
  counted: string | null;
  variance: string | null;
  unitCost: string;
  varianceValue: string | null;
}

export interface StockCountDetail extends Omit<StockCountSummary, "_count" | "countedByName" | "reviewedByName"> {
  lines: StockCountLine[];
}

export interface VarianceItem {
  itemType: "PRODUCT" | "INGREDIENT";
  itemId: string;
  name: string;
  unit: string;
  timesCounted: number;
  timesShort: number;
  totalVariance: number;
  totalValue: number;
}

export interface VarianceReport {
  range: { from: string; to: string; label: string };
  summary: {
    countsApproved: number;
    shortageValue: number;
    surplusValue: number;
    netCountValue: number;
    wasteValue: number;
    productionOverUseValue: number;
  };
  items: VarianceItem[];
  waste: { ingredientId: string; name: string; unit: string; quantity: number; value: number }[];
  production: { ingredientId: string; name: string; unit: string; used: number; standard: number; overUse: number; value: number }[];
}

export interface MovementReportRow {
  itemType: "PRODUCT" | "INGREDIENT";
  itemId: string;
  name: string;
  unit: string;
  category: string | null;
  opening: number;
  stockIn: number;
  stockOut: number;
  waste: number;
  theoreticalClosing: number;
  actualClosing: number | null;
  variance: number | null;
  varianceValue: number | null;
  counted: boolean;
}

export interface MovementReport {
  range: { from: string; to: string; label: string };
  rows: MovementReportRow[];
  totals: { shortageValue: number; surplusValue: number; itemsCounted: number; itemsShort: number };
}
