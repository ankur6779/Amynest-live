/** Local calendar helpers for cohort / D1 / Day-3 windows. */

export function localDateKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD as local midnight. */
export function parseLocalDateKey(dateKey: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

export function addLocalDateDays(dateKey: string, days: number): string | null {
  const base = parseLocalDateKey(dateKey);
  if (!base) return null;
  base.setDate(base.getDate() + days);
  return localDateKey(base);
}

/** Inclusive day offset from cohort_day0 (0 = same day). */
export function daysSinceCohortDay0(
  cohortDay0: string,
  dateKey: string,
): number | null {
  const a = parseLocalDateKey(cohortDay0);
  const b = parseLocalDateKey(dateKey);
  if (!a || !b) return null;
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86_400_000);
}
