import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Reward } from "../models/Reward";
import { User } from "../models/User";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

type Variables = { user: any };
const rewards = new Hono<{ Variables: Variables }>();

function fmt(r: any) {
  return {
    id:          String(r._id),
    name:        r.name,
    description: r.description,
    pointsCost:  r.pointsCost,
    type:        r.type,
    value:       r.value,
    image:       r.image || undefined,
    isActive:    r.isActive,
    createdAt:   r.createdAt,
    updatedAt:   r.updatedAt,
  };
}

// ─── GET /api/rewards ─────────────────────────────────────────────────────────
// Public — les clients voient les récompenses disponibles
rewards.get("/", async (c) => {
  const { active, type } = c.req.query();
  const filter: any = {};
  if (active === "true")  filter.isActive = true;
  if (active === "false") filter.isActive = false;
  if (type && type !== "all") filter.type = type;

  const data = await Reward.find(filter).sort({ pointsCost: 1 });
  return c.json({ success: true, data: data.map(fmt) });
});

// ─── GET /api/rewards/:id ─────────────────────────────────────────────────────
rewards.get("/:id", async (c) => {
  const r = await Reward.findById(c.req.param("id"));
  if (!r) return c.json({ success: false, error: "Récompense non trouvée" }, 404);
  return c.json({ success: true, data: fmt(r) });
});

// ─── POST /api/rewards ────────────────────────────────────────────────────────
rewards.post("/", authMiddleware, adminMiddleware,
  zValidator("json", z.object({
    name:        z.string().min(1),
    description: z.string().min(1),
    pointsCost:  z.number().int().min(1),
    type:        z.enum(["discount", "free_item", "special"]),
    value:       z.string().min(1),
    image:       z.string().optional().default(""),
    isActive:    z.boolean().optional().default(true),
  })),
  async (c) => {
    const r = await Reward.create(c.req.valid("json"));
    return c.json({ success: true, data: fmt(r) }, 201);
  }
);

// ─── PUT /api/rewards/:id ─────────────────────────────────────────────────────
rewards.put("/:id", authMiddleware, adminMiddleware,
  zValidator("json", z.object({
    name:        z.string().min(1).optional(),
    description: z.string().optional(),
    pointsCost:  z.number().int().min(1).optional(),
    type:        z.enum(["discount", "free_item", "special"]).optional(),
    value:       z.string().optional(),
    image:       z.string().optional(),
    isActive:    z.boolean().optional(),
  })),
  async (c) => {
    const r = await Reward.findByIdAndUpdate(c.req.param("id"), c.req.valid("json"), { returnDocument: 'after' });
    if (!r) return c.json({ success: false, error: "Récompense non trouvée" }, 404);
    return c.json({ success: true, data: fmt(r) });
  }
);

// ─── DELETE /api/rewards/:id ──────────────────────────────────────────────────
rewards.delete("/:id", authMiddleware, adminMiddleware, async (c) => {
  await Reward.findByIdAndDelete(c.req.param("id"));
  return c.json({ success: true });
});

// ─── POST /api/rewards/:id/redeem ─────────────────────────────────────────────
// Échange d'une récompense par un client (déduit ses points)
rewards.post("/:id/redeem", authMiddleware, async (c) => {
  const currentUser = c.get("user") as any;

  const reward = await Reward.findById(c.req.param("id"));
  if (!reward)          return c.json({ success: false, error: "Récompense non trouvée" }, 404);
  if (!reward.isActive) return c.json({ success: false, error: "Récompense non disponible" }, 400);

  const user = await User.findById(currentUser._id);
  if (!user) return c.json({ success: false, error: "Utilisateur non trouvé" }, 404);

  const currentPoints = user.loyaltyPoints || 0;
  if (currentPoints < reward.pointsCost) {
    return c.json({
      success: false,
      error: `Points insuffisants (${currentPoints} pts disponibles, ${reward.pointsCost} pts requis)`
    }, 400);
  }

  const newPoints = currentPoints - reward.pointsCost;
  await User.findByIdAndUpdate(currentUser._id, { loyaltyPoints: newPoints });

  return c.json({
    success: true,
    data: {
      reward: fmt(reward),
      pointsUsed:      reward.pointsCost,
      pointsRemaining: newPoints,
    }
  });
});

export default rewards;