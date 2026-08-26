/**
 * Mirrors the backend's tiered pay-per-use pricing (src/constants/billing.ts)
 * for a live preview only — the server is the source of truth and computes
 * the actual rate stored on the rental.
 *
 * ₦200/day up to 10kg, then +₦100/day per additional 10kg (20kg -> ₦300,
 * 30kg -> ₦400, ...). Partial tiers round up.
 */
const TIER_KG = 10;
const BASE_NAIRA = 200;
const STEP_NAIRA = 100;

export function dailyRateNairaForWeight(quantityKg: number): number {
  const tier = Math.max(1, Math.ceil(quantityKg / TIER_KG));
  return BASE_NAIRA + (tier - 1) * STEP_NAIRA;
}
