import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  email:         { type: String, required: true, unique: true, lowercase: true },
  password:      { type: String, required: true },  // hashed with Bun.password
  role:          { type: String, enum: ["admin", "user", "client"], default: "client" },
  loyaltyPoints: { type: Number, default: 0 },
  loyaltyTier:   { type: String, enum: ["Bronze", "Silver", "Gold", "Platinum"], default: "Bronze" },
  phone:         { type: String, default: "" },
  address:       { type: String, default: "" },
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });

// Compute loyalty tier from points
userSchema.methods.updateTier = function () {
  if (this.loyaltyPoints >= 1000)     this.loyaltyTier = "Platinum";
  else if (this.loyaltyPoints >= 500) this.loyaltyTier = "Gold";
  else if (this.loyaltyPoints >= 200) this.loyaltyTier = "Silver";
  else                                this.loyaltyTier = "Bronze";
};

export const User = mongoose.model("User", userSchema);