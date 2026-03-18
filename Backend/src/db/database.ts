import mongoose from "mongoose";

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/pastry-stock";

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("✅ MongoDB connecté:", MONGO_URL);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}