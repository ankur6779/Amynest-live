/** Shared nutrition track rules — mirrored on client in nutrition-streak.ts */

export const MIN_DAY_CHECKED_THRESHOLD = 1;

export function computeMinDayMet(checked: number): boolean {
  return checked >= MIN_DAY_CHECKED_THRESHOLD;
}

export function isStreakQualifyingDay(score: number, minDayMet: boolean): boolean {
  return score >= 50 || minDayMet;
}

export interface StreakDayRow {
  dateKey: string;
  score: number;
  minDayMet: boolean;
}

/** Count consecutive qualifying days ending at today or yesterday (grace for in-progress today). */
export function computeCurrentStreak(
  rows: StreakDayRow[],
  todayKey: string,
): number {
  const byDate = new Map(rows.map((r) => [r.dateKey, r]));

  function parseDateKey(key: string): Date {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y!, m! - 1, d!);
  }

  function formatDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function shiftDays(key: string, delta: number): string {
    const d = parseDateKey(key);
    d.setDate(d.getDate() + delta);
    return formatDateKey(d);
  }

  let cursorKey = todayKey;
  const todayRow = byDate.get(todayKey);
  if (!todayRow || !isStreakQualifyingDay(todayRow.score, todayRow.minDayMet)) {
    cursorKey = shiftDays(todayKey, -1);
  }

  let streak = 0;
  for (let i = 0; i < 366; i++) {
    const row = byDate.get(cursorKey);
    if (!row || !isStreakQualifyingDay(row.score, row.minDayMet)) break;
    streak++;
    cursorKey = shiftDays(cursorKey, -1);
  }

  return streak;
}

export interface WeeklyTrendDay {
  dateKey: string;
  score: number;
  minDayMet: boolean;
  checked: number;
  checklist?: Record<string, boolean>;
  updatedAt?: string;
}

export function buildWeeklyTrend(
  rows: Array<{
    dateKey: string;
    score: number;
    minDayMet: boolean;
    checklist: Record<string, boolean>;
    updatedAt?: string;
  }>,
  endDateKey: string,
): WeeklyTrendDay[] {
  function parseDateKey(key: string): Date {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y!, m! - 1, d!);
  }

  function formatDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const byDate = new Map(rows.map((r) => [r.dateKey, r]));
  const end = parseDateKey(endDateKey);
  const days: WeeklyTrendDay[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const dateKey = formatDateKey(d);
    const row = byDate.get(dateKey);
    const checklist = row?.checklist ?? {};
    const checked = Object.values(checklist).filter(Boolean).length;
    days.push({
      dateKey,
      score: row?.score ?? 0,
      minDayMet: row?.minDayMet ?? false,
      checked,
      checklist: Object.keys(checklist).length > 0 ? checklist : undefined,
      updatedAt: row?.updatedAt,
    });
  }

  return days;
}
