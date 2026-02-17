import request from "supertest";
import { createServer } from "../src/api/server";

describe("pantry api", () => {
  it("returns health status", async () => {
    const app = createServer();
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("validates pantry item payload", async () => {
    const app = createServer();
    const response = await request(app).post("/pantry/items").send({
      name: "",
      quantity: -1,
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  it("ranks a created recipe in priority list and applies exclusions", async () => {
    const app = createServer();
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const ingredient = `LeafyGreen-${suffix}`;
    const recipeName = `Salad-${suffix}`;

    const itemResponse = await request(app).post("/pantry/items").send({
      name: ingredient,
      quantity: 1,
      unit: "bag",
      addedAt: "2026-02-10T00:00:00.000Z",
      shelfLifeDays: 8,
      tags: ["veg"],
    });
    expect(itemResponse.status).toBe(201);

    const recipeResponse = await request(app).post("/recipes").send({
      name: recipeName,
      ingredients: [ingredient],
      tags: ["vegan"],
    });
    expect(recipeResponse.status).toBe(201);

    const priority = await request(app).post("/recipes/priority").send({
      asOf: "2026-02-17T00:00:00.000Z",
      limit: 20,
    });

    expect(priority.status).toBe(200);
    expect(Array.isArray(priority.body)).toBe(true);
    expect(priority.body.some((entry: { recipe: { name: string } }) => entry.recipe.name === recipeName)).toBe(true);

    const excluded = await request(app).post("/recipes/priority").send({
      asOf: "2026-02-17T00:00:00.000Z",
      constraints: {
        excludedIngredients: [ingredient],
      },
      limit: 20,
    });

    expect(excluded.status).toBe(200);
    expect(
      excluded.body.some((entry: { recipe: { name: string } }) => entry.recipe.name === recipeName),
    ).toBe(false);
  });
});