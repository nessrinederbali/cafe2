import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Promotion } from "../models/Promotion";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

type Variables = { user: any };
const promotions = new Hono<{ Variables: Variables }>();

// ─── CLIENT: POST /api/promotions/apply ───────────────────────────────────────
// Vérifie et retourne la réduction pour un code promo
promotions.post("/apply", authMiddleware, zValidator("json", z.object({
  code:        z.string().min(1),
  order_total: z.number().min(0),
})), async (c) => {
  const user = c.get("user") as any;
  const { code, order_total } = c.req.valid("json");

  const promo = await Promotion.findOne({ code: code.toUpperCase(), is_active: true });

  if (!promo) return c.json({ success: false, error: "Code promo invalide ou inexistant" }, 404);

  // Vérifier dates
  const now = new Date();
  if (promo.start_date && now < promo.start_date)
    return c.json({ success: false, error: "Ce code promo n'est pas encore actif" }, 400);
  if (promo.end_date && now > promo.end_date)
    return c.json({ success: false, error: "Ce code promo a expiré" }, 400);

  // Vérifier limite utilisations
  if ((promo.max_uses ?? null) !== null && promo.used_count >= (promo.max_uses ?? 0))
    return c.json({ success: false, error: "Ce code promo a atteint sa limite d'utilisations" }, 400);

  // Vérifier si client a déjà utilisé
  const alreadyUsed = promo.used_by.some((id: any) => id.toString() === user._id.toString());
  if (alreadyUsed)
    return c.json({ success: false, error: "Vous avez déjà utilisé ce code promo" }, 400);

  // Vérifier montant minimum
  if (order_total < promo.min_order)
    return c.json({
      success: false,
      error: `Montant minimum requis : ${promo.min_order.toFixed(2)} TND`
    }, 400);

  // Calculer réduction
  let discount = 0;
  if (promo.type === "percentage") {
    discount = Math.round((order_total * promo.value / 100) * 100) / 100;
  } else {
    discount = Math.min(promo.value, order_total);
  }

  return c.json({
    success: true,
    data: {
      code:        promo.code,
      description: promo.description,
      type:        promo.type,
      value:       promo.value,
      discount,
      final_total: Math.max(0, order_total - discount),
    }
  });
});

// ─── ADMIN: GET /api/promotions ───────────────────────────────────────────────
promotions.get("/", authMiddleware, adminMiddleware, async (c) => {
  const data = await Promotion.find().sort({ createdAt: -1 });
  return c.json({ success: true, data });
});

// ─── ADMIN: POST /api/promotions ──────────────────────────────────────────────
promotions.post("/", authMiddleware, adminMiddleware, zValidator("json", z.object({
  code:        z.string().min(1),
  description: z.string().optional().default(""),
  type:        z.enum(["percentage", "fixed"]).optional().default("percentage"),
  value:       z.number().min(0),
  min_order:   z.number().min(0).optional().default(0),
  max_uses:    z.number().int().min(1).nullable().optional(),
  start_date:  z.string().nullable().optional(),
  end_date:    z.string().nullable().optional(),
  is_active:   z.boolean().optional().default(true),
}), (result, c) => {
  if (!result.success)
    return c.json({ success: false, error: result.error.issues[0]?.message ?? "Données invalides" }, 400)
}), async (c) => {
  const body = c.req.valid("json");

  const existing = await Promotion.findOne({ code: body.code.toUpperCase() });
  if (existing) return c.json({ success: false, error: "Ce code promo existe déjà" }, 400);

  const promo = await Promotion.create({
    ...body,
    code:       body.code.toUpperCase(),
    start_date: body.start_date ? new Date(body.start_date) : null,
    end_date:   body.end_date   ? new Date(body.end_date)   : null,
  });
  return c.json({ success: true, data: promo }, 201);
});

// ─── ADMIN: PUT /api/promotions/:id ──────────────────────────────────────────
promotions.put("/:id", authMiddleware, adminMiddleware, zValidator("json", z.object({
  description: z.string().optional(),
  type:        z.enum(["percentage", "fixed"]).optional(),
  value:       z.number().min(0).optional(),
  min_order:   z.number().min(0).optional(),
  max_uses:    z.number().int().min(1).nullable().optional(),
  start_date:  z.string().nullable().optional(),
  end_date:    z.string().nullable().optional(),
  is_active:   z.boolean().optional(),
})), async (c) => {
  const body = c.req.valid("json");
  const updateData: any = { ...body };
  if (body.start_date !== undefined) updateData.start_date = body.start_date ? new Date(body.start_date) : null;
  if (body.end_date   !== undefined) updateData.end_date   = body.end_date   ? new Date(body.end_date)   : null;

  const promo = await Promotion.findByIdAndUpdate(c.req.param("id"), updateData, { returnDocument: "after" });
  if (!promo) return c.json({ success: false, error: "Promotion non trouvée" }, 404);
  return c.json({ success: true, data: promo });
});

// ─── ADMIN: DELETE /api/promotions/:id ───────────────────────────────────────
promotions.delete("/:id", authMiddleware, adminMiddleware, async (c) => {
  await Promotion.findByIdAndDelete(c.req.param("id"));
  return c.json({ success: true });
});

// ─── ADMIN: PATCH /api/promotions/:id/toggle ─────────────────────────────────
promotions.patch("/:id/toggle", authMiddleware, adminMiddleware, async (c) => {
  const promo = await Promotion.findById(c.req.param("id"));
  if (!promo) return c.json({ success: false, error: "Promotion non trouvée" }, 404);
  promo.is_active = !promo.is_active;
  await promo.save();
  return c.json({ success: true, data: { is_active: promo.is_active } });
});

export default promotions;