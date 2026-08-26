import { Request, Response } from "express";
import { crudFactory } from "../utils/crudFactory";
import { Alert } from "../models/Alert";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

// No `create` is exposed — alerts are system-generated only, from
// coldChainMonitor, never created directly by a client.
const base = crudFactory(Alert, {
  populate: "unit hub recipient acknowledgedBy affectedRentals",
  filterableFields: ["unit", "hub", "status", "recipient"],
});

const acknowledge = asyncHandler(async (req: Request, res: Response) => {
  const alert = await Alert.findById(req.params.id);
  if (!alert) throw ApiError.notFound("Alert not found");
  if (alert.status === "acknowledged") throw ApiError.badRequest("This alert is already acknowledged");

  alert.status = "acknowledged";
  alert.acknowledgedBy = req.user?.id as typeof alert.acknowledgedBy;
  alert.acknowledgedAt = new Date();
  await alert.save();

  res.status(200).json({ success: true, data: alert });
});

export const alertController = { ...base, acknowledge };
