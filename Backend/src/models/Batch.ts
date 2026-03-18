import mongoose from "mongoose";

const batchSchema = new mongoose.Schema({
  productId:   { type: mongoose.Schema.Types.ObjectId, required: true, ref: "StockItem" },
  supplierId:  { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null },

  batchNumber: { type: String, required: true },
  quantity:    { type: Number, required: true, min: 0 },

  receptionDate:  { type: Date, required: true },
  productionDate: { type: Date, default: null },
  expirationDate: { type: Date, required: true },

  isOpened:               { type: Boolean, default: false },
  openingDate:            { type: Date, default: null },
  expirationAfterOpening: { type: Date, default: null },
  daysAfterOpening:       { type: Number, default: null },

  notes:      { type: String, default: "" },
  isArchived: { type: Boolean, default: false },
}, { timestamps: true });

batchSchema.index({ productId: 1, expirationDate: 1 });

export const Batch = mongoose.model("Batch", batchSchema);