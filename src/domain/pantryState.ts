import { computeFreshness } from "./freshness";
import {
  DietaryConstraints,
  FreshnessSnapshot,
  PantryItem,
  PantryItemInput,
  PriorityRecipe,
  Recipe,
} from "./models";

const normalize = (value: string): string => value.trim().toLowerCase();

const overlaps = (left: string[], right: string[]): boolean => {
  const rightSet = new Set(right.map(normalize));
  return left.some((value) => rightSet.has(normalize(value)));
};

const hasAllTags = (targetTags: string[], requiredTags: string[]): boolean => {
  const set = new Set(targetTags.map(normalize));
  return requiredTags.every((tag) => set.has(normalize(tag)));
};

export class PantryStateManager {
  private readonly items = new Map<string, PantryItem>();

  private readonly recipes = new Map<string, Recipe>();

  private itemCounter = 1;

  private recipeCounter = 1;

  addItem(input: PantryItemInput): PantryItem {
    const id = `item-${this.itemCounter++}`;
    const item: PantryItem = {
      id,
      storageZone: "fridge",
      tags: [],
      ...input,
    };

    this.items.set(id, item);
    return item;
  }

  updateItem(id: string, patch: Partial<PantryItemInput>): PantryItem | null {
    const existing = this.items.get(id);
    if (!existing) {
      return null;
    }

    const updated: PantryItem = {
      ...existing,
      ...patch,
    };

    this.items.set(id, updated);
    return updated;
  }

  removeItem(id: string): boolean {
    return this.items.delete(id);
  }

  listFreshness(asOf: string): FreshnessSnapshot[] {
    const snapshots = Array.from(this.items.values()).map((item) => computeFreshness(item, asOf));
    return snapshots.sort((left, right) => right.urgencyScore - left.urgencyScore);
  }

  addRecipe(recipe: Omit<Recipe, "id">): Recipe {
    const id = `recipe-${this.recipeCounter++}`;
    const persisted: Recipe = {
      id,
      ...recipe,
    };

    this.recipes.set(id, persisted);
    return persisted;
  }

  listRecipes(): Recipe[] {
    return Array.from(this.recipes.values());
  }

  getPriorityCookingList(
    asOf: string,
    constraints: DietaryConstraints = {},
    limit = 10,
  ): PriorityRecipe[] {
    const freshness = this.listFreshness(asOf);
    const freshnessByIngredient = new Map<string, FreshnessSnapshot[]>();

    for (const snapshot of freshness) {
      const key = normalize(snapshot.item.name);
      const existing = freshnessByIngredient.get(key) ?? [];
      existing.push(snapshot);
      freshnessByIngredient.set(key, existing);
    }

    const recipes = this.filterRecipesByDietaryConstraints(constraints);
    const scored = recipes
      .map((recipe) => {
        const ingredientMatches = recipe.ingredients
          .flatMap((ingredient) => freshnessByIngredient.get(normalize(ingredient)) ?? [])
          .sort((a, b) => b.urgencyScore - a.urgencyScore);

        if (ingredientMatches.length === 0) {
          return null;
        }

        const recipeIngredientSet = new Set(recipe.ingredients.map(normalize));
        const matchedNames = new Set(ingredientMatches.map((match) => normalize(match.item.name)));

        const usageCoverage = matchedNames.size / Math.max(recipeIngredientSet.size, 1);
        const urgencyAverage =
          ingredientMatches.reduce((sum, current) => sum + current.urgencyScore, 0) /
          ingredientMatches.length;
        const expiredBoost = ingredientMatches.some((entry) => entry.status === "expired") ? 0.2 : 0;

        const score = Math.min(1, urgencyAverage * 0.75 + usageCoverage * 0.25 + expiredBoost);

        return {
          recipe,
          score,
          matchedItems: ingredientMatches,
        } satisfies PriorityRecipe;
      })
      .filter((value): value is PriorityRecipe => value !== null)
      .sort((left, right) => right.score - left.score);

    return scored.slice(0, limit);
  }

  private filterRecipesByDietaryConstraints(constraints: DietaryConstraints): Recipe[] {
    const requiredRecipeTags = constraints.requiredRecipeTags ?? [];
    const excludedRecipeTags = constraints.excludedRecipeTags ?? [];
    const excludedIngredients = constraints.excludedIngredients ?? [];

    return Array.from(this.recipes.values()).filter((recipe) => {
      const tags = recipe.tags ?? [];

      if (requiredRecipeTags.length > 0 && !hasAllTags(tags, requiredRecipeTags)) {
        return false;
      }

      if (excludedRecipeTags.length > 0 && overlaps(tags, excludedRecipeTags)) {
        return false;
      }

      if (excludedIngredients.length > 0 && overlaps(recipe.ingredients, excludedIngredients)) {
        return false;
      }

      return true;
    });
  }
}

export const pantryState = new PantryStateManager();