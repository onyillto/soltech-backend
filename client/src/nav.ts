export interface NavItem {
  path: string;
  label: string;
}

/**
 * Only admin/operator accounts log in — clients (farmers, market women,
 * traders) are registered and managed on their behalf, not self-service
 * users of this console. Everything else (cold-chain sites, cold-box logs,
 * payments, user management) is still fully built on the backend — it's
 * just not wired into this console yet. See ../README.md and the backend's
 * own route table for the full API.
 */
export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Overview" },
  { path: "/clients", label: "Clients" },
  { path: "/baskets", label: "Baskets & Rentals" },
  { path: "/telemetry", label: "Telemetry" },
  { path: "/transactions", label: "Transactions" },
];
