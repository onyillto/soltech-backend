import { Request, Response } from "express";
import { User } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { signToken } from "../utils/token";

function toPublicUser(user: InstanceType<typeof User>) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    organization: user.organization,
    location: user.location,
    isActive: user.isActive,
    isMainAdmin: user.isMainAdmin,
    createdAt: user.createdAt,
  };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, phone, role, organization, location } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const user = await User.create({ name, email, password, phone, role, organization, location });
  const token = signToken({ sub: user.id, role: user.role });

  res.status(201).json({ success: true, data: { user: toPublicUser(user), token } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized("Invalid email or password");
  }
  if (!user.isActive) {
    throw ApiError.forbidden("This account has been deactivated");
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.status(200).json({ success: true, data: { user: toPublicUser(user), token } });
});

/**
 * Admin-only sign-in. There is no matching "admin register" — admin accounts
 * are provisioned by another admin or the seed script, never self-service.
 * A non-admin account with the right password (or a wrong password on any
 * account) gets the same generic error, so this endpoint can't be used to
 * enumerate which emails belong to admins.
 */
export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || user.role !== "admin" || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized("Invalid email or password");
  }
  if (!user.isActive) {
    throw ApiError.forbidden("This account has been deactivated");
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.status(200).json({ success: true, data: { user: toPublicUser(user), token } });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?.id);
  if (!user) throw ApiError.notFound("User not found");
  res.status(200).json({ success: true, data: toPublicUser(user) });
});
