/**
 * Cold-chain temperature monitoring thresholds. A reading above
 * TEMPERATURE_ALERT_THRESHOLD_C alone doesn't trigger anything — a brief
 * door-open spike is normal. An alert only fires once the temperature has
 * stayed at or above the threshold continuously for
 * SUSTAINED_HIGH_MINUTES, AND the unit actually has produce in it (an
 * active BasketRental) — an empty unit warming up isn't an emergency.
 */
export const TEMPERATURE_ALERT_THRESHOLD_C = 8;
export const SUSTAINED_HIGH_MINUTES = 25;
