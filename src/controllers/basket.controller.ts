import { Request, Response } from "express";
import { crudFactory } from "../utils/crudFactory";
import { Basket } from "../models/Basket";
import { CoolingUnit } from "../models/CoolingUnit";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

const MAX_BULK_COUNT = 500;

const base = crudFactory(Basket, {
  populate: "unit",
  filterableFields: ["unit", "status"],
});

/**
 * Provisions every basket for a unit in one call instead of one POST per
 * basket — e.g. a newly deployed 110-basket trailer. Idempotent: numbers
 * that already exist for the unit are skipped, not duplicated, so it's safe
 * to re-run (to top up after adding capacity, for instance).
 */
const bulkCreate = asyncHandler(async (req: Request, res: Response) => {
  const { unit, startNumber = 1, capacityKg } = req.body;
  if (!unit) throw ApiError.badRequest("unit is required");

  const unitDoc = await CoolingUnit.findById(unit);
  if (!unitDoc) throw ApiError.notFound("Cooling unit not found");

  const count = req.body.count ?? unitDoc.basketCapacity;
  if (!count || count < 1) {
    throw ApiError.badRequest("count is required (or set basketCapacity on the unit)");
  }
  if (count > MAX_BULK_COUNT) {
    throw ApiError.badRequest(`count cannot exceed ${MAX_BULK_COUNT} in a single request`);
  }

  const endNumber = startNumber + count - 1;
  const existing = await Basket.find(
    { unit, basketNumber: { $gte: startNumber, $lte: endNumber } },
    "basketNumber"
  );
  const existingNumbers = new Set(existing.map((b) => b.basketNumber));

  const toCreate = [];
  for (let n = startNumber; n <= endNumber; n++) {
    if (!existingNumbers.has(n)) toCreate.push({ unit, basketNumber: n, capacityKg });
  }

  const created = toCreate.length ? await Basket.insertMany(toCreate) : [];

  res.status(201).json({
    success: true,
    data: {
      createdCount: created.length,
      skippedCount: existingNumbers.size,
      created,
    },
  });
});

/** Baskets ready to rent right now — the same as `?status=available`, made explicit. */
const available = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { status: "available" };
  if (req.query.unit) filter.unit = req.query.unit;

  const baskets = await Basket.find(filter).populate("unit").sort("basketNumber");
  res.status(200).json({ success: true, data: baskets });
});

export const basketController = { ...base, bulkCreate, available };
