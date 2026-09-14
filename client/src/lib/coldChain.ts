/**
 * Mirrors the backend's cold-chain alert threshold (src/constants/monitoring.ts)
 * for a live color cue only — the server is the source of truth for when an
 * Alert actually fires (it also requires the high reading to be sustained for
 * 25+ minutes with produce in the unit, not just a single reading over 8°C).
 */
export const TEMPERATURE_ALERT_THRESHOLD_C = 8;

export function temperatureTone(tempC: number | null | undefined): "green" | "red" | "muted" {
  if (tempC === null || tempC === undefined) return "muted";
  return tempC >= TEMPERATURE_ALERT_THRESHOLD_C ? "red" : "green";
}

export function batteryTone(percent: number | null | undefined): "green" | "amber" | "red" | "muted" {
  if (percent === null || percent === undefined) return "muted";
  if (percent >= 50) return "green";
  if (percent >= 20) return "amber";
  return "red";
}
