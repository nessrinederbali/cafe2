import { email } from './../../node_modules/zod/src/v4/core/regexes';
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Order } from "../models/Order";
import { User } from "../models/User";
import { authMiddleware, adminMiddleware } from "../middleware/auth";
import { sendOrderConfirmation, sendOrderStatusUpdate } from "../services/Email";

type Variables = { user: any };
const orders = new Hono<{ Variables: Variables }>();

// ─── CLIENT: POST /api/orders ─────────────────────────────────────────────────
orders.post("/", authMiddleware, zValidator("json", z.object({
  items: z.array(z.object({
    product_id:   z.string(),
    product_name: z.string(),
    quantity:     z.number().int().min(1),
    unit_price:   z.number().min(0),
  })).min(1, { message: "Le panier est vide" }),
  notes:               z.string().optional().default(""),
  delivery_date:       z.string().optional(),
  loyalty_points_used: z.number().int().min(0).optional().default(0),
}), (result, c) => {
  // Retourner un message d'erreur lisible si la validation échoue
  if (!result.success) {
    const firstError = result.error.issues[0]
    return c.json({
      success: false,
      error: firstError?.message || "Données invalides",
      details: result.error.issues,
    }, 400)
  }
}), async (c) => {
  const user = c.get("user") as any;
  const body = c.req.valid("json");

  const total = body.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

  // Loyalty points: 1 point par TND dépensé
  const pointsEarned = Math.floor(total);
  const pointsUsed   = Math.min(body.loyalty_points_used || 0, user.loyaltyPoints || 0);
  const discount     = pointsUsed * 0.01;
  const finalTotal   = Math.max(0, total - discount);

  const order = await Order.create({
    client_id:    user._id,
    client_name:  user.name,
    client_email: user.email,
    client_phone: user.phone || "",
    items:        body.items,
    total_amount: finalTotal,
    notes:        body.notes,
    delivery_date: body.delivery_date ? new Date(body.delivery_date) : null,
    loyalty_points_earned: pointsEarned,
    loyalty_points_used:   pointsUsed,
  });

  // Envoyer email confirmation (sans bloquer)
  sendOrderConfirmation({
    client_name:            user.name,
    client_email:           user.email,
    _id:                    String(order._id),
    items:                  body.items.map(i => ({
      product_name: i.product_name,
      quantity:     i.quantity,
      unit_price:   i.unit_price,
    })),
    total_amount:           finalTotal,
    loyalty_points_earned:  pointsEarned,
  }).catch(e => console.error("Email order confirmation:", e))

  // Mettre à jour les points de fidélité
  const updatedUser = await User.findById(user._id);
  if (updatedUser) {
    updatedUser.loyaltyPoints = (updatedUser.loyaltyPoints || 0) + pointsEarned - pointsUsed;
    if (updatedUser.loyaltyPoints < 0) updatedUser.loyaltyPoints = 0;
    if (typeof (updatedUser as any).updateTier === "function") {
      (updatedUser as any).updateTier();
    }
    await updatedUser.save();
  }

  return c.json({
    success: true,
    data: {
      order,
      loyalty_points_earned: pointsEarned,
      new_loyalty_total: updatedUser?.loyaltyPoints,
    }
  }, 201);
});

// ─── CLIENT: GET /api/orders/my ───────────────────────────────────────────────
orders.get("/my", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const data = await Order.find({ client_id: user._id }).sort({ createdAt: -1 });
  return c.json({ success: true, data });
});

// ─── ADMIN: GET /api/orders ───────────────────────────────────────────────────
orders.get("/", authMiddleware, adminMiddleware, async (c) => {
  const { status } = c.req.query();
  const filter: any = {};
  if (status) filter.status = status;
  const data = await Order.find(filter)
    .populate("client_id", "name email loyaltyPoints")
    .sort({ createdAt: -1 });
  return c.json({ success: true, data });
});

// ─── ADMIN: GET /api/orders/:id ───────────────────────────────────────────────
orders.get("/:id", authMiddleware, adminMiddleware, async (c) => {
  const order = await Order.findById(c.req.param("id"))
    .populate("client_id", "name email phone loyaltyPoints loyaltyTier");
  if (!order) return c.json({ success: false, error: "Commande non trouvée" }, 404);
  return c.json({ success: true, data: order });
});

// ─── ADMIN: PATCH /api/orders/:id/status ──────────────────────────────────────
orders.patch("/:id/status", authMiddleware, adminMiddleware, zValidator("json", z.object({
  status: z.enum(["pending","confirmed","preparing","ready","delivered","cancelled"]),
})), async (c) => {
  const order = await Order.findByIdAndUpdate(
    c.req.param("id"),
    { status: c.req.valid("json").status },
    { returnDocument: 'after' }
  );
  if (!order) return c.json({ success: false, error: "Commande non trouvée" }, 404);

  // Envoyer email statut (sans bloquer)
  sendOrderStatusUpdate({
    client_name:  order.client_name,
    client_email: order.client_email,
    _id:          String(order._id),
    status:       order.status,
    total_amount: order.total_amount,
  }).catch(e => console.error("Email status update:", e))

  return c.json({ success: true, data: order });
});

export default orders;