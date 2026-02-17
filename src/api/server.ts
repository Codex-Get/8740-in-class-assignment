import express from "express";
import path from "path";
import dayjs from "dayjs";
import { z } from "zod";
import { pantryState } from "../domain/pantryState";

const pantryItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  addedAt: z.string().datetime(),
  shelfLifeDays: z.number().int().positive(),
  storageZone: z.enum(["fridge", "freezer", "pantry"]).optional(),
  expiresAt: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
});

const pantryUpdateSchema = pantryItemSchema.partial();

const recipeSchema = z.object({
  name: z.string().min(1),
  ingredients: z.array(z.string().min(1)).min(1),
  tags: z.array(z.string()).optional(),
});

const priorityQuerySchema = z.object({
  asOf: z.string().datetime().optional(),
  limit: z.number().int().positive().max(50).optional(),
  constraints: z
    .object({
      requiredRecipeTags: z.array(z.string()).optional(),
      excludedRecipeTags: z.array(z.string()).optional(),
      excludedIngredients: z.array(z.string()).optional(),
    })
    .optional(),
});

const buildNowIso = (): string => dayjs().startOf("day").toISOString();

export const createServer = () => {
  const app = express();
  app.use(express.json());

  // Serve static files from the public directory
  app.use(express.static(path.join(__dirname, "../../public")));

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.post("/pantry/items", (req, res) => {
    const parsed = pantryItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const item = pantryState.addItem(parsed.data);
    return res.status(201).json(item);
  });

  app.get("/pantry/items", (req, res) => {
    const asOf = typeof req.query.asOf === "string" ? req.query.asOf : buildNowIso();
    const freshness = pantryState.listFreshness(asOf);
    return res.status(200).json(freshness);
  });

  app.patch("/pantry/items/:id", (req, res) => {
    const parsed = pantryUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const item = pantryState.updateItem(req.params.id, parsed.data);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    return res.status(200).json(item);
  });

  app.delete("/pantry/items/:id", (req, res) => {
    const removed = pantryState.removeItem(req.params.id);
    if (!removed) {
      return res.status(404).json({ error: "Item not found" });
    }

    return res.status(204).send();
  });

  app.post("/recipes", (req, res) => {
    const parsed = recipeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const recipe = pantryState.addRecipe(parsed.data);
    return res.status(201).json(recipe);
  });

  app.get("/recipes", (_req, res) => {
    return res.status(200).json(pantryState.listRecipes());
  });

  app.post("/recipes/priority", (req, res) => {
    const parsed = priorityQuerySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const asOf = parsed.data.asOf ?? buildNowIso();
    const ranked = pantryState.getPriorityCookingList(
      asOf,
      parsed.data.constraints,
      parsed.data.limit ?? 10,
    );

    return res.status(200).json(ranked);
  });

  return app;
};