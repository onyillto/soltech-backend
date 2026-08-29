import { Schema, model, Document, Types } from "mongoose";

/** A single relative-humidity (%RH) reading from a standalone humidity sensor on a unit. */
export interface IHumidityReading extends Document {
  unit: Types.ObjectId;
  recordedAt: Date;
  humidityPercent: number;
  source: "sensor" | "manual";
  createdAt: Date;
  updatedAt: Date;
}

const humidityReadingSchema = new Schema<IHumidityReading>(
  {
    unit: { type: Schema.Types.ObjectId, ref: "CoolingUnit", required: true },
    recordedAt: { type: Date, required: true, default: Date.now },
    humidityPercent: { type: Number, required: true, min: 0, max: 100 },
    source: { type: String, enum: ["sensor", "manual"], default: "sensor" },
  },
  { timestamps: true }
);

humidityReadingSchema.index({ unit: 1, recordedAt: -1 });

export const HumidityReading = model<IHumidityReading>("HumidityReading", humidityReadingSchema);
