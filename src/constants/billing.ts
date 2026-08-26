import { nairaToKobo } from "../utils/money";

/**
 * Weight-tiered pay-per-use pricing: ₦200/day for up to 10kg, then +₦100/day
 * for every additional 10kg (20kg -> ₦300, 30kg -> ₦400, 40kg -> ₦500, ...).
 * Partial tiers round up — 15kg is billed at the 20kg rate.
 */
export const BASKET_RATE_TIER_KG = 10;
export const BASKET_RATE_BASE_NAIRA = 200;
export const BASKET_RATE_STEP_NAIRA = 100;

/** ₦200/basket/day — used only as a schema-level fallback when no weight is known yet. */
export const DEFAULT_BASKET_RATE_KOBO = nairaToKobo(BASKET_RATE_BASE_NAIRA);

/** Computes the daily rate (in kobo) for a basket holding the given weight. */
export function dailyRateKoboForWeight(quantityKg: number): number {
  const tier = Math.max(1, Math.ceil(quantityKg / BASKET_RATE_TIER_KG));
  const naira = BASKET_RATE_BASE_NAIRA + (tier - 1) * BASKET_RATE_STEP_NAIRA;
  return nairaToKobo(naira);
}
