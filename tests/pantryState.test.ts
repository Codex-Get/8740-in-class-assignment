import dayjs from "dayjs";
import { PantryStateManager } from "../src/domain/pantryState";

describe("PantryStateManager", () => {
  it("prioritizes recipes that consume the most urgent ingredients", () => {
    const state = new PantryStateManager();
    const asOf = "2026-02-17T00:00:00.000Z";

    state.addItem({
      name: "Spinach",
      quantity: 1,
      unit: "bag",
      addedAt: dayjs(asOf).subtract(5, "day").toISOString(),
      shelfLifeDays: 6,
    });

    state.addItem({
      name: "Rice",
      quantity: 1,
      unit: "kg",
      addedAt: dayjs(asOf).subtract(7, "day").toISOString(),
      shelfLifeDays: 180,
    });

    state.addRecipe({
      name: "Spinach Stir Fry",
      ingredients: ["Spinach", "Garlic"],
      tags: ["vegetarian"],
    });

    state.addRecipe({
      name: "Plain Rice",
      ingredients: ["Rice"],
      tags: ["vegan", "vegetarian"],
    });

    const ranked = state.getPriorityCookingList(asOf);
    expect(ranked[0].recipe.name).toBe("Spinach Stir Fry");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it("respects dietary constraints when ranking recipes", () => {
    const state = new PantryStateManager();
    const asOf = "2026-02-17T00:00:00.000Z";

    state.addItem({
      name: "Tofu",
      quantity: 1,
      unit: "block",
      addedAt: "2026-02-14T00:00:00.000Z",
      shelfLifeDays: 7,
    });

    state.addItem({
      name: "Cheese",
      quantity: 1,
      unit: "pack",
      addedAt: "2026-02-12T00:00:00.000Z",
      shelfLifeDays: 10,
    });

    state.addRecipe({
      name: "Tofu Bowl",
      ingredients: ["Tofu"],
      tags: ["vegan"],
    });

    state.addRecipe({
      name: "Cheese Toast",
      ingredients: ["Cheese"],
      tags: ["vegetarian"],
    });

    const ranked = state.getPriorityCookingList(asOf, {
      requiredRecipeTags: ["vegan"],
      excludedIngredients: ["Cheese"],
    });

    expect(ranked).toHaveLength(1);
    expect(ranked[0].recipe.name).toBe("Tofu Bowl");
  });
});