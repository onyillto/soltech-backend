/** All monetary amounts are stored in kobo (1 Naira = 100 kobo) to avoid float rounding issues. */
const KOBO_PER_NAIRA = 100;

export function nairaToKobo(naira: number): number {
  return Math.round(naira * KOBO_PER_NAIRA);
}

export function koboToNaira(kobo: number): number {
  return kobo / KOBO_PER_NAIRA;
}
