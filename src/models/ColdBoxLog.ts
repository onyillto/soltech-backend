import { Schema, model, Document, Types } from "mongoose";

/**
 * A single loading or unloading event at a SOLTECH cold-box, mirroring the
 * field data sheets ("DATA COLLECTED FOR LOADING AND UNLOADING OF FRESH
 * FOOD PRODUCTS FROM SOLTECH COLD-BOX"). Loads and unloads are independent
 * events, not paired 1:1 — produce loaded one evening is typically unloaded
 * in a separate batch the next morning for market trading.
 */
export interface IColdBoxLog extends Document {
  unit: Types.ObjectId;
  eventType: "load" | "unload";
  produceType: string;
  quantityKg: number;
  /** Size of the reusable plastic crates (RPCs) the produce was packed in, if recorded. */
  crateSizeKg?: 15 | 25;
  /** How long the cold-box door was open for this event, in seconds. */
  doorOpenSeconds?: number;
  occurredAt: Date;
  loggedBy?: Types.ObjectId;
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}

const coldBoxLogSchema = new Schema<IColdBoxLog>(
  {
    unit: { type: Schema.Types.ObjectId, ref: "CoolingUnit", required: true },
    eventType: { type: String, enum: ["load", "unload"], required: true },
    produceType: { type: String, required: true, trim: true },
    quantityKg: { type: Number, required: true, min: 0 },
    crateSizeKg: { type: Number, enum: [15, 25] },
    doorOpenSeconds: { type: Number, min: 0 },
    occurredAt: { type: Date, required: true },
    loggedBy: { type: Schema.Types.ObjectId, ref: "User" },
    comments: { type: String, trim: true },
  },
  { timestamps: true }
);

coldBoxLogSchema.index({ unit: 1, eventType: 1, occurredAt: -1 });

export const ColdBoxLog = model<IColdBoxLog>("ColdBoxLog", coldBoxLogSchema);
