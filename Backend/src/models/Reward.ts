import mongoose from "mongoose";

const rewardSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String, required: true },
  pointsCost:  { type: Number, required: true, min: 1 },
  type:        { type: String, enum: ["discount", "free_item", "special"], required: true },
  value:       { type: String, required: true },   // "5 TND", "1 croissant", etc.
  image:       { type: String, default: "" },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

export const Reward = mongoose.model("Reward", rewardSchema);