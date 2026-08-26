import type { BasketRentalItem, Role } from "../api/types";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  staff: "Staff",
  farmer: "Farmer",
  market_woman: "Market Woman",
  trader: "Trader",
  learner: "Learner",
};

export function formatNaira(kobo: number | null | undefined): string {
  if (kobo === null || kobo === undefined) return "—";
  return `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined || seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${mins}m ${rest}s` : `${mins}m`;
}

/** Extracts a display name whether a field was populated by the API or left as a raw id. */
export function refName(ref: object | string | undefined, fallback = "—"): string {
  if (!ref) return fallback;
  if (typeof ref === "string") return ref.slice(-6);
  const obj = ref as Record<string, unknown>;
  const name = obj.name ?? obj.title ?? obj.email ?? obj.unitCode ?? (obj.basketNumber !== undefined ? `#${obj.basketNumber}` : undefined);
  return typeof name === "string" ? name : fallback;
}

export function refId(ref: { _id: string } | string | undefined): string | undefined {
  if (!ref) return undefined;
  return typeof ref === "string" ? ref : ref._id;
}

/** "Tomatoes 12kg + Pepper 6kg" — every produce item in a rental, one line. */
export function formatItems(items: BasketRentalItem[] | undefined): string {
  if (!items || items.length === 0) return "—";
  return items.map((item) => `${item.produceType} ${item.quantityKg}kg`).join(" + ");
}
