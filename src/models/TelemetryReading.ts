import { Schema, model, Document, Types } from "mongoose";

/**
 * A single IoT sensor reading from a cooling unit — temperature, battery/solar
 * state — feeding the AI/ML layer described in the pitch deck (energy behavior
 * learning, demand prediction, remote monitoring).
 */
export interface ITelemetryReading extends Document {
  unit: Types.ObjectId;
  recordedAt: Date;
  temperatureC: number;
  batteryPercent?: number;
  solarInputWatts?: number;
  energyConsumedWh?: number;
  source: "sensor" | "manual";
  createdAt: Date;
  updatedAt: Date;
}

const telemetryReadingSchema = new Schema<ITelemetryReading>(
  {
    unit: { type: Schema.Types.ObjectId, ref: "CoolingUnit", required: true },
    recordedAt: { type: Date, required: true, default: Date.now },
    temperatureC: { type: Number, required: true },
    batteryPercent: { type: Number, min: 0, max: 100 },
    solarInputWatts: { type: Number, min: 0 },
    energyConsumedWh: { type: Number, min: 0 },
    source: { type: String, enum: ["sensor", "manual"], default: "sensor" },
  },
  { timestamps: true }
);

telemetryReadingSchema.index({ unit: 1, recordedAt: -1 });

export const TelemetryReading = model<ITelemetryReading>("TelemetryReading", telemetryReadingSchema);
