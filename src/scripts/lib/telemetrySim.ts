/**
 * Shared simulation model for a solar cold-box's telemetry, used by both the
 * historical backfill script and the live simulator so past and present data
 * follow the same physical assumptions:
 *
 *  - Temperature holds near a 4°C cold-chain target, drifts up a little at
 *    midday (ambient heat load), and occasionally spikes from a simulated
 *    door-open event (loading/unloading produce).
 *  - Battery charges through daylight hours off the solar panel and drains
 *    overnight running the compressor — modeled as a running value, not
 *    independent per reading, the way a real battery would behave.
 *  - Solar input follows a daylight-only curve peaking at midday.
 *  - Energy consumed is per-interval (Wh used since the last reading), which
 *    is why GET /telemetry/summary sums it rather than reading it as a
 *    cumulative meter.
 */

export const INTERVAL_MINUTES = 10;

const COLD_CHAIN_TARGET_C = 4;
const DAYLIGHT_START_HOUR = 6;
const DAYLIGHT_END_HOUR = 18;
const SOLAR_PEAK_WATTS = 180;
const DOOR_OPEN_CHANCE = 0.04;

/** 0 outside daylight hours, a smooth hump peaking at solar noon otherwise. */
function daylightFactor(hourOfDay: number): number {
  if (hourOfDay < DAYLIGHT_START_HOUR || hourOfDay > DAYLIGHT_END_HOUR) return 0;
  const span = DAYLIGHT_END_HOUR - DAYLIGHT_START_HOUR;
  return Math.max(0, Math.sin(((hourOfDay - DAYLIGHT_START_HOUR) / span) * Math.PI));
}

function hourOfDay(at: Date): number {
  return at.getHours() + at.getMinutes() / 60;
}

function round(n: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export interface SimulatedReading {
  temperatureC: number;
  batteryPercent: number;
  solarInputWatts: number;
  energyConsumedWh: number;
}

/**
 * Carries battery state forward between calls — pass the previous reading's
 * batteryPercent back in as `previousBatteryPercent` on the next call, in
 * chronological order.
 */
export function simulateReadingAt(at: Date, previousBatteryPercent: number): SimulatedReading {
  const hour = hourOfDay(at);
  const daylight = daylightFactor(hour);
  const isDaylight = hour >= DAYLIGHT_START_HOUR && hour <= DAYLIGHT_END_HOUR;

  const doorOpenSpike = Math.random() < DOOR_OPEN_CHANCE ? 2 + Math.random() * 2.5 : 0;
  const temperatureC = round(
    COLD_CHAIN_TARGET_C + daylight * 2 + doorOpenSpike + (Math.random() - 0.5) * 0.6
  );

  const batteryDelta = isDaylight ? 0.5 + Math.random() * 0.6 : -(0.3 + Math.random() * 0.45);
  const batteryPercent = round(Math.min(100, Math.max(25, previousBatteryPercent + batteryDelta)), 0);

  const solarInputWatts = isDaylight ? round(SOLAR_PEAK_WATTS * daylight + Math.random() * 10, 0) : 0;

  const energyConsumedWh = round(15 + Math.random() * 8);

  return { temperatureC, batteryPercent, solarInputWatts, energyConsumedWh };
}
