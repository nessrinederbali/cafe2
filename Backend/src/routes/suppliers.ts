import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Supplier } from "../models/Supplier";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

type Variables = { user: any };
const suppliers = new Hono<{ Variables: Variables }>();

function fmt(s: any) {
  return {
    id:          String(s._id),
    name:        s.name,
    contactName: s.contactName || "",
    email:       s.email || "",
    phone:       s.phone || "",
    address:     s.address || "",
    notes:       s.notes || "",
    status:      s.isActive ? "active" : "inactive" as "active" | "inactive",
    createdAt:   s.createdAt,
    updatedAt:   s.updatedAt,
  };
}

// GET /api/suppliers
suppliers.get("/", async (c) => {
  const { status, search } = c.req.query();
  const filter: any = {};
  if (status === "active")   filter.isActive = true;
  if (status === "inactive") filter.isActive = false;
  if (search) {
    filter.$or = [
      { name:        { $regex: search, $options: "i" } },
      { contactName: { $regex: search, $options: "i" } },
      { email:       { $regex: search, $options: "i" } },
      { phone:       { $regex: search, $options: "i" } },
    ];
  }
  const data = await Supplier.find(filter).sort({ name: 1 });
  return c.json({ success: true, data: data.map(fmt) });
});

// GET /api/suppliers/:id
suppliers.get("/:id", async (c) => {
  const s = await Supplier.findById(c.req.param("id"));
  if (!s) return c.json({ success: false, error: "Fournisseur non trouvé" }, 404);
  return c.json({ success: true, data: fmt(s) });
});

// POST /api/suppliers
suppliers.post("/", authMiddleware, adminMiddleware,
  zValidator("json", z.object({
    name:        z.string().min(1),
    contactName: z.string().optional().default(""),
    email:       z.string().optional().default(""),
    phone:       z.string().optional().default(""),
    address:     z.string().optional().default(""),
    notes:       z.string().optional().default(""),
    status:      z.enum(["active","inactive"]).optional().default("active"),
  })),
  async (c) => {
    const body = c.req.valid("json");
    const s = await Supplier.create({ ...body, isActive: body.status === "active" });
    return c.json({ success: true, data: fmt(s) }, 201);
  }
);

// PUT /api/suppliers/:id
suppliers.put("/:id", authMiddleware, adminMiddleware,
  zValidator("json", z.object({
    name:        z.string().min(1).optional(),
    contactName: z.string().optional(),
    email:       z.string().optional(),
    phone:       z.string().optional(),
    address:     z.string().optional(),
    notes:       z.string().optional(),
    status:      z.enum(["active","inactive"]).optional(),
  })),
  async (c) => {
    const body = c.req.valid("json");
    const update: any = { ...body };
    if (body.status !== undefined) { update.isActive = body.status === "active"; delete update.status; }
    const s = await Supplier.findByIdAndUpdate(c.req.param("id"), update, { returnDocument: 'after' });
    if (!s) return c.json({ success: false, error: "Fournisseur non trouvé" }, 404);
    return c.json({ success: true, data: fmt(s) });
  }
);

// DELETE /api/suppliers/:id
suppliers.delete("/:id", authMiddleware, adminMiddleware, async (c) => {
  const s = await Supplier.findByIdAndUpdate(c.req.param("id"), { isActive: false }, { returnDocument: 'after' });
  if (!s) return c.json({ success: false, error: "Fournisseur non trouvé" }, 404);
  return c.json({ success: true, data: fmt(s) });
});

export default suppliers;