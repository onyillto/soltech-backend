import { Types } from "mongoose";
import { TelemetryReading } from "../models/TelemetryReading";
import { CoolingUnit } from "../models/CoolingUnit";
import { CoolingHub } from "../models/CoolingHub";
import { Basket } from "../models/Basket";
import { BasketRental } from "../models/BasketRental";
import { Alert } from "../models/Alert";
import { User } from "../models/User";
import { TEMPERATURE_ALERT_THRESHOLD_C, SUSTAINED_HIGH_MINUTES } from "../constants/monitoring";

/**
 * Runs after a new telemetry reading is saved. Opens an Alert if the unit
 * has been at or above the threshold continuously for SUSTAINED_HIGH_MINUTES
 * AND it currently has produce in it (an active BasketRental on one of its
 * baskets) — an empty unit warming up isn't urgent. Never throws: a bug here
 * shouldn't take down telemetry ingestion, which is the more important write.
 */
export async function checkForHighTemperatureAlert(
  unitId: Types.ObjectId | string,
  temperatureC: number,
  recordedAt: Date
): Promise<void> {
  try {
    if (temperatureC < TEMPERATURE_ALERT_THRESHOLD_C) return;

    const alreadyOpen = await Alert.findOne({ unit: unitId, status: "open" });
    if (alreadyOpen) return; // one open alert per unit at a time — don't spam a running incident

    // The start of the current high streak is whenever it last dipped below
    // the threshold. No such reading at all means we can't establish how
    // long it's actually been high (could just be the unit's first-ever
    // reading), so don't assume an unbounded streak from one data point.
    const lastCoolReading = await TelemetryReading.findOne({
      unit: unitId,
      temperatureC: { $lt: TEMPERATURE_ALERT_THRESHOLD_C },
    }).sort("-recordedAt");
    if (!lastCoolReading) return;

    const sustainedMinutes = (recordedAt.getTime() - lastCoolReading.recordedAt.getTime()) / 60_000;
    if (sustainedMinutes < SUSTAINED_HIGH_MINUTES) return;

    const unit = await CoolingUnit.findById(unitId);
    if (!unit) return;

    const baskets = await Basket.find({ unit: unitId }, "_id");
    const activeRentals = await BasketRental.find({
      basket: { $in: baskets.map((b) => b._id) },
      status: "active",
    });
    if (activeRentals.length === 0) return; // nothing at risk right now — don't alert

    const hub = await CoolingHub.findById(unit.hub);
    if (!hub) return;

    let recipient = hub.managedBy;
    if (!recipient) {
      const mainAdmin = await User.findOne({ isMainAdmin: true });
      recipient = mainAdmin?._id as typeof recipient;
    }

    await Alert.create({
      unit: unit._id,
      hub: hub._id,
      temperatureC,
      thresholdC: TEMPERATURE_ALERT_THRESHOLD_C,
      sustainedSinceAt: lastCoolReading.recordedAt,
      triggeredAt: recordedAt,
      affectedRentals: activeRentals.map((r) => r._id),
      recipient,
      message:
        `${unit.unitCode} has been at or above ${TEMPERATURE_ALERT_THRESHOLD_C}°C for over ` +
        `${SUSTAINED_HIGH_MINUTES} minutes with ${activeRentals.length} active rental(s) inside.`,
    });
  } catch (err) {
    console.error("[coldChainMonitor] failed to evaluate telemetry reading", err);
  }
}
