import crypto from "crypto";
import { Request, Response } from "express";
import { crudFactory } from "../utils/crudFactory";
import { CoolingUnit } from "../models/CoolingUnit";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

const base = crudFactory(CoolingUnit, {
  populate: "hub",
  filterableFields: ["hub", "status", "type"],
});

/**
 * Issues a new device key for a unit's IoT sensor, invalidating the old one.
 * The key is only ever returned here — it's excluded from normal reads.
 */
const rotateDeviceKey = asyncHandler(async (req: Request, res: Response) => {
  const unit = await CoolingUnit.findById(req.params.id);
  if (!unit) throw ApiError.notFound("Cooling unit not found");

  unit.deviceKey = crypto.randomBytes(24).toString("hex");
  await unit.save();

  res.status(200).json({ success: true, data: { deviceKey: unit.deviceKey } });
});

export const coolingUnitController = { ...base, rotateDeviceKey };
