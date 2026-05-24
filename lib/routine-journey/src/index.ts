/**
 * Routine 3-day guided journey — shared constants + access rules.
 * Used by api-server and kidschedule.
 */

export const ROUTINE_JOURNEY_FREE_DAYS = 3;
export const ROUTINE_JOURNEY_FREE_GENERATIONS = 3;
export const ROUTINE_JOURNEY_CALENDAR_CAP_DAYS = 7;

export interface RoutineGenerationRecord {
  childId: number;
  date: string;
  journeyDay: number;
  completedAt: string;
}

export interface RoutineJourneyAccess {
  isPremium: boolean;
  isFreePeriod: boolean;
  isLocked: boolean;
  lockReason: "none" | "completed" | "expired" | "premium";
  generationsUsed: number;
  generationsTotal: number;
  daysCompleted: number;
  daysTotal: number;
  currentDay: number;
  calendarDaysLeft: number;
  calendarDeadline: string;
}

export function formatDateIso(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function normaliseRoutineCompletedDays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (n): n is number =>
      typeof n === "number" && n >= 1 && n <= ROUTINE_JOURNEY_FREE_DAYS,
  );
}

export function normaliseRoutineGenerations(raw: unknown): RoutineGenerationRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is RoutineGenerationRecord =>
      !!p &&
      typeof p === "object" &&
      typeof (p as RoutineGenerationRecord).childId === "number" &&
      typeof (p as RoutineGenerationRecord).date === "string" &&
      typeof (p as RoutineGenerationRecord).journeyDay === "number" &&
      typeof (p as RoutineGenerationRecord).completedAt === "string",
  );
}

export function computeRoutineJourneyAccess(opts: {
  isPremium: boolean;
  completedDays: number[];
  startedAt: Date;
  now?: Date;
}): RoutineJourneyAccess {
  const now = opts.now ?? new Date();
  if (opts.isPremium) {
    return {
      isPremium: true,
      isFreePeriod: false,
      isLocked: false,
      lockReason: "premium",
      generationsUsed: 0,
      generationsTotal: ROUTINE_JOURNEY_FREE_GENERATIONS,
      daysCompleted: opts.completedDays.length,
      daysTotal: ROUTINE_JOURNEY_FREE_DAYS,
      currentDay: Math.min(opts.completedDays.length + 1, ROUTINE_JOURNEY_FREE_DAYS),
      calendarDaysLeft: ROUTINE_JOURNEY_CALENDAR_CAP_DAYS,
      calendarDeadline: new Date(
        opts.startedAt.getTime() + ROUTINE_JOURNEY_CALENDAR_CAP_DAYS * 86400000,
      ).toISOString(),
    };
  }

  const completed = normaliseRoutineCompletedDays(opts.completedDays);
  const deadline = new Date(
    opts.startedAt.getTime() + ROUTINE_JOURNEY_CALENDAR_CAP_DAYS * 86400000,
  );
  const msLeft = deadline.getTime() - now.getTime();
  const calendarDaysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
  const expired = msLeft <= 0 && completed.length < ROUTINE_JOURNEY_FREE_DAYS;
  const allDone = completed.length >= ROUTINE_JOURNEY_FREE_DAYS;
  const isLocked = allDone || expired;
  const currentDay = allDone
    ? ROUTINE_JOURNEY_FREE_DAYS + 1
    : Math.min(completed.length + 1, ROUTINE_JOURNEY_FREE_DAYS);

  return {
    isPremium: false,
    isFreePeriod: !isLocked,
    isLocked,
    lockReason: allDone ? "completed" : expired ? "expired" : "none",
    generationsUsed: completed.length,
    generationsTotal: ROUTINE_JOURNEY_FREE_GENERATIONS,
    daysCompleted: completed.length,
    daysTotal: ROUTINE_JOURNEY_FREE_DAYS,
    currentDay,
    calendarDaysLeft,
    calendarDeadline: deadline.toISOString(),
  };
}

export function canGenerateRoutine(opts: {
  isPremium: boolean;
  access: RoutineJourneyAccess;
}): boolean {
  if (opts.isPremium) return true;
  return opts.access.isFreePeriod && !opts.access.isLocked;
}

/** Map legacy lifetime usage counter (0–2) into journey state. */
export function migrateLegacyRoutineUsage(usageCount: number): {
  completedDays: number[];
  generationsCompleted: RoutineGenerationRecord[];
} {
  const capped = Math.min(
    Math.max(0, usageCount),
    ROUTINE_JOURNEY_FREE_GENERATIONS,
  );
  if (capped === 0) {
    return { completedDays: [], generationsCompleted: [] };
  }
  const now = new Date().toISOString();
  const completedDays = Array.from({ length: capped }, (_, i) => i + 1);
  const generationsCompleted: RoutineGenerationRecord[] = completedDays.map(
    (journeyDay) => ({
      childId: 0,
      date: "legacy",
      journeyDay,
      completedAt: now,
    }),
  );
  return { completedDays, generationsCompleted };
}
