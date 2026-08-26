import { Request, Response, NextFunction } from "express";
import { CoolingUnit } from "../models/CoolingUnit";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * Authenticates an IoT device pushing telemetry, in place of a user JWT.
 * The device presents the unit id (body.unit) and the unit's shared secret
 * (x-device-key header), issued when the CoolingUnit was created.
 */
export const deviceAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const unitId = req.body.unit;
  const deviceKey = req.header("x-device-key");

  if (!unitId) throw ApiError.badRequest("unit is required");
  if (!deviceKey) throw ApiError.unauthorized("Missing x-device-key header");

  const unit = await CoolingUnit.findById(unitId).select("+deviceKey");
  if (!unit) throw ApiError.notFound("Cooling unit not found");
  if (unit.deviceKey !== deviceKey) throw ApiError.unauthorized("Invalid device key");

  next();
});
