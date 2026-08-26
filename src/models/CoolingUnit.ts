import { Schema, model, Document, Types } from "mongoose";
import crypto from "crypto";

export interface ICoolingUnit extends Document {
  hub: Types.ObjectId;
  unitCode: string;
  type: "cold_room" | "evaporative_cooler" | "solar_fridge" | "freezer" | "mobile_trailer";
  capacityKg: number;
  /** Number of modular cold baskets this unit can hold (e.g. 110 for a SOLTECH trailer). */
  basketCapacity?: number;
  currentTemperatureC?: number;
  status: "active" | "maintenance" | "decommissioned";
  installedAt?: Date;
  lastServicedAt?: Date;
  /** Shared secret an IoT device on this unit presents to authenticate telemetry uploads. */
  deviceKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const coolingUnitSchema = new Schema<ICoolingUnit>(
  {
    hub: { type: Schema.Types.ObjectId, ref: "CoolingHub", required: true },
    unitCode: { type: String, required: true, trim: true, unique: true },
    type: {
      type: String,
      enum: ["cold_room", "evaporative_cooler", "solar_fridge", "freezer", "mobile_trailer"],
      required: true,
    },
    capacityKg: { type: Number, required: true, min: 0 },
    basketCapacity: { type: Number, min: 0 },
    currentTemperatureC: { type: Number },
    status: {
      type: String,
      enum: ["active", "maintenance", "decommissioned"],
      default: "active",
    },
    installedAt: { type: Date },
    lastServicedAt: { type: Date },
    deviceKey: {
      type: String,
      select: false,
      default: () => crypto.randomBytes(24).toString("hex"),
    },
  },
  { timestamps: true }
);

export const CoolingUnit = model<ICoolingUnit>("CoolingUnit", coolingUnitSchema);
