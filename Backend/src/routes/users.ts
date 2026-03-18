import { Hono } from "hono";
import { authMiddleware, adminMiddleware } from "../middleware/auth";
import { User } from "../models/User";

type Variables = { user: any };
const users = new Hono<{ Variables: Variables }>();

// GET /api/users — liste tous les users (admin only)
users.get("/", authMiddleware, adminMiddleware, async (c) => {
  const data = await User.find().select("-password").sort({ createdAt: -1 });
  return c.json({ success: true, data });
});

// GET /api/users/clients — liste clients seulement (admin only)
// ⚠️ DOIT être avant /:id pour éviter le conflit ObjectId
users.get("/clients", authMiddleware, adminMiddleware, async (c) => {
  const data = await User.find({ role: "client" }).select("-password").sort({ createdAt: -1 });
  return c.json({ success: true, data });
});

// GET /api/users/:id
users.get("/:id", authMiddleware, adminMiddleware, async (c) => {
  const user = await User.findById(c.req.param("id")).select("-password");
  if (!user) return c.json({ success: false, error: "Utilisateur non trouvé" }, 404);
  return c.json({ success: true, data: user });
});

// PATCH /api/users/:id/role
users.patch("/:id/role", authMiddleware, adminMiddleware, async (c) => {
  const body = await c.req.json();
  const user = await User.findByIdAndUpdate(
    c.req.param("id"),
    { role: body.role },
    { returnDocument: "after" }
  ).select("-password");
  return c.json({ success: true, data: user });
});

// PATCH /api/users/:id/loyalty — ajouter/retirer des points (admin only)
users.patch("/:id/loyalty", authMiddleware, adminMiddleware, async (c) => {
  const { pointsChange } = await c.req.json();
  const user = await User.findById(c.req.param("id"));
  if (!user) return c.json({ success: false, error: "Utilisateur non trouvé" }, 404);

  user.loyaltyPoints = Math.max(0, (user.loyaltyPoints || 0) + pointsChange);

  const pts = user.loyaltyPoints;
  if (pts >= 1000)     user.loyaltyTier = "Platinum";
  else if (pts >= 500) user.loyaltyTier = "Gold";
  else if (pts >= 200) user.loyaltyTier = "Silver";
  else                 user.loyaltyTier = "Bronze";

  await user.save();
  return c.json({ success: true, data: {
    id: String(user._id), name: user.name, email: user.email,
    loyaltyPoints: user.loyaltyPoints, loyaltyTier: user.loyaltyTier,
  }});
});

// DELETE /api/users/:id (soft delete)
users.delete("/:id", authMiddleware, adminMiddleware, async (c) => {
  await User.findByIdAndUpdate(c.req.param("id"), { isActive: false });
  return c.json({ success: true });
});

export default users;