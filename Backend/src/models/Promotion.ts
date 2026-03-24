import mongoose from "mongoose";

const promotionSchema = new mongoose.Schema({
  code:          { type: String, required: true, unique: true, uppercase: true, trim: true },
  description:   { type: String, default: "" },
  type:          { type: String, enum: ["percentage", "fixed"], default: "percentage" },
  value:         { type: Number, required: true, min: 0 },  // % ou TND fixe
  min_order:     { type: Number, default: 0 },              // montant minimum commande
  max_uses:      { type: Number, default: null },           // null = illimité
  used_count:    { type: Number, default: 0 },
  start_date:    { type: Date, default: null },
  end_date:      { type: Date, default: null },
  is_active:     { type: Boolean, default: true },
  used_by:       [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // clients qui ont utilisé
}, { timestamps: true });

export const Promotion = mongoose.model("Promotion", promotionSchema);