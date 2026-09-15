export interface NavItem {
  path: string;
  label: string;
}

/**
 * Only admin/operator accounts log in — clients (farmers, market women,
 * traders) are registered and managed on their behalf, not self-service
 * users of this console. There's no standalone Clients page — a client
 * only exists in the context of renting a basket, so registering one
 * happens inline on the Baskets & Rentals page, right where you pick the
 * basket. Everything else (cold-chain sites, cold-box logs, payments, user
 * management) is still fully built on the backend — it's just not wired
 * into this console yet. See ../README.md and the backend's own route
 * table for the full API.
 */
export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Overview" },
  { path: "/baskets", label: "Baskets & Rentals" },
  { path: "/telemetry", label: "Telemetry" },
  { path: "/transactions", label: "Transactions" },
];
