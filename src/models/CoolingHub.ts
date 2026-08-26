import { Schema, model, Document, Types } from "mongoose";

export interface ICoolingHub extends Document {
  name: string;
  organization?: Types.ObjectId;
  community: string;
  state: string;
  coordinates?: { lat: number; lng: number };
  energySource: "solar" | "solar_hybrid" | "grid" | "generator";
  status: "operational" | "maintenance" | "offline";
  managedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const coolingHubSchema = new Schema<ICoolingHub>(
  {
    name: { type: String, required: true, trim: true },
    organization: { type: Schema.Types.ObjectId, ref: "Organization" },
    community: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    energySource: {
      type: String,
      enum: ["solar", "solar_hybrid", "grid", "generator"],
      default: "solar",
    },
    status: {
      type: String,
      enum: ["operational", "maintenance", "offline"],
      default: "operational",
    },
    managedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const CoolingHub = model<ICoolingHub>("CoolingHub", coolingHubSchema);
