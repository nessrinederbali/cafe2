import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

type Variables = { user: any };
const categories = new Hono<{ Variables: Variables }>();

// ─── PUBLIC: GET /api/categories ──────────────────────────────────────────────
categories.get("/", async (c) => {
  const cats = await Category.find({ isActive: true }).sort({ order: 1 });
  const result = await Promise.all(cats.map(async cat => ({
    ...cat.toObject(),
    product_count: await Product.countDocuments({ category: cat.slug, is_active: true }),
  })));
  return c.json({ success: true, data: result });
});

// ─── ADMIN: POST /api/categories ──────────────────────────────────────────────
categories.post("/", authMiddleware, adminMiddleware, zValidator("json", z.object({
  name:        z.string().min(1),
  slug:        z.string().min(1),
  description: z.string().optional().default(""),
  icon:        z.string().optional().default("🍰"),
  order:       z.number().optional().default(0),
})), async (c) => {
  const cat = await Category.create(c.req.valid("json"));
  return c.json({ success: true, data: cat }, 201);
});

// ─── ADMIN: PUT /api/categories/:id ───────────────────────────────────────────
categories.put("/:id", authMiddleware, adminMiddleware, zValidator("json", z.object({
  name:        z.string().min(1).optional(),
  description: z.string().optional(),
  icon:        z.string().optional(),
  order:       z.number().optional(),
  isActive:    z.boolean().optional(),
})), async (c) => {
  const cat = await Category.findByIdAndUpdate(c.req.param("id"), c.req.valid("json"), { returnDocument: 'after' });
  return c.json({ success: true, data: cat });
});

// ─── ADMIN: DELETE /api/categories/:id ────────────────────────────────────────
categories.delete("/:id", authMiddleware, adminMiddleware, async (c) => {
  await Category.findByIdAndUpdate(c.req.param("id"), { isActive: false });
  return c.json({ success: true });
});

export default categories;