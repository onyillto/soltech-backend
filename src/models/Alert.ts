import { Schema, model, Document, Types } from "mongoose";

/**
 * A cold-chain temperature alert: the unit ran hot for too long while it had
 * produce in it. System-generated only (from telemetry ingestion) — never
 * created directly by a client.
 */
export interface IAlert extends Document {
  unit: Types.ObjectId;
  hub: Types.ObjectId;
  temperatureC: number;
  thresholdC: number;
  sustainedSinceAt: Date;
  triggeredAt: Date;
  /** Active rentals on this unit's baskets at the moment the alert fired — what's actually at risk. */
  affectedRentals: Types.ObjectId[];
  /** The hub's assigned manager, or the main admin if the hub isn't assigned to anyone yet. */
  recipient?: Types.ObjectId;
  message: string;
  status: "open" | "acknowledged";
  acknowledgedBy?: Types.ObjectId;
  acknowledgedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const alertSchema = new Schema<IAlert>(
  {
    unit: { type: Schema.Types.ObjectId, ref: "CoolingUnit", required: true },
    hub: { type: Schema.Types.ObjectId, ref: "CoolingHub", required: true },
    temperatureC: { type: Number, required: true },
    thresholdC: { type: Number, required: true },
    sustainedSinceAt: { type: Date, required: true },
    triggeredAt: { type: Date, required: true, default: Date.now },
    affectedRentals: [{ type: Schema.Types.ObjectId, ref: "BasketRental" }],
    recipient: { type: Schema.Types.ObjectId, ref: "User" },
    message: { type: String, required: true },
    status: { type: String, enum: ["open", "acknowledged"], default: "open" },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: "User" },
    acknowledgedAt: { type: Date },
  },
  { timestamps: true }
);

alertSchema.index({ unit: 1, status: 1 });

export const Alert = model<IAlert>("Alert", alertSchema);
