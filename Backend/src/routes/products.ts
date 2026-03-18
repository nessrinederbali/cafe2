import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Product } from "../models/Product";
import { StockMovement } from "../models/StockMovement";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

const products = new Hono();

// ─── PUBLIC: GET /api/products/menu ───────────────────────────────────────────
// Utilisé par le frontend client (MenuContent) — retourne isAvailable products
products.get("/menu", async (c) => {
  const { category } = c.req.query();
  const filter: any = { is_active: true, isAvailable: true };
  if (category) filter.category = category;

  const data = await Product.find(filter).sort({ name: 1 });

  // Retourne le format attendu par le frontend (menuItems)
  const menuItems = data.map(p => ({
    id: p._id,
    name: p.name,
    description: p.description,
    category: p.category,
    price: p.price,
    image: p.image || "/placeholder.svg?height=150&width=150",
    allergens: p.allergens,
    tags: p.tags,
    isAvailable: p.isAvailable,
  }));

  return c.json({ success: true, data: menuItems });
});

// ─── PUBLIC: GET /api/products/categories ─────────────────────────────────────
// Retourne les catégories pour le menu (menuCategories dans le frontend)
products.get("/categories-menu", async (c) => {
  const { Category } = await import("../models/Category");
  const cats = await Category.find({ isActive: true }).sort({ order: 1 });
  return c.json({ success: true, data: cats });
});

// ─── ADMIN: GET /api/products ─────────────────────────────────────────────────
products.get("/", authMiddleware, adminMiddleware, async (c) => {
  const { search, category, low_stock } = c.req.query();
  const filter: any = { is_active: true };

  if (search)   filter.name = { $regex: search, $options: "i" };
  if (category) filter.category = category;

  let data = await Product.find(filter).populate("category_id", "name").sort({ name: 1 });

  if (low_stock === "true") {
    data = data.filter(p => p.current_stock <= p.min_stock);
  }

  return c.json({ success: true, data });
});

// ─── ADMIN: GET /api/products/:id ─────────────────────────────────────────────
products.get("/:id", authMiddleware, adminMiddleware, async (c) => {
  const product = await Product.findById(c.req.param("id"));
  if (!product) return c.json({ success: false, error: "Produit non trouvé" }, 404);

  const movements = await StockMovement.find({ product_id: product._id })
    .sort({ createdAt: -1 }).limit(20);

  return c.json({ success: true, data: { ...product.toJSON(), movements } });
});

// ─── ADMIN: POST /api/products ────────────────────────────────────────────────
products.post("/", authMiddleware, adminMiddleware, zValidator("json", z.object({
  name:          z.string().min(1),
  description:   z.string().optional().default(""),
  category:      z.string().min(1),
  category_id:   z.string().optional(),
  price:         z.number().min(0),
  cost_price:    z.number().min(0).optional().default(0),
  unit:          z.enum(["pièce","kg","lot","boîte","paquet"]).default("pièce"),
  current_stock: z.number().int().min(0).default(0),
  min_stock:     z.number().int().min(0).default(5),
  image:         z.string().optional().default(""),
  allergens:     z.array(z.string()).optional().default([]),
  tags:          z.array(z.string()).optional().default([]),
  isAvailable:   z.boolean().optional().default(true),
})), async (c) => {
  const body = c.req.valid("json");
  const product = await Product.create(body);
  return c.json({ success: true, data: product }, 201);
});

// ─── ADMIN: PUT /api/products/:id ─────────────────────────────────────────────
products.put("/:id", authMiddleware, adminMiddleware, zValidator("json", z.object({
  name:          z.string().min(1).optional(),
  description:   z.string().optional(),
  category:      z.string().optional(),
  price:         z.number().min(0).optional(),
  cost_price:    z.number().min(0).optional(),
  unit:          z.enum(["pièce","kg","lot","boîte","paquet"]).optional(),
  min_stock:     z.number().int().min(0).optional(),
  image:         z.string().optional(),
  allergens:     z.array(z.string()).optional(),
  tags:          z.array(z.string()).optional(),
  isAvailable:   z.boolean().optional(),
})), async (c) => {
  const product = await Product.findByIdAndUpdate(
    c.req.param("id"), c.req.valid("json"), { new: true }
  );
  if (!product) return c.json({ success: false, error: "Produit non trouvé" }, 404);
  return c.json({ success: true, data: product });
});

// ─── ADMIN: DELETE /api/products/:id (soft delete) ───────────────────────────
products.delete("/:id", authMiddleware, adminMiddleware, async (c) => {
  await Product.findByIdAndUpdate(c.req.param("id"), { is_active: false });
  return c.json({ success: true, message: "Produit supprimé" });
});

// ─── ADMIN: POST /api/products/:id/stock ──────────────────────────────────────
products.post("/:id/stock", authMiddleware, adminMiddleware, zValidator("json", z.object({
  type:      z.enum(["in","out","adjustment","loss"]),
  quantity:  z.number().int().min(1),
  note:      z.string().optional().default(""),
  reference: z.string().optional().default(""),
})), async (c) => {
  const product = await Product.findById(c.req.param("id"));
  if (!product) return c.json({ success: false, error: "Produit non trouvé" }, 404);

  const { type, quantity, note, reference } = c.req.valid("json");

  if ((type === "out" || type === "loss") && product.current_stock < quantity) {
    return c.json({
      success: false,
      error: `Stock insuffisant. Actuel: ${product.current_stock}`
    }, 400);
  }

  const delta = (type === "in" || type === "adjustment") ? quantity : -quantity;
  product.current_stock += delta;
  await product.save();

  await StockMovement.create({ product_id: product._id, type, quantity, note, reference });

  return c.json({ success: true, data: product });
});

export default products;