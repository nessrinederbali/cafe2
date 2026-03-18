import mongoose from "mongoose";

// StockItem = Ingrédients / matières premières (pas les produits du menu)
// Compatible avec l'interface StockItem du stock-context frontend

const stockItemSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  category: { type: String, required: true },  // slug de catégorie ingrédients

  quantity:    { type: Number, default: 0 },   // calculé automatiquement depuis les batches
  unit:        { type: String, enum: ["kg","g","L","ml","pieces","sachets","boites"], default: "kg" },
  minQuantity: { type: Number, required: true, default: 0 },
  unitPrice:   { type: Number, required: true, default: 0 },

  shelfLifeAfterOpening: { type: Number, default: null },  // durée en jours après ouverture
  supplier:   { type: String, default: "" },               // nom libre du fournisseur (legacy)
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null },

  is_active: { type: Boolean, default: true },
}, { timestamps: true });

// Virtual: is_low_stock
stockItemSchema.virtual("is_low_stock").get(function () {
  return this.quantity <= this.minQuantity;
});

stockItemSchema.set("toJSON", { virtuals: true });

export const StockItem = mongoose.model("StockItem", stockItemSchema);