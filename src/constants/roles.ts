export const ROLES = ["admin", "operator"] as const;

export type Role = (typeof ROLES)[number];
