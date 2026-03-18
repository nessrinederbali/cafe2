import mongoose from "mongoose";

// Catégories pour les ingrédients/matières premières
// (Séparé de Category qui est pour le menu client)

const ingredientCategorySchema = new mongoose.Schema({
  name:        { type: String, required: true },
  slug:        { type: String, required: true, unique: true },
  description: { type: String, default: "" },
  icon:        { type: String, default: "📦" },
  color:       { type: String, default: "#6b7280" },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

export const IngredientCategory = mongoose.model("IngredientCategory", ingredientCategorySchema);