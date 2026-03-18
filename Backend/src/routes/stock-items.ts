import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { StockItem } from "../models/Stockitem";
import { Batch } from "../models/Batch";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

type Variables = { user: any };
const stockItems = new Hono<{ Variables: Variables }>();

// Helper — format compatible StockItem type du stock-context frontend
function fmt(item: any) {
  return {
    id:                    String(item._id),
    name:                  item.name,
    category:              item.category,
    quantity:              item.quantity,
    unit:                  item.unit,
    minQuantity:           item.minQuantity,
    unitPrice:             item.unitPrice,
    shelfLifeAfterOpening: item.shelfLifeAfterOpening ?? undefined,
    supplier:              item.supplier || undefined,
    supplierId:            item.supplierId ? String(item.supplierId) : undefined,
    lastUpdated:           item.updatedAt,
    createdAt:             item.createdAt,
    updatedAt:             item.updatedAt,
  };
}

// ─── GET /api/stock-items ─────────────────────────────────────────────────────
stockItems.get("/", async (c) => {
  const { search, category, status } = c.req.query();
  const filter: any = { is_active: true };

  if (search) filter.name = { $regex: search, $options: "i" };
  if (category && category !== "all") filter.category = category;

  if (status === "low")     filter.$expr = { $lte: ["$quantity", "$minQuantity"] };
  if (status === "warning") filter.$expr = { $and: [
    { $gt: ["$quantity", "$minQuantity"] },
    { $lte: ["$quantity", { $multiply: ["$minQuantity", 1.5] }] }
  ]};
  if (status === "ok")      filter.$expr = { $gt: ["$quantity", { $multiply: ["$minQuantity", 1.5] }] };

  const data = await StockItem.find(filter)
    .populate("supplierId", "name")
    .sort({ createdAt: 1 });  // FIFO order

  return c.json({ success: true, data: data.map(fmt) });
});

// ─── GET /api/stock-items/low-stock ──────────────────────────────────────────
stockItems.get("/low-stock", async (c) => {
  const data = await StockItem.find({
    is_active: true,
    $expr: { $lte: ["$quantity", "$minQuantity"] }
  }).sort({ quantity: 1 });
  return c.json({ success: true, data: data.map(fmt) });
});

// ─── GET /api/stock-items/:id ─────────────────────────────────────────────────
stockItems.get("/:id", async (c) => {
  const item = await StockItem.findById(c.req.param("id"))
    .populate("supplierId", "name phone email");
  if (!item) return c.json({ success: false, error: "Article non trouvé" }, 404);
  return c.json({ success: true, data: fmt(item) });
});

// ─── POST /api/stock-items ────────────────────────────────────────────────────
stockItems.post("/", authMiddleware, adminMiddleware,
  zValidator("json", z.object({
    name:                  z.string().min(1),
    category:              z.string().min(1),
    unit:                  z.enum(["kg","g","L","ml","pieces","sachets","boites"]),
    minQuantity:           z.number().min(0),
    unitPrice:             z.number().min(0),
    shelfLifeAfterOpening: z.number().int().min(1).optional(),
    supplier:              z.string().optional().default(""),
    supplierId:            z.string().optional(),
  })),
  async (c) => {
    const body = c.req.valid("json");
    const item = await StockItem.create({
      ...body,
      quantity: 0,   // toujours 0 à la création — calculé depuis les batches
      supplierId: body.supplierId || null,
    });
    return c.json({ success: true, data: fmt(item) }, 201);
  }
);

// ─── PUT /api/stock-items/:id ─────────────────────────────────────────────────
stockItems.put("/:id", authMiddleware, adminMiddleware,
  zValidator("json", z.object({
    name:                  z.string().min(1).optional(),
    category:              z.string().optional(),
    unit:                  z.enum(["kg","g","L","ml","pieces","sachets","boites"]).optional(),
    minQuantity:           z.number().min(0).optional(),
    unitPrice:             z.number().min(0).optional(),
    shelfLifeAfterOpening: z.number().int().min(1).optional().nullable(),
    supplier:              z.string().optional(),
    supplierId:            z.string().optional().nullable(),
  })),
  async (c) => {
    const body = c.req.valid("json");
    const item = await StockItem.findByIdAndUpdate(c.req.param("id"), body, { returnDocument: 'after' });
    if (!item) return c.json({ success: false, error: "Article non trouvé" }, 404);
    return c.json({ success: true, data: fmt(item) });
  }
);

// ─── DELETE /api/stock-items/:id ──────────────────────────────────────────────
stockItems.delete("/:id", authMiddleware, adminMiddleware, async (c) => {
  const item = await StockItem.findByIdAndUpdate(
    c.req.param("id"), { is_active: false }, { returnDocument: 'after' }
  );
  if (!item) return c.json({ success: false, error: "Article non trouvé" }, 404);
  return c.json({ success: true });
});

// ─── POST /api/stock-items/:id/recalculate ────────────────────────────────────
// Recalcule la quantité totale depuis les batches actifs
stockItems.post("/:id/recalculate", authMiddleware, adminMiddleware, async (c) => {
  const id = c.req.param("id");
  const activeBatches = await Batch.find({
    productId: id,
    isArchived: false,
  });
  const total = activeBatches.reduce((sum: number, b: any) => sum + (b.quantity || 0), 0);

  const item = await StockItem.findByIdAndUpdate(id, { quantity: total }, { returnDocument: 'after' });
  if (!item) return c.json({ success: false, error: "Article non trouvé" }, 404);
  return c.json({ success: true, data: fmt(item) });
});

export default stockItems;