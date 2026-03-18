import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Batch } from "../models/Batch";
import { Product } from "../models/Product";
import { StockItem } from "../models/Stockitem";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

type Variables = { user: any };
const batches = new Hono<{ Variables: Variables }>();

// Helper: formate un batch pour le frontend (compatible stock-context Batch type)
function formatBatch(b: any) {
  return {
    id:                     String(b._id),
    productId:              String(b.productId),
    supplierId:             b.supplierId ? String(b.supplierId) : undefined,
    batchNumber:            b.batchNumber,
    quantity:               b.quantity,
    receptionDate:          b.receptionDate?.toISOString().split("T")[0],
    productionDate:         b.productionDate?.toISOString().split("T")[0] ?? undefined,
    expirationDate:         b.expirationDate?.toISOString().split("T")[0],
    isOpened:               b.isOpened,
    openingDate:            b.openingDate?.toISOString().split("T")[0] ?? undefined,
    expirationAfterOpening: b.expirationAfterOpening?.toISOString().split("T")[0] ?? undefined,
    daysAfterOpening:       b.daysAfterOpening ?? undefined,
    notes:                  b.notes,
    isArchived:             b.isArchived,
    createdAt:              b.createdAt,
  };
}

// ─── GET /api/batches ─────────────────────────────────────────────────────────
// Tous les batches (admin) ou filtrés par produit
batches.get("/", async (c) => {
  const { productId, expired, archived } = c.req.query();
  const filter: any = {};

  if (productId)           filter.productId = productId;
  if (archived === "true") filter.isArchived = true;
  else                     filter.isArchived = false;

  if (expired === "true") {
    filter.expirationDate = { $lt: new Date() };
  } else if (expired === "false") {
    filter.expirationDate = { $gte: new Date() };
  }

  const data = await Batch.find(filter)
    .populate("supplierId", "name phone email")
    .sort({ expirationDate: 1 });

  return c.json({ success: true, data: data.map(formatBatch) });
});

// ─── GET /api/batches/expiring-soon ───────────────────────────────────────────
// Batches qui expirent dans les X jours (défaut: 7)
batches.get("/expiring-soon", async (c) => {
  const days = Number(c.req.query("days") || 7);
  const soon = new Date();
  soon.setDate(soon.getDate() + days);

  const data = await Batch.find({
    isArchived: false,
    expirationDate: { $gte: new Date(), $lte: soon },
  })
    .populate("productId", "name category")
    .populate("supplierId", "name")
    .sort({ expirationDate: 1 });

  return c.json({ success: true, data: data.map(formatBatch) });
});

// ─── GET /api/batches/:id ─────────────────────────────────────────────────────
batches.get("/:id", async (c) => {
  const batch = await Batch.findById(c.req.param("id"))
    .populate("supplierId", "name phone email")
    .populate("productId", "name category");
  if (!batch) return c.json({ success: false, error: "Lot non trouvé" }, 404);
  return c.json({ success: true, data: formatBatch(batch) });
});

// ─── POST /api/batches ────────────────────────────────────────────────────────
batches.post("/", authMiddleware, adminMiddleware, zValidator("json", z.object({
  productId:       z.string().min(1),
  supplierId:      z.string().optional(),
  batchNumber:     z.string().min(1),
  quantity:        z.number().int().min(1),
  receptionDate:   z.string(),
  productionDate:  z.string().optional(),
  expirationDate:  z.string(),
  daysAfterOpening: z.number().int().min(0).optional(),
  notes:           z.string().optional().default(""),
})), async (c) => {
  const body = c.req.valid("json");

  // Vérifier que le produit existe (StockItem en priorité, sinon Product menu)
  const stockItem = await StockItem.findById(body.productId).catch(() => null);
  const menuProduct = !stockItem ? await Product.findById(body.productId).catch(() => null) : null;
  if (!stockItem && !menuProduct) return c.json({ success: false, error: "Produit non trouvé" }, 404);

  const batch = await Batch.create({
    ...body,
    receptionDate:  new Date(body.receptionDate),
    productionDate: body.productionDate ? new Date(body.productionDate) : null,
    expirationDate: new Date(body.expirationDate),
    supplierId:     body.supplierId || null,
  });

  // Mettre à jour la quantité (StockItem = somme batches, Product = incrément)
  if (stockItem) {
    const allBatches = await Batch.find({ productId: body.productId, isArchived: false });
    const total = allBatches.reduce((s: number, b: any) => s + (b.quantity || 0), 0);
    await StockItem.findByIdAndUpdate(body.productId, { quantity: total });
  } else {
    await Product.findByIdAndUpdate(body.productId, { $inc: { current_stock: body.quantity } });
  }

  return c.json({ success: true, data: formatBatch(batch) }, 201);
});

// ─── PUT /api/batches/:id ─────────────────────────────────────────────────────
batches.put("/:id", authMiddleware, adminMiddleware, zValidator("json", z.object({
  batchNumber:     z.string().min(1).optional(),
  quantity:        z.number().int().min(0).optional(),
  supplierId:      z.string().optional(),
  receptionDate:   z.string().optional(),
  productionDate:  z.string().optional(),
  expirationDate:  z.string().optional(),
  daysAfterOpening: z.number().int().min(0).optional(),
  notes:           z.string().optional(),
})), async (c) => {
  const body = c.req.valid("json");
  const updateData: any = { ...body };

  if (body.receptionDate)  updateData.receptionDate  = new Date(body.receptionDate);
  if (body.productionDate) updateData.productionDate = new Date(body.productionDate);
  if (body.expirationDate) updateData.expirationDate = new Date(body.expirationDate);

  const batch = await Batch.findByIdAndUpdate(c.req.param("id"), updateData, { returnDocument: 'after' });
  if (!batch) return c.json({ success: false, error: "Lot non trouvé" }, 404);

  // Recalculer la quantité totale du StockItem si quantity modifiée
  if (body.quantity !== undefined) {
    const isStockItem = await StockItem.findById(batch.productId).catch(() => null);
    if (isStockItem) {
      const allBatches = await Batch.find({ productId: batch.productId, isArchived: false });
      const total = allBatches.reduce((s: number, b: any) => s + (b.quantity || 0), 0);
      await StockItem.findByIdAndUpdate(batch.productId, { quantity: total });
    }
  }

  return c.json({ success: true, data: formatBatch(batch) });
});

// ─── POST /api/batches/:id/open ───────────────────────────────────────────────
// Marque un batch comme ouvert + calcule expirationAfterOpening
batches.post("/:id/open", authMiddleware, adminMiddleware, zValidator("json", z.object({
  openingDate:      z.string(),                           // date d'ouverture
  daysAfterOpening: z.number().int().min(1).optional(),   // override si défini sur le batch
})), async (c) => {
  const { openingDate, daysAfterOpening } = c.req.valid("json");

  const batch = await Batch.findById(c.req.param("id"));
  if (!batch) return c.json({ success: false, error: "Lot non trouvé" }, 404);
  if (batch.isOpened) return c.json({ success: false, error: "Lot déjà ouvert" }, 400);

  const openDate = new Date(openingDate);
  const days = daysAfterOpening ?? batch.daysAfterOpening ?? 3; // défaut 3 jours

  const expAfterOpen = new Date(openDate);
  expAfterOpen.setDate(expAfterOpen.getDate() + days);

  // La DLC après ouverture ne peut pas dépasser la DLC originale
  const finalExp = expAfterOpen < batch.expirationDate ? expAfterOpen : batch.expirationDate;

  const updated = await Batch.findByIdAndUpdate(c.req.param("id"), {
    isOpened: true,
    openingDate: openDate,
    expirationAfterOpening: finalExp,
  }, { returnDocument: 'after' });

  return c.json({ success: true, data: formatBatch(updated!) });
});

// ─── PATCH /api/batches/:id/quantity ─────────────────────────────────────────
// Met à jour la quantité d'un batch (consommation partielle)
batches.patch("/:id/quantity", authMiddleware, adminMiddleware, zValidator("json", z.object({
  quantity: z.number().int().min(0),
})), async (c) => {
  const { quantity } = c.req.valid("json");
  const batch = await Batch.findById(c.req.param("id"));
  if (!batch) return c.json({ success: false, error: "Lot non trouvé" }, 404);

  const diff = quantity - batch.quantity;  // positif = ajout, négatif = retrait

  const updated = await Batch.findByIdAndUpdate(
    c.req.param("id"), { quantity }, { returnDocument: 'after' }
  );

  // Mettre à jour le stock produit
  await Product.findByIdAndUpdate(batch.productId, {
    $inc: { current_stock: diff }
  });

  return c.json({ success: true, data: formatBatch(updated!) });
});

// ─── DELETE /api/batches/:id ──────────────────────────────────────────────────
batches.delete("/:id", authMiddleware, adminMiddleware, async (c) => {
  const batch = await Batch.findById(c.req.param("id"));
  if (!batch) return c.json({ success: false, error: "Lot non trouvé" }, 404);

  // Déduire la quantité du stock produit
  await Product.findByIdAndUpdate(batch.productId, {
    $inc: { current_stock: -batch.quantity }
  });

  await Batch.findByIdAndDelete(c.req.param("id"));
  return c.json({ success: true });
});

// ─── POST /api/batches/:id/archive ────────────────────────────────────────────
batches.post("/:id/archive", authMiddleware, adminMiddleware, async (c) => {
  const updated = await Batch.findByIdAndUpdate(
    c.req.param("id"), { isArchived: true }, { returnDocument: 'after' }
  );
  return c.json({ success: true, data: formatBatch(updated!) });
});

export default batches;