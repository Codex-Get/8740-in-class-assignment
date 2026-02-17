export type StorageZone = "fridge" | "freezer" | "pantry";

export interface PantryItemInput {
  name: string;
  quantity: number;
  unit: string;
  addedAt: string;
  shelfLifeDays: number;
  storageZone?: StorageZone;
  expiresAt?: string;
  tags?: string[];
}

export interface PantryItem extends PantryItemInput {
  id: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  tags?: string[];
}

export interface DietaryConstraints {
  requiredRecipeTags?: string[];
  excludedRecipeTags?: string[];
  excludedIngredients?: string[];
}

export interface FreshnessSnapshot {
  item: PantryItem;
  expiresAt: string;
  daysUntilExpiry: number;
  freshnessScore: number;
  urgencyScore: number;
  status: "fresh" | "warning" | "critical" | "expired";
}

export interface PriorityRecipe {
  recipe: Recipe;
  score: number;
  matchedItems: FreshnessSnapshot[];
}