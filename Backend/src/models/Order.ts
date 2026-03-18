import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product_id:   { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  product_name: { type: String, required: true },
  quantity:     { type: Number, required: true },
  unit_price:   { type: Number, required: true },
});

const orderSchema = new mongoose.Schema({
  // Client info
  client_id:     { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  client_name:   { type: String, required: true },
  client_phone:  { type: String, default: "" },
  client_email:  { type: String, default: "" },

  // Order details
  status:        {
    type: String,
    enum: ["pending","confirmed","preparing","ready","delivered","cancelled"],
    default: "pending"
  },
  items:         [orderItemSchema],
  total_amount:  { type: Number, required: true },
  notes:         { type: String, default: "" },
  delivery_date: { type: Date, default: null },

  // Loyalty
  loyalty_points_earned: { type: Number, default: 0 },
  loyalty_points_used:   { type: Number, default: 0 },
}, { timestamps: true });

export const Order = mongoose.model("Order", orderSchema);