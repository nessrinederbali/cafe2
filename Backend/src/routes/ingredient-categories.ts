import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { IngredientCategory } from "../models/IngredientCategory";
import { StockItem } from "../models/Stockitem";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

type Variables = { user: any };
const ingredientCategories = new Hono<{ Variables: Variables }>();

function fmt(c: any, itemCount = 0) {
  return {
    id:          String(c._id),
    name:        c.name,
    slug:        c.slug,
    description: c.description || "",
    icon:        c.icon || "📦",
    color:       c.color || "#6b7280",
    createdAt:   c.createdAt,
    updatedAt:   c.updatedAt,
    itemCount,
  };
}

// GET /api/ingredient-categories
ingredientCategories.get("/", async (c) => {
  const cats = await IngredientCategory.find({ isActive: true }).sort({ name: 1 });

  // Compter les articles par catégorie
  const counts = await StockItem.aggregate([
    { $match: { is_active: true } },
    { $group: { _id: "$category", count: { $sum: 1 } } }
  ]);
  const countMap = Object.fromEntries(counts.map((c: any) => [c._id, c.count]));

  return c.json({ success: true, data: cats.map(cat => fmt(cat, countMap[cat.slug] || 0)) });
});

// GET /api/ingredient-categories/:id
ingredientCategories.get("/:id", async (c) => {
  const cat = await IngredientCategory.findById(c.req.param("id"));
  if (!cat) return c.json({ success: false, error: "Catégorie non trouvée" }, 404);
  const itemCount = await StockItem.countDocuments({ category: cat.slug, is_active: true });
  return c.json({ success: true, data: fmt(cat, itemCount) });
});

// POST /api/ingredient-categories
ingredientCategories.post("/", authMiddleware, adminMiddleware,
  zValidator("json", z.object({
    name:        z.string().min(1),
    slug:        z.string().min(1),
    description: z.string().optional().default(""),
    icon:        z.string().optional().default("📦"),
    color:       z.string().optional().default("#6b7280"),
  })),
  async (c) => {
    const body = c.req.valid("json");
    const existing = await IngredientCategory.findOne({ slug: body.slug });
    if (existing) return c.json({ success: false, error: "Slug déjà utilisé" }, 400);
    const cat = await IngredientCategory.create(body);
    return c.json({ success: true, data: fmt(cat) }, 201);
  }
);

// PUT /api/ingredient-categories/:id
ingredientCategories.put("/:id", authMiddleware, adminMiddleware,
  zValidator("json", z.object({
    name:        z.string().min(1).optional(),
    slug:        z.string().optional(),
    description: z.string().optional(),
    icon:        z.string().optional(),
    color:       z.string().optional(),
  })),
  async (c) => {
    const cat = await IngredientCategory.findByIdAndUpdate(
      c.req.param("id"), c.req.valid("json"), { returnDocument: 'after' }
    );
    if (!cat) return c.json({ success: false, error: "Catégorie non trouvée" }, 404);
    return c.json({ success: true, data: fmt(cat) });
  }
);

// DELETE /api/ingredient-categories/:id
ingredientCategories.delete("/:id", authMiddleware, adminMiddleware, async (c) => {
  const cat = await IngredientCategory.findById(c.req.param("id"));
  if (!cat) return c.json({ success: false, error: "Catégorie non trouvée" }, 404);

  const itemCount = await StockItem.countDocuments({ category: cat.slug, is_active: true });

  await IngredientCategory.findByIdAndUpdate(c.req.param("id"), { isActive: false });
  return c.json({ success: true, data: { itemCount } });
});

export default ingredientCategories;