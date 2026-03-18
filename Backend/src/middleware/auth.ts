import type { Context, Next } from "hono";

export type Variables = { user: any };
import jwt from "jsonwebtoken";
import { User } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "pastry_super_secret_jwt_2024";

export function generateToken(userId: string): string {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
}

// Middleware — vérifie le JWT et attache l'user au context
export async function authMiddleware(c: Context<{ Variables: Variables }>, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Token manquant" }, 401);
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return c.json({ success: false, error: "Token manquant" }, 401);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { id: string };
    const user = await User.findById(decoded.id).select("-password");
    if (!user || !user.isActive) {
      return c.json({ success: false, error: "Utilisateur non trouvé" }, 401);
    }
    c.set("user", user);
    await next();
  } catch {
    return c.json({ success: false, error: "Token invalide" }, 401);
  }
}

// Middleware — réservé aux admins et users (pas les clients)
export async function adminMiddleware(c: Context<{ Variables: Variables }>, next: Next) {
  const user = c.get("user") as any;
  if (!user || (user.role !== "admin" && user.role !== "user")) {
    return c.json({ success: false, error: "Accès refusé" }, 403);
  }
  await next();
}