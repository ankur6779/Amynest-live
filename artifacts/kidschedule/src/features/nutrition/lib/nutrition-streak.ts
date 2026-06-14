/** Client-side streak rules — mirrors server nutritionTrackLogic.ts */

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
}

export function buildWeeklyTrendFromHistory(
  history: Record<string, { score: number; checked: number; minDayMet?: boolean }>,
  liveToday: { dateKey: string; score: number; checked: number; minDayMet: boolean } | null,
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

  const end = parseDateKey(endDateKey);
  const days: WeeklyTrendDay[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const dateKey = formatDateKey(d);
    const live = liveToday?.dateKey === dateKey ? liveToday : null;
    const snap = live ?? history[dateKey];
    days.push({
      dateKey,
      score: snap?.score ?? 0,
      minDayMet: snap?.minDayMet ?? computeMinDayMet(snap?.checked ?? 0),
      checked: snap?.checked ?? 0,
    });
  }

  return days;
}

export function historyToStreakRows(
  history: Record<string, { score: number; checked: number; minDayMet?: boolean }>,
  liveToday: { dateKey: string; score: number; checked: number; minDayMet: boolean } | null,
): StreakDayRow[] {
  const rows: StreakDayRow[] = Object.entries(history).map(([dateKey, snap]) => ({
    dateKey,
    score: snap.score,
    minDayMet: snap.minDayMet ?? computeMinDayMet(snap.checked),
  }));
  if (liveToday) {
    const idx = rows.findIndex((r) => r.dateKey === liveToday.dateKey);
    const row: StreakDayRow = {
      dateKey: liveToday.dateKey,
      score: liveToday.score,
      minDayMet: liveToday.minDayMet,
    };
    if (idx >= 0) rows[idx] = row;
    else rows.push(row);
  }
  return rows;
}
