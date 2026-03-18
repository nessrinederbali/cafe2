import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  description:   { type: String, default: "" },
  category:      { type: String, required: true },          // slug de catégorie
  category_id:   { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  price:         { type: Number, required: true },           // selling price (affiché au client)
  cost_price:    { type: Number, default: 0 },               // prix de revient (admin seulement)
  unit:          { type: String, enum: ["pièce","kg","lot","boîte","paquet"], default: "pièce" },
  current_stock: { type: Number, default: 0 },
  min_stock:     { type: Number, default: 5 },
  image:         { type: String, default: "" },
  allergens:     { type: [String], default: [] },
  tags:          { type: [String], default: [] },
  quantity:      { type: Number, default: null },             // stock menu item (null = illimité)
  isAvailable:   { type: Boolean, default: true },           // visible dans le menu client
  is_active:     { type: Boolean, default: true },           // non supprimé
  expiryDate:    { type: Date, default: null },
}, { timestamps: true });

// Virtual: is_low_stock
productSchema.virtual("is_low_stock").get(function () {
  return this.current_stock <= this.min_stock;
});

productSchema.set("toJSON", { virtuals: true });

export const Product = mongoose.model("Product", productSchema);