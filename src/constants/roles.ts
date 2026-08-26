export const ROLES = [
  "admin",
  "staff",
  "farmer",
  "market_woman",
  "trader",
  "learner",
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Roles the public /auth/register endpoint is allowed to create. admin and
 * staff are deliberately excluded — those accounts are provisioned by an
 * existing admin (or the seed script), never by open self-registration.
 */
export const SELF_SERVICE_ROLES = ["farmer", "market_woman", "trader", "learner"] as const satisfies readonly Role[];
