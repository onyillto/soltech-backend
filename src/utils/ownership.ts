import { Types } from "mongoose";
import { Request } from "express";
import { ApiError } from "./ApiError";
import { Role } from "../constants/roles";

const PRIVILEGED_ROLES: Role[] = ["admin", "staff"];

/**
 * Throws 403 unless the requester is the resource's owner or holds one of
 * the privileged roles (admin/staff by default). Use for actions where
 * authorize() can't help because the check depends on a specific document,
 * not just the caller's role.
 */
export function assertOwnerOrPrivileged(
  req: Request,
  ownerId: Types.ObjectId | string | undefined,
  privilegedRoles: Role[] = PRIVILEGED_ROLES
) {
  const isPrivileged = !!req.user?.role && privilegedRoles.includes(req.user.role);
  const isOwner = !!req.user?.id && !!ownerId && req.user.id === ownerId.toString();

  if (!isPrivileged && !isOwner) {
    throw ApiError.forbidden("You do not have permission to perform this action");
  }
}
