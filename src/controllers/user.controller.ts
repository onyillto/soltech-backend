import { Request, Response } from "express";
import { crudFactory } from "../utils/crudFactory";
import { User } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

const base = crudFactory(User, {
  populate: "organization",
  filterableFields: ["role", "organization"],
});

/**
 * Admin creating an admin/operator account. Not the generic crudFactory
 * create — that would return the raw created document, and `select: false`
 * on User.password only hides it from queries, not from a document that's
 * already in memory (as `.create()`'s return value is), so it'd leak the
 * bcrypt hash in the response. Reload through a query instead, which does
 * apply the default projection.
 */
const create = asyncHandler(async (req: Request, res: Response) => {
  const existing = await User.findOne({ email: req.body.email });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  const created = await User.create(req.body);
  const user = await User.findById(created.id).populate("organization");

  res.status(201).json({ success: true, data: user });
});

export const userController = { ...base, create };
