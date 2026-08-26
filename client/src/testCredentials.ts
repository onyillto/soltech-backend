import type { Role } from "./api/types";

/**
 * Mirrors the accounts created by `npm run seed` in the backend
 * (src/scripts/seed.ts) — kept here only to power the quick-sign-in
 * buttons on the login screen. If you change one, change the other.
 */
export const TEST_PASSWORD = "Soltech@2026";

export const SEEDED_USERS: { role: Role; label: string; email: string }[] = [
  { role: "admin", label: "Admin", email: "admin@soltech.test" },
  { role: "staff", label: "Staff", email: "staff@soltech.test" },
  { role: "farmer", label: "Farmer", email: "farmer@soltech.test" },
  { role: "market_woman", label: "Market Woman", email: "marketwoman@soltech.test" },
  { role: "trader", label: "Trader", email: "trader@soltech.test" },
  { role: "learner", label: "Learner", email: "learner@soltech.test" },
];
