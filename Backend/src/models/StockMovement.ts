import mongoose from "mongoose";

const stockMovementSchema = new mongoose.Schema({
  product_id:  { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  type:        { type: String, enum: ["in","out","adjustment","loss"], required: true },
  quantity:    { type: Number, required: true },
  note:        { type: String, default: "" },
  reference:   { type: String, default: "" },
  created_by:  { type: String, default: "admin" },
}, { timestamps: true });

export const StockMovement = mongoose.model("StockMovement", stockMovementSchema);