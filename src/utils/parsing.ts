/**
 * Parsers for the raw field-data formats used in SOLTECH's paper/Excel
 * cold-box loading & unloading logs, so that format can be imported as-is
 * without pre-cleaning by whoever is entering the data.
 */

/**
 * Parses a door-opening duration like "2:30mins", "3:50mins", "73seconds",
 * "234 seconds", or "2mins" into whole seconds. Returns undefined if the
 * string doesn't match a known shape.
 */
export function parseDoorDuration(raw: string | undefined | null): number | undefined {
  if (!raw) return undefined;
  const value = raw.trim().toLowerCase();

  const minSec = value.match(/^(\d+):(\d+)\s*mins?$/);
  if (minSec) return Number(minSec[1]) * 60 + Number(minSec[2]);

  const minOnly = value.match(/^(\d+)\s*mins?$/);
  if (minOnly) return Number(minOnly[1]) * 60;

  const secOnly = value.match(/^(\d+)\s*sec/); // covers "seconds", "secsonds" (typo in source), "secs"
  if (secOnly) return Number(secOnly[1]);

  return undefined;
}

/**
 * Parses a "D/M/YYYY HH:mmam|pm" style timestamp from the source sheets.
 * The sheets record the hour in 24-hour form but often append a redundant
 * am/pm suffix (e.g. "18:10pm"), so the suffix is ignored rather than used
 * to convert the hour. Returns undefined if the string can't be parsed.
 */
export function parseColdBoxDateTime(raw: string | undefined | null): Date | undefined {
  if (!raw) return undefined;
  const match = raw
    .trim()
    .match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (!match) return undefined;

  const [, day, month, year, hour, minute] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  );
  return Number.isNaN(date.getTime()) ? undefined : date;
}
