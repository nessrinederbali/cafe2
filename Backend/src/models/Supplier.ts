import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  email:       { type: String, default: "" },
  phone:       { type: String, default: "" },
  address:     { type: String, default: "" },
  contactName: { type: String, default: "" },
  notes:       { type: String, default: "" },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

export const Supplier = mongoose.model("Supplier", supplierSchema);