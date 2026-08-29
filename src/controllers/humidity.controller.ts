import { Request, Response } from "express";
import { Types } from "mongoose";
import { crudFactory } from "../utils/crudFactory";
import { HumidityReading } from "../models/HumidityReading";
import { CoolingUnit } from "../models/CoolingUnit";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

const base = crudFactory(HumidityReading, {
  populate: "unit",
  filterableFields: ["unit", "source"],
});

/** Ingests one reading — public, no auth (same tradeoff as /telemetry). Checks the unit exists. */
const create = asyncHandler(async (req: Request, res: Response) => {
  const unitExists = await CoolingUnit.exists({ _id: req.body.unit });
  if (!unitExists) throw ApiError.notFound("Cooling unit not found");

  const reading = await HumidityReading.create({
    unit: req.body.unit,
    recordedAt: req.body.recordedAt ?? new Date(),
    humidityPercent: req.body.humidityPercent,
    source: req.body.source ?? "sensor",
  });

  res.status(201).json({ success: true, data: reading });
});

const latest = asyncHandler(async (req: Request, res: Response) => {
  const { unit } = req.query;
  if (!unit) throw ApiError.badRequest("unit query param is required");

  const reading = await HumidityReading.findOne({ unit }).sort("-recordedAt");
  res.status(200).json({ success: true, data: reading ?? null });
});

const summary = asyncHandler(async (req: Request, res: Response) => {
  const { unit } = req.query;
  if (!unit || typeof unit !== "string" || !Types.ObjectId.isValid(unit)) {
    throw ApiError.badRequest("A valid unit query param is required");
  }

  const hours = Math.min(Math.max(Number(req.query.hours) || 24, 1), 24 * 30);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [result] = await HumidityReading.aggregate([
    { $match: { unit: new Types.ObjectId(unit), recordedAt: { $gte: since } } },
    {
      $group: {
        _id: null,
        minHumidityPercent: { $min: "$humidityPercent" },
        maxHumidityPercent: { $max: "$humidityPercent" },
        avgHumidityPercent: { $avg: "$humidityPercent" },
        readingCount: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      unit,
      windowHours: hours,
      ...(result ?? { minHumidityPercent: null, maxHumidityPercent: null, avgHumidityPercent: null, readingCount: 0 }),
    },
  });
});

export const humidityController = { ...base, create, latest, summary };
