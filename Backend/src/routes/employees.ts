import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Employee } from "../models/Employee";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

type Variables = { user: any };
const employees = new Hono<{ Variables: Variables }>();

const scheduleSchema = z.array(z.object({
  day:    z.enum(["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"]),
  start:  z.string().optional().default("08:00"),
  end:    z.string().optional().default("17:00"),
  is_off: z.boolean().optional().default(false),
})).optional().default([]);

// ─── GET /api/employees ───────────────────────────────────────────────────────
employees.get("/", authMiddleware, adminMiddleware, async (c) => {
  const { status, role } = c.req.query();
  const filter: any = { is_active: true };
  if (status) filter.status = status;
  if (role)   filter.role   = role;

  const data = await Employee.find(filter).sort({ name: 1 });
  return c.json({ success: true, data });
});

// ─── GET /api/employees/:id ───────────────────────────────────────────────────
employees.get("/:id", authMiddleware, adminMiddleware, async (c) => {
  const emp = await Employee.findById(c.req.param("id"));
  if (!emp) return c.json({ success: false, error: "Employé non trouvé" }, 404);
  return c.json({ success: true, data: emp });
});

// ─── POST /api/employees ──────────────────────────────────────────────────────
employees.post("/", authMiddleware, adminMiddleware, zValidator("json", z.object({
  name:      z.string().min(1),
  email:     z.string().email(),
  phone:     z.string().optional().default(""),
  role:      z.enum(["patissier","vendeur","livreur","caissier","manager","autre"]).optional().default("patissier"),
  status:    z.enum(["actif","conge","arret"]).optional().default("actif"),
  hire_date: z.string().optional(),
  salary:    z.number().min(0).optional().default(0),
  avatar:    z.string().optional().default(""),
  notes:     z.string().optional().default(""),
  schedule:  scheduleSchema,
}), (result, c) => {
  if (!result.success) {
    return c.json({ success: false, error: result.error.issues[0]?.message ?? "Données invalides" }, 400)
  }
}), async (c) => {
  const body = c.req.valid("json");

  const existing = await Employee.findOne({ email: body.email, is_active: true });
  if (existing) return c.json({ success: false, error: "Email déjà utilisé" }, 400);

  const emp = await Employee.create({
    ...body,
    hire_date: body.hire_date ? new Date(body.hire_date) : new Date(),
  });
  return c.json({ success: true, data: emp }, 201);
});

// ─── PUT /api/employees/:id ───────────────────────────────────────────────────
employees.put("/:id", authMiddleware, adminMiddleware, zValidator("json", z.object({
  name:      z.string().min(1).optional(),
  email:     z.string().email().optional(),
  phone:     z.string().optional(),
  role:      z.enum(["patissier","vendeur","livreur","caissier","manager","autre"]).optional(),
  status:    z.enum(["actif","conge","arret"]).optional(),
  hire_date: z.string().optional(),
  salary:    z.number().min(0).optional(),
  avatar:    z.string().optional(),
  notes:     z.string().optional(),
  schedule:  scheduleSchema,
})), async (c) => {
  const body = c.req.valid("json");
  const updateData: any = { ...body };
  if (body.hire_date) updateData.hire_date = new Date(body.hire_date);

  const emp = await Employee.findByIdAndUpdate(
    c.req.param("id"), updateData, { returnDocument: "after" }
  );
  if (!emp) return c.json({ success: false, error: "Employé non trouvé" }, 404);
  return c.json({ success: true, data: emp });
});

// ─── DELETE /api/employees/:id (soft delete) ──────────────────────────────────
employees.delete("/:id", authMiddleware, adminMiddleware, async (c) => {
  await Employee.findByIdAndUpdate(c.req.param("id"), { is_active: false });
  return c.json({ success: true });
});

// ─── PATCH /api/employees/:id/schedule ───────────────────────────────────────
employees.patch("/:id/schedule", authMiddleware, adminMiddleware, zValidator("json", z.object({
  schedule: scheduleSchema,
})), async (c) => {
  const { schedule } = c.req.valid("json");
  const emp = await Employee.findByIdAndUpdate(
    c.req.param("id"), { schedule }, { returnDocument: "after" }
  );
  if (!emp) return c.json({ success: false, error: "Employé non trouvé" }, 404);
  return c.json({ success: true, data: emp });
});

export default employees;