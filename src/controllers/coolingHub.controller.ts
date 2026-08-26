import { Request, Response } from "express";
import { crudFactory } from "../utils/crudFactory";
import { CoolingHub } from "../models/CoolingHub";
import { User } from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

const base = crudFactory(CoolingHub, {
  populate: "organization managedBy",
  filterableFields: ["state", "status", "organization"],
});

/**
 * Assigns a hub to a specific admin/staff user — they become "in control" of
 * it, and the fallback alert recipient for its units once monitoring is on.
 * A market woman/farmer/trader/learner can't be assigned; a hub is managed
 * by someone empowered to act on it, not by the person renting a basket.
 */
const assign = asyncHandler(async (req: Request, res: Response) => {
  const hub = await CoolingHub.findById(req.params.id);
  if (!hub) throw ApiError.notFound("Cooling hub not found");

  const targetUser = await User.findById(req.body.userId);
  if (!targetUser) throw ApiError.notFound("User not found");
  if (targetUser.role !== "admin" && targetUser.role !== "staff") {
    throw ApiError.badRequest("A hub can only be assigned to an admin or staff user");
  }

  hub.managedBy = targetUser._id as typeof hub.managedBy;
  await hub.save();
  await hub.populate("organization managedBy");

  res.status(200).json({ success: true, data: hub });
});

export const coolingHubController = { ...base, assign };
