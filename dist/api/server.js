"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = void 0;
const express_1 = __importDefault(require("express"));
const dayjs_1 = __importDefault(require("dayjs"));
const zod_1 = require("zod");
const pantryState_1 = require("../domain/pantryState");
const pantryItemSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    quantity: zod_1.z.number().positive(),
    unit: zod_1.z.string().min(1),
    addedAt: zod_1.z.string().datetime(),
    shelfLifeDays: zod_1.z.number().int().positive(),
    storageZone: zod_1.z.enum(["fridge", "freezer", "pantry"]).optional(),
    expiresAt: zod_1.z.string().datetime().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
const pantryUpdateSchema = pantryItemSchema.partial();
const recipeSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    ingredients: zod_1.z.array(zod_1.z.string().min(1)).min(1),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
const priorityQuerySchema = zod_1.z.object({
    asOf: zod_1.z.string().datetime().optional(),
    limit: zod_1.z.number().int().positive().max(50).optional(),
    constraints: zod_1.z
        .object({
        requiredRecipeTags: zod_1.z.array(zod_1.z.string()).optional(),
        excludedRecipeTags: zod_1.z.array(zod_1.z.string()).optional(),
        excludedIngredients: zod_1.z.array(zod_1.z.string()).optional(),
    })
        .optional(),
});
const buildNowIso = () => (0, dayjs_1.default)().startOf("day").toISOString();
const createServer = () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.get("/health", (_req, res) => {
        res.status(200).json({ ok: true });
    });
    app.post("/pantry/items", (req, res) => {
        const parsed = pantryItemSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const item = pantryState_1.pantryState.addItem(parsed.data);
        return res.status(201).json(item);
    });
    app.get("/pantry/items", (req, res) => {
        const asOf = typeof req.query.asOf === "string" ? req.query.asOf : buildNowIso();
        const freshness = pantryState_1.pantryState.listFreshness(asOf);
        return res.status(200).json(freshness);
    });
    app.patch("/pantry/items/:id", (req, res) => {
        const parsed = pantryUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const item = pantryState_1.pantryState.updateItem(req.params.id, parsed.data);
        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }
        return res.status(200).json(item);
    });
    app.delete("/pantry/items/:id", (req, res) => {
        const removed = pantryState_1.pantryState.removeItem(req.params.id);
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
        const recipe = pantryState_1.pantryState.addRecipe(parsed.data);
        return res.status(201).json(recipe);
    });
    app.get("/recipes", (_req, res) => {
        return res.status(200).json(pantryState_1.pantryState.listRecipes());
    });
    app.post("/recipes/priority", (req, res) => {
        const parsed = priorityQuerySchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const asOf = parsed.data.asOf ?? buildNowIso();
        const ranked = pantryState_1.pantryState.getPriorityCookingList(asOf, parsed.data.constraints, parsed.data.limit ?? 10);
        return res.status(200).json(ranked);
    });
    return app;
};
exports.createServer = createServer;
//# sourceMappingURL=server.js.map