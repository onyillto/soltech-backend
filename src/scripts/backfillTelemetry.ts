/**
 * Backfills TelemetryReading history for every cooling unit, one simulated
 * reading every 10 minutes, from a start date (default: April 1st of the
 * current year) through now. Safe to re-run — it clears any existing
 * readings in the same window for a unit before regenerating them.
 *
 * Usage:
 *   npm run telemetry:backfill
 *   npm run telemetry:backfill -- --from=2026-04-01 --to=2026-08-01
 *   npm run telemetry:backfill -- --unit=<coolingUnitId>
 */
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { CoolingUnit } from "../models/CoolingUnit";
import { TelemetryReading } from "../models/TelemetryReading";
import { INTERVAL_MINUTES, simulateReadingAt } from "./lib/telemetrySim";

const BATCH_SIZE = 2000;
const STARTING_BATTERY_PERCENT = 80;

function argValue(flag: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(`--${flag}=`));
  return arg?.split("=")[1];
}

function defaultFrom(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), 3, 1); // April 1st, current year, local time
}

async function backfillUnit(unitId: mongoose.Types.ObjectId, unitCode: string, from: Date, to: Date) {
  console.log(`[telemetry:backfill] ${unitCode}: clearing existing readings in range...`);
  await TelemetryReading.deleteMany({ unit: unitId, recordedAt: { $gte: from, $lte: to } });

  let battery = STARTING_BATTERY_PERCENT;
  let buffer: Record<string, unknown>[] = [];
  let total = 0;

  const intervalMs = INTERVAL_MINUTES * 60 * 1000;
  for (let t = from.getTime(); t <= to.getTime(); t += intervalMs) {
    const at = new Date(t);
    const sim = simulateReadingAt(at, battery);
    battery = sim.batteryPercent;

    buffer.push({
      unit: unitId,
      recordedAt: at,
      temperatureC: sim.temperatureC,
      batteryPercent: sim.batteryPercent,
      solarInputWatts: sim.solarInputWatts,
      energyConsumedWh: sim.energyConsumedWh,
      source: "sensor",
    });

    if (buffer.length >= BATCH_SIZE) {
      await TelemetryReading.insertMany(buffer, { ordered: false });
      total += buffer.length;
      process.stdout.write(`\r[telemetry:backfill] ${unitCode}: ${total} readings...`);
      buffer = [];
    }
  }

  if (buffer.length > 0) {
    await TelemetryReading.insertMany(buffer, { ordered: false });
    total += buffer.length;
  }

  console.log(`\r[telemetry:backfill] ${unitCode}: ${total} readings written.            `);
}

async function main() {
  const from = argValue("from") ? new Date(argValue("from")!) : defaultFrom();
  const to = argValue("to") ? new Date(argValue("to")!) : new Date();
  const onlyUnitId = argValue("unit");

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    console.error("[telemetry:backfill] --from/--to must be valid dates (e.g. 2026-04-01)");
    process.exit(1);
  }
  if (from >= to) {
    console.error("[telemetry:backfill] --from must be before --to");
    process.exit(1);
  }

  await connectDB();

  const units = onlyUnitId ? await CoolingUnit.find({ _id: onlyUnitId }) : await CoolingUnit.find({});
  if (units.length === 0) {
    console.error("[telemetry:backfill] no cooling units found — create one first (or run `npm run seed`)");
    process.exit(1);
  }

  const totalIntervals = Math.floor((to.getTime() - from.getTime()) / (INTERVAL_MINUTES * 60 * 1000));
  console.log(
    `[telemetry:backfill] ${units.length} unit(s), ${from.toISOString()} -> ${to.toISOString()}, ` +
      `~${totalIntervals.toLocaleString()} readings/unit every ${INTERVAL_MINUTES} minutes`
  );

  for (const unit of units) {
    await backfillUnit(unit._id as mongoose.Types.ObjectId, unit.unitCode, from, to);
  }

  console.log("[telemetry:backfill] done.");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("[telemetry:backfill] failed", err);
  process.exit(1);
});
