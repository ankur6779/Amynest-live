/**
 * Amy Coach 3-day guided journey — shared constants + access rules.
 * Used by api-server and kidschedule.
 */

export const COACH_JOURNEY_FREE_DAYS = 3;
export const COACH_JOURNEY_CALENDAR_CAP_DAYS = 7;

/** Goals free users may try during the 3-day journey (premium unlocks all). */
export const FREE_COACH_GOAL_IDS = [
  "manage-tantrums",
  "balance-screen-time",
  "navigate-fussy-eating",
  "improve-sleep-patterns",
  "boost-concentration",
  "baby-not-sleeping",
  "manage-grandparents-interference",
  "toddler-tantrums",
  "potty-training-readiness",
  "sibling-rivalry",
  "travel-with-kids",
  "child-obesity-management",
  "parent-burnout",
] as const;

export type FreeCoachGoalId = (typeof FREE_COACH_GOAL_IDS)[number];

const FREE_GOAL_SET = new Set<string>(FREE_COACH_GOAL_IDS);

export interface CoachPlanRecord {
  goalId: string;
  sessionId: string;
  journeyDay: number;
  completedAt: string;
}

export interface CoachJourneyAccess {
  isPremium: boolean;
  isFreePeriod: boolean;
  isLocked: boolean;
  lockReason: "none" | "completed" | "expired" | "premium";
  daysCompleted: number;
  daysTotal: number;
  currentDay: number;
  calendarDaysLeft: number;
  calendarDeadline: string;
}

export type CoachGoalAccess = "open" | "try-free" | "locked";

export function isFreeCoachGoal(goalId: string): boolean {
  return FREE_GOAL_SET.has(goalId);
}

export function formatDateIso(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function normaliseCoachCompletedDays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (n): n is number =>
      typeof n === "number" && n >= 1 && n <= COACH_JOURNEY_FREE_DAYS,
  );
}

export function normaliseCoachPlans(raw: unknown): CoachPlanRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is CoachPlanRecord =>
      !!p &&
      typeof p === "object" &&
      typeof (p as CoachPlanRecord).goalId === "string" &&
      typeof (p as CoachPlanRecord).sessionId === "string" &&
      typeof (p as CoachPlanRecord).journeyDay === "number" &&
      typeof (p as CoachPlanRecord).completedAt === "string",
  );
}

export function completedGoalIdsFromPlans(plans: CoachPlanRecord[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of plans) {
    if (!seen.has(p.goalId)) {
      seen.add(p.goalId);
      out.push(p.goalId);
    }
  }
  return out;
}

/** Max distinct new topics a free user may start on a given journey day. */
export function maxNewGoalsForJourneyDay(journeyDay: number): number {
  if (journeyDay >= COACH_JOURNEY_FREE_DAYS) return FREE_COACH_GOAL_IDS.length;
  return Math.max(1, journeyDay);
}

export function computeCoachJourneyAccess(opts: {
  isPremium: boolean;
  completedDays: number[];
  startedAt: Date;
  now?: Date;
}): CoachJourneyAccess {
  const now = opts.now ?? new Date();
  if (opts.isPremium) {
    return {
      isPremium: true,
      isFreePeriod: false,
      isLocked: false,
      lockReason: "premium",
      daysCompleted: opts.completedDays.length,
      daysTotal: COACH_JOURNEY_FREE_DAYS,
      currentDay: Math.min(opts.completedDays.length + 1, COACH_JOURNEY_FREE_DAYS),
      calendarDaysLeft: COACH_JOURNEY_CALENDAR_CAP_DAYS,
      calendarDeadline: new Date(
        opts.startedAt.getTime() + COACH_JOURNEY_CALENDAR_CAP_DAYS * 86400000,
      ).toISOString(),
    };
  }

  const completed = normaliseCoachCompletedDays(opts.completedDays);
  const deadline = new Date(
    opts.startedAt.getTime() + COACH_JOURNEY_CALENDAR_CAP_DAYS * 86400000,
  );
  const msLeft = deadline.getTime() - now.getTime();
  const calendarDaysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
  const expired = msLeft <= 0 && completed.length < COACH_JOURNEY_FREE_DAYS;
  const allDone = completed.length >= COACH_JOURNEY_FREE_DAYS;
  const isLocked = allDone || expired;
  const currentDay = allDone
    ? COACH_JOURNEY_FREE_DAYS + 1
    : Math.min(completed.length + 1, COACH_JOURNEY_FREE_DAYS);

  return {
    isPremium: false,
    isFreePeriod: !isLocked,
    isLocked,
    lockReason: allDone ? "completed" : expired ? "expired" : "none",
    daysCompleted: completed.length,
    daysTotal: COACH_JOURNEY_FREE_DAYS,
    currentDay,
    calendarDaysLeft,
    calendarDeadline: deadline.toISOString(),
  };
}

export function getCoachGoalAccess(opts: {
  goalId: string;
  isPremium: boolean;
  access: CoachJourneyAccess;
  completedGoalIds: string[];
}): CoachGoalAccess {
  if (opts.isPremium) return "open";
  if (!isFreeCoachGoal(opts.goalId)) return "locked";
  if (opts.completedGoalIds.includes(opts.goalId)) return "open";
  if (opts.access.isLocked || !opts.access.isFreePeriod) return "locked";

  const maxNew = maxNewGoalsForJourneyDay(opts.access.currentDay);
  if (opts.completedGoalIds.length >= maxNew) return "locked";
  return "try-free";
}

export function canGenerateCoachPlan(opts: {
  goalId: string;
  isPremium: boolean;
  access: CoachJourneyAccess;
  completedGoalIds: string[];
}): boolean {
  return getCoachGoalAccess(opts) !== "locked";
}

/** Adaptive extend wins unlock from journey day 2 onward (or after day 1 complete). */
export function isCoachExtendUnlocked(opts: {
  isPremium: boolean;
  access: CoachJourneyAccess;
  completedDays: number[];
}): boolean {
  if (opts.isPremium) return true;
  if (!opts.access.isFreePeriod) return false;
  return opts.completedDays.length >= 1 || opts.access.currentDay >= 2;
}

/** Map legacy localStorage usage (2 lifetime topics) into journey state. */
export function migrateLegacyCoachUsage(blockUsedIds: string[]): {
  completedDays: number[];
  plansCompleted: CoachPlanRecord[];
} {
  const goals = blockUsedIds.filter(isFreeCoachGoal).slice(0, COACH_JOURNEY_FREE_DAYS);
  if (goals.length === 0) {
    return { completedDays: [], plansCompleted: [] };
  }
  const now = new Date().toISOString();
  const completedDays = goals.map((_, i) => i + 1);
  const plansCompleted: CoachPlanRecord[] = goals.map((goalId, i) => ({
    goalId,
    sessionId: `legacy-${goalId}`,
    journeyDay: i + 1,
    completedAt: now,
  }));
  return { completedDays, plansCompleted };
}
