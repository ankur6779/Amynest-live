const QUIET_START_HOUR = 22; // 10 PM
const QUIET_END_HOUR = 8; // 8 AM
const DEFAULT_DAYTIME_HOUR = 9;

export function isQuietHour(date: Date): boolean {
  const h = date.getHours();
  return h >= QUIET_START_HOUR || h < QUIET_END_HOUR;
}

/** Shift a timestamp out of quiet hours (10 PM – 8 AM local). */
export function adjustOutOfQuietHours(desiredMs: number): number {
  let d = new Date(desiredMs);
  if (!isQuietHour(d)) return desiredMs;

  if (d.getHours() >= QUIET_START_HOUR) {
    d = new Date(d);
    d.setDate(d.getDate() + 1);
    d.setHours(QUIET_END_HOUR, 0, 0, 0);
    return d.getTime();
  }

  d.setHours(QUIET_END_HOUR, 0, 0, 0);
  return d.getTime();
}

/** Local calendar date key (not UTC). */
export function localDayKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Enforce max N notifications per local calendar day by pushing overflow to the
 * next day at 9 AM (then re-check quiet hours).
 */
export function enforceDailyCap(
  fireAtMs: number,
  countsByDay: Map<string, number>,
  maxPerDay = 2,
): number {
  let adjusted = adjustOutOfQuietHours(fireAtMs);

  for (let guard = 0; guard < 14; guard++) {
    const key = localDayKey(adjusted);
    const count = countsByDay.get(key) ?? 0;
    if (count < maxPerDay) {
      countsByDay.set(key, count + 1);
      return adjusted;
    }
    const next = new Date(adjusted);
    next.setDate(next.getDate() + 1);
    next.setHours(DEFAULT_DAYTIME_HOUR, 0, 0, 0);
    adjusted = adjustOutOfQuietHours(next.getTime());
  }

  return adjusted;
}
