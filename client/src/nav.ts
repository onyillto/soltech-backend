export interface NavItem {
  path: string;
  label: string;
}

/**
 * Market women are the only real users of the system right now, so the
 * console only exposes their actual flow: see what's going on, rent a
 * basket, and review what's gone through the system. Everything else
 * (cold-chain sites, cold-box logs, telemetry, training, payments, user
 * management) is still fully built on the backend — it's just not wired
 * into this console until another role is in active use. See ../README.md
 * and the backend's own route table for the full API.
 */
export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Overview" },
  { path: "/baskets", label: "Baskets & Rentals" },
  { path: "/transactions", label: "Transactions" },
];
