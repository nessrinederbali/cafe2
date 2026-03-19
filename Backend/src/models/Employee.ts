import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema({
  day:       { type: String, enum: ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"], required: true },
  start:     { type: String, default: "08:00" },  // HH:mm
  end:       { type: String, default: "17:00" },
  is_off:    { type: Boolean, default: false },    // jour de repos
}, { _id: false });

const employeeSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  email:      { type: String, required: true, unique: true, lowercase: true },
  phone:      { type: String, default: "" },
  role:       { type: String, enum: ["patissier","vendeur","livreur","caissier","manager","autre"], default: "patissier" },
  status:     { type: String, enum: ["actif","conge","arret"], default: "actif" },
  hire_date:  { type: Date, default: Date.now },
  salary:     { type: Number, default: 0 },
  avatar:     { type: String, default: "" },
  notes:      { type: String, default: "" },
  schedule:   { type: [scheduleSchema], default: [] },
  is_active:  { type: Boolean, default: true },
}, { timestamps: true });

export const Employee = mongoose.model("Employee", employeeSchema);