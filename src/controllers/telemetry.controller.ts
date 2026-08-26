import { Request, Response } from "express";
import { Types } from "mongoose";
import { crudFactory } from "../utils/crudFactory";
import { TelemetryReading } from "../models/TelemetryReading";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { checkForHighTemperatureAlert } from "../services/coldChainMonitor";

const base = crudFactory(TelemetryReading, {
  populate: "unit",
  filterableFields: ["unit", "source"],
});

/** Ingests one reading from a device, authenticated via deviceAuth (not a user JWT). */
const create = asyncHandler(async (req: Request, res: Response) => {
  const reading = await TelemetryReading.create({
    unit: req.body.unit,
    recordedAt: req.body.recordedAt ?? new Date(),
    temperatureC: req.body.temperatureC,
    batteryPercent: req.body.batteryPercent,
    solarInputWatts: req.body.solarInputWatts,
    energyConsumedWh: req.body.energyConsumedWh,
    source: req.body.source ?? "sensor",
  });

  // Runs after the response-critical write; a monitoring bug shouldn't fail ingestion.
  await checkForHighTemperatureAlert(reading.unit, reading.temperatureC, reading.recordedAt);

  res.status(201).json({ success: true, data: reading });
});

const latest = asyncHandler(async (req: Request, res: Response) => {
  const { unit } = req.query;
  if (!unit) throw ApiError.badRequest("unit query param is required");

  const reading = await TelemetryReading.findOne({ unit }).sort("-recordedAt");
  res.status(200).json({ success: true, data: reading ?? null });
});

const summary = asyncHandler(async (req: Request, res: Response) => {
  const { unit } = req.query;
  if (!unit || typeof unit !== "string" || !Types.ObjectId.isValid(unit)) {
    throw ApiError.badRequest("A valid unit query param is required");
  }

  const hours = Math.min(Math.max(Number(req.query.hours) || 24, 1), 24 * 30);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [result] = await TelemetryReading.aggregate([
    { $match: { unit: new Types.ObjectId(unit), recordedAt: { $gte: since } } },
    {
      $group: {
        _id: null,
        minTemperatureC: { $min: "$temperatureC" },
        maxTemperatureC: { $max: "$temperatureC" },
        avgTemperatureC: { $avg: "$temperatureC" },
        avgBatteryPercent: { $avg: "$batteryPercent" },
        totalEnergyConsumedWh: { $sum: "$energyConsumedWh" },
        readingCount: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      unit,
      windowHours: hours,
      ...(result ?? {
        minTemperatureC: null,
        maxTemperatureC: null,
        avgTemperatureC: null,
        avgBatteryPercent: null,
        totalEnergyConsumedWh: null,
        readingCount: 0,
      }),
    },
  });
});

export const telemetryController = { ...base, create, latest, summary };
