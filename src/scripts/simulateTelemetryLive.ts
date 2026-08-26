/**
 * Keeps every cooling unit's telemetry "live": inserts one new simulated
 * reading per unit every 10 minutes (or a shorter interval for demoing),
 * continuing from each unit's most recent reading so there's no discontinuity
 * with backfilled history. Runs until stopped with Ctrl+C.
 *
 * Usage:
 *   npm run telemetry:live
 *   npm run telemetry:live -- --interval-seconds=10   # fast demo mode
 */
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { CoolingUnit, ICoolingUnit } from "../models/CoolingUnit";
import { TelemetryReading } from "../models/TelemetryReading";
import { INTERVAL_MINUTES, simulateReadingAt } from "./lib/telemetrySim";

const DEFAULT_INTERVAL_SECONDS = INTERVAL_MINUTES * 60;
const STARTING_BATTERY_PERCENT = 80;

function argValue(flag: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${flag}=`))?.split("=")[1];
}

async function lastBatteryPercent(unitId: mongoose.Types.ObjectId): Promise<number> {
  const last = await TelemetryReading.findOne({ unit: unitId }).sort("-recordedAt");
  return last?.batteryPercent ?? STARTING_BATTERY_PERCENT;
}

async function tick(units: ICoolingUnit[], battery: Map<string, number>) {
  const at = new Date();
  for (const unit of units) {
    const unitId = unit.id as string;
    const prevBattery = battery.get(unitId) ?? STARTING_BATTERY_PERCENT;
    const sim = simulateReadingAt(at, prevBattery);
    battery.set(unitId, sim.batteryPercent);

    await TelemetryReading.create({
      unit: unit._id,
      recordedAt: at,
      temperatureC: sim.temperatureC,
      batteryPercent: sim.batteryPercent,
      solarInputWatts: sim.solarInputWatts,
      energyConsumedWh: sim.energyConsumedWh,
      source: "sensor",
    });

    console.log(
      `[telemetry:live] ${unit.unitCode} @ ${at.toLocaleTimeString()} — ` +
        `${sim.temperatureC}°C, battery ${sim.batteryPercent}%, solar ${sim.solarInputWatts}W`
    );
  }
}

async function main() {
  const intervalSeconds = Number(argValue("interval-seconds")) || DEFAULT_INTERVAL_SECONDS;

  await connectDB();

  const units = await CoolingUnit.find({});
  if (units.length === 0) {
    console.error("[telemetry:live] no cooling units found — create one first (or run `npm run seed`)");
    process.exit(1);
  }

  const battery = new Map<string, number>();
  for (const unit of units) {
    battery.set(unit.id as string, await lastBatteryPercent(unit._id as mongoose.Types.ObjectId));
  }

  console.log(
    `[telemetry:live] simulating ${units.length} unit(s) every ${intervalSeconds}s. Ctrl+C to stop.`
  );

  await tick(units, battery); // one reading immediately, then on the interval
  const timer = setInterval(() => {
    tick(units, battery).catch((err) => console.error("[telemetry:live] tick failed", err));
  }, intervalSeconds * 1000);

  const shutdown = async () => {
    clearInterval(timer);
    console.log("\n[telemetry:live] stopping.");
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[telemetry:live] failed", err);
  process.exit(1);
});
