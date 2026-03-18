import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

type Variables = { user: any };
const menu = new Hono<{ Variables: Variables }>();

// ── Helper: format product → menuItem ─────────────────────────────────────────
function formatProduct(p: any) {
  return {
    id:          String(p._id),
    name:        p.name,
    description: p.description,
    price:       p.price,
    category:    p.category,
    image:       p.image,
    allergens:   p.allergens,
    tags:        p.tags,
    isAvailable: p.isAvailable,
    quantity:    p.quantity ?? null,   // ← null = illimité
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC (sans auth)
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/menu/items/public
menu.get("/items/public", async (c) => {
  const { category } = c.req.query();
  const filter: any = { is_active: true, isAvailable: true };
  if (category && category !== "all") filter.category = category;

  const products = await Product.find(filter).sort({ createdAt: -1 });
  return c.json({ success: true, data: products.map(formatProduct) });
});

// GET /api/menu/categories/public
menu.get("/categories/public", async (c) => {
  const cats = await Category.find({ isActive: true }).sort({ order: 1 });
  const data = cats.map(c => ({
    id: String(c._id), name: c.name, slug: c.slug,
    icon: c.icon, order: c.order, isActive: c.isActive,
  }));
  return c.json({ success: true, data });
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — MENU ITEMS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/menu/items
menu.get("/items", authMiddleware, adminMiddleware, async (c) => {
  const { search, category, page = "1", limit = "12" } = c.req.query();
  const filter: any = { is_active: true };
  if (search)   filter.name = { $regex: search, $options: "i" };
  if (category && category !== "all") filter.category = category;

  const total = await Product.countDocuments(filter);
  const skip  = (Number(page) - 1) * Number(limit);
  const data  = await Product.find(filter).skip(skip).limit(Number(limit)).sort({ name: 1 });

  return c.json({
    success: true,
    data: data.map(formatProduct),
    pagination: {
      total, page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    }
  });
});

// POST /api/menu/items
menu.post("/items", authMiddleware, adminMiddleware, zValidator("json", z.object({
  name:        z.string().min(1),
  description: z.string().optional().default(""),
  price:       z.number().min(0),
  category:    z.string().min(1),
  image:       z.string().optional().default(""),
  allergens:   z.array(z.string()).optional().default([]),
  tags:        z.array(z.string()).optional().default([]),
  isAvailable: z.boolean().optional().default(true),
  quantity:    z.number().int().min(0).nullable().optional(), // ← nouveau
  cost_price:  z.number().min(0).optional().default(0),
  unit:        z.enum(["pièce","kg","lot","boîte","paquet"]).optional().default("pièce"),
  min_stock:   z.number().int().min(0).optional().default(5),
})), async (c) => {
  const body = c.req.valid("json");
  const cat  = await Category.findOne({ slug: body.category, isActive: true });

  const product = await Product.create({
    ...body,
    category_id: cat?._id ?? null,
  });

  return c.json({ success: true, data: formatProduct(product) }, 201);
});

// PUT /api/menu/items/:id
menu.put("/items/:id", authMiddleware, adminMiddleware, zValidator("json", z.object({
  name:        z.string().min(1).optional(),
  description: z.string().optional(),
  price:       z.number().min(0).optional(),
  category:    z.string().optional(),
  image:       z.string().optional(),
  allergens:   z.array(z.string()).optional(),
  tags:        z.array(z.string()).optional(),
  isAvailable: z.boolean().optional(),
  quantity:    z.number().int().min(0).nullable().optional(), // ← nouveau
  cost_price:  z.number().min(0).optional(),
})), async (c) => {
  const body = c.req.valid("json");
  const updateData: any = { ...body };

  if (body.category) {
    const cat = await Category.findOne({ slug: body.category, isActive: true });
    if (cat) updateData.category_id = cat._id;
  }

  // Si quantity passe à 0 → marquer non disponible automatiquement
  if (updateData.quantity === 0) {
    updateData.isAvailable = false;
  }

  const product = await Product.findByIdAndUpdate(
    c.req.param("id"),
    updateData,
    { returnDocument: 'after' }
  );
  if (!product) return c.json({ success: false, error: "Produit non trouvé" }, 404);

  return c.json({ success: true, data: formatProduct(product) });
});

// DELETE /api/menu/items/:id
menu.delete("/items/:id", authMiddleware, adminMiddleware, async (c) => {
  await Product.findByIdAndUpdate(c.req.param("id"), { is_active: false, isAvailable: false });
  return c.json({ success: true });
});

// PATCH /api/menu/items/:id/toggle
menu.patch("/items/:id/toggle", authMiddleware, adminMiddleware, async (c) => {
  const product = await Product.findById(c.req.param("id"));
  if (!product) return c.json({ success: false, error: "Produit non trouvé" }, 404);
  product.isAvailable = !product.isAvailable;
  await product.save();
  return c.json({ success: true, data: { isAvailable: product.isAvailable } });
});

// ══════════════════════════════════════════════════════════════════════════════
// MENU CATEGORIES
// ══════════════════════════════════════════════════════════════════════════════

menu.get("/categories", async (c) => {
  const data = await Category.find({ isActive: true }).sort({ order: 1 });
  const menuCategories = data.map(c => ({
    id: String(c._id), name: c.name, slug: c.slug,
    icon: c.icon, order: c.order, isActive: c.isActive,
  }));
  return c.json({ success: true, data: menuCategories });
});

menu.post("/categories", authMiddleware, adminMiddleware, zValidator("json", z.object({
  name:        z.string().min(1),
  slug:        z.string().min(1),
  icon:        z.string().optional().default("🍰"),
  order:       z.number().optional().default(0),
  description: z.string().optional().default(""),
})), async (c) => {
  const body = c.req.valid("json");
  const existing = await Category.findOne({ slug: body.slug });
  if (existing) return c.json({ success: false, error: "Slug déjà utilisé" }, 400);
  const cat = await Category.create(body);
  return c.json({
    success: true,
    data: { id: String(cat._id), name: cat.name, slug: cat.slug, icon: cat.icon, order: cat.order, isActive: cat.isActive }
  }, 201);
});

menu.put("/categories/:id", authMiddleware, adminMiddleware, zValidator("json", z.object({
  name:        z.string().min(1).optional(),
  icon:        z.string().optional(),
  order:       z.number().optional(),
  isActive:    z.boolean().optional(),
  description: z.string().optional(),
})), async (c) => {
  const cat = await Category.findByIdAndUpdate(c.req.param("id"), c.req.valid("json"), { returnDocument: 'after' });
  if (!cat) return c.json({ success: false, error: "Catégorie non trouvée" }, 404);
  return c.json({ success: true, data: cat });
});

menu.delete("/categories/:id", authMiddleware, adminMiddleware, async (c) => {
  await Category.findByIdAndUpdate(c.req.param("id"), { isActive: false });
  return c.json({ success: true });
});

export default menu;