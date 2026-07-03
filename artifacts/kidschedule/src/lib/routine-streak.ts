import { routineDateKey } from "@/lib/routines";

type RoutineDateLike = { date: string };

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Consecutive calendar days with at least one routine, ending at the anchor day.
 * Same-day grace: if today has no routine yet, count backward from yesterday so
 * morning opens do not show a false zero streak.
 */
export function computeRoutineStreak(
  routines: RoutineDateLike[],
  anchor: Date = new Date(),
): number {
  const dateSet = new Set(
    routines.map((r) => routineDateKey(r)).filter(Boolean),
  );
  const today = new Date(anchor);
  today.setHours(0, 0, 0, 0);
  const todayKey = localDateKey(today);

  let dayOffset = dateSet.has(todayKey) ? 0 : 1;
  let streak = 0;

  while (true) {
    const d = new Date(today);
    d.setDate(d.getDate() - dayOffset - streak);
    const key = localDateKey(d);
    if (dateSet.has(key)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
