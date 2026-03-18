import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { User } from "../models/User";
import { generateToken, authMiddleware } from "../middleware/auth";

type Variables = { user: any };
const auth = new Hono<{ Variables: Variables }>();

// ─── POST /api/auth/register ──────────────────────────────────────────────────
auth.post("/register", zValidator("json", z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(6),
  role:     z.enum(["admin","user","client"]).default("client"),
})), async (c) => {
  const { name, email, password, role } = c.req.valid("json");

  const existing = await User.findOne({ email });
  if (existing) {
    return c.json({ success: false, error: "Email déjà utilisé" }, 400);
  }

  // Hash password with Bun's built-in (bcrypt compatible)
  const hashedPassword = await Bun.password.hash(password);

  const user = await User.create({ name, email, password: hashedPassword, role });
  const token = generateToken(String(user._id));

  return c.json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        loyaltyPoints: user.loyaltyPoints,
        loyaltyTier: user.loyaltyTier,
      }
    }
  }, 201);
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
auth.post("/login", zValidator("json", z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})), async (c) => {
  const { email, password } = c.req.valid("json");

  const user = await User.findOne({ email, isActive: true });
  if (!user) {
    return c.json({ success: false, error: "Email ou mot de passe incorrect" }, 401);
  }

  const isValid = await Bun.password.verify(password, user.password);
  if (!isValid) {
    return c.json({ success: false, error: "Email ou mot de passe incorrect" }, 401);
  }

  const token = generateToken(String(user._id));

  return c.json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        loyaltyPoints: user.loyaltyPoints,
        loyaltyTier: user.loyaltyTier,
      }
    }
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
auth.get("/me", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  return c.json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      loyaltyPoints: user.loyaltyPoints,
      loyaltyTier: user.loyaltyTier,
      phone: user.phone,
      address: user.address,
    }
  });
});

// ─── PUT /api/auth/me ─────────────────────────────────────────────────────────
auth.put("/me", authMiddleware, zValidator("json", z.object({
  name:          z.string().min(2).optional(),
  phone:         z.string().optional(),
  address:       z.string().optional(),
  loyaltyPoints: z.number().min(0).optional(),
  loyaltyTier:   z.enum(["Bronze","Silver","Gold","Platinum"]).optional(),
  totalSpent:    z.number().min(0).optional(),
})), async (c) => {
  const user = c.get("user") as any;
  const body = c.req.valid("json");
  const updated = await User.findByIdAndUpdate(user._id, body, { returnDocument: 'after' }).select("-password");
  return c.json({ success: true, data: updated });
});

export default auth;