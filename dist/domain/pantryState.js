"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pantryState = exports.PantryStateManager = void 0;
const freshness_1 = require("./freshness");
const normalize = (value) => value.trim().toLowerCase();
const overlaps = (left, right) => {
    const rightSet = new Set(right.map(normalize));
    return left.some((value) => rightSet.has(normalize(value)));
};
const hasAllTags = (targetTags, requiredTags) => {
    const set = new Set(targetTags.map(normalize));
    return requiredTags.every((tag) => set.has(normalize(tag)));
};
class PantryStateManager {
    constructor() {
        this.items = new Map();
        this.recipes = new Map();
        this.itemCounter = 1;
        this.recipeCounter = 1;
    }
    addItem(input) {
        const id = `item-${this.itemCounter++}`;
        const item = {
            id,
            storageZone: "fridge",
            tags: [],
            ...input,
        };
        this.items.set(id, item);
        return item;
    }
    updateItem(id, patch) {
        const existing = this.items.get(id);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            ...patch,
        };
        this.items.set(id, updated);
        return updated;
    }
    removeItem(id) {
        return this.items.delete(id);
    }
    listFreshness(asOf) {
        const snapshots = Array.from(this.items.values()).map((item) => (0, freshness_1.computeFreshness)(item, asOf));
        return snapshots.sort((left, right) => right.urgencyScore - left.urgencyScore);
    }
    addRecipe(recipe) {
        const id = `recipe-${this.recipeCounter++}`;
        const persisted = {
            id,
            ...recipe,
        };
        this.recipes.set(id, persisted);
        return persisted;
    }
    listRecipes() {
        return Array.from(this.recipes.values());
    }
    getPriorityCookingList(asOf, constraints = {}, limit = 10) {
        const freshness = this.listFreshness(asOf);
        const freshnessByIngredient = new Map();
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
            const urgencyAverage = ingredientMatches.reduce((sum, current) => sum + current.urgencyScore, 0) /
                ingredientMatches.length;
            const expiredBoost = ingredientMatches.some((entry) => entry.status === "expired") ? 0.2 : 0;
            const score = Math.min(1, urgencyAverage * 0.75 + usageCoverage * 0.25 + expiredBoost);
            return {
                recipe,
                score,
                matchedItems: ingredientMatches,
            };
        })
            .filter((value) => value !== null)
            .sort((left, right) => right.score - left.score);
        return scored.slice(0, limit);
    }
    filterRecipesByDietaryConstraints(constraints) {
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
exports.PantryStateManager = PantryStateManager;
exports.pantryState = new PantryStateManager();
//# sourceMappingURL=pantryState.js.map