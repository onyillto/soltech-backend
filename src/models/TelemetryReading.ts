import { Schema, model, Document, Types } from "mongoose";

/**
 * A single IoT sensor reading from a cooling unit. `temperatureC` is the
 * primary/representative reading (what alerting and the summary endpoint
 * key off of); the nine named probes below match the real multi-point
 * thermocouple rig used for cold-box validation (see the "DEC 2022 solartech
 * weekly report" data) — ambient air, evaporator coil in/out, and six
 * positions inside the storage compartment. All nine are optional so a
 * simpler single-probe sensor can still report with just temperatureC.
 */
export interface ITelemetryReading extends Document {
  unit: Types.ObjectId;
  recordedAt: Date;
  temperatureC: number;
  ambientC?: number;
  evaporatorInC?: number;
  evaporatorOutC?: number;
  leftInsideC?: number;
  rightInsideC?: number;
  leftMiddleC?: number;
  rightMiddleC?: number;
  leftNearDoorC?: number;
  rightNearDoorC?: number;
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
    ambientC: { type: Number },
    evaporatorInC: { type: Number },
    evaporatorOutC: { type: Number },
    leftInsideC: { type: Number },
    rightInsideC: { type: Number },
    leftMiddleC: { type: Number },
    rightMiddleC: { type: Number },
    leftNearDoorC: { type: Number },
    rightNearDoorC: { type: Number },
    batteryPercent: { type: Number, min: 0, max: 100 },
    solarInputWatts: { type: Number, min: 0 },
    energyConsumedWh: { type: Number, min: 0 },
    source: { type: String, enum: ["sensor", "manual"], default: "sensor" },
  },
  { timestamps: true }
);

telemetryReadingSchema.index({ unit: 1, recordedAt: -1 });

export const TelemetryReading = model<ITelemetryReading>("TelemetryReading", telemetryReadingSchema);
