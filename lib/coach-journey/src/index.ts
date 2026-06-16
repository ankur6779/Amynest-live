/**
 * Amy Coach freemium access rules — shared by api-server and kidschedule.
 * Show the full catalog; lock access (not visibility) after the first free
 * sample per category.
 */

import {
  COACH_CATEGORY_GOAL_IDS,
  coachGoalCategoryId,
  isFreeSampleCoachGoal,
  goalsInCoachCategory,
} from "./catalog.js";

export {
  COACH_CATEGORY_GOAL_IDS,
  coachGoalCategoryId,
  goalsInCoachCategory,
  coachCategoryGoalCount,
  totalCoachGoalCount,
  freeSampleCoachGoalId,
  isFreeSampleCoachGoal,
  goalIndexInCoachCategory,
} from "./catalog.js";

export {
  COACH_OPENAI_TIMEOUT_MS,
  COACH_WORKER_TIMEOUT_MS,
  COACH_QUEUE_TIMEOUT_MS,
  COACH_GATEWAY_TIMEOUT_MS,
  COACH_CLIENT_POLL_REQUEST_TIMEOUT_MS,
  COACH_CLIENT_POLL_INTERVAL_MS,
  COACH_CLIENT_POLL_MAX_MS,
  COACH_CLIENT_POLL_MAX_ATTEMPTS,
  COACH_CLIENT_POLL_OPTIONS,
  COACH_CLIENT_FETCH_TIMEOUT_MS,
  COACH_CLIENT_SLOW_MESSAGE_MS,
  COACH_TIMEOUT_STACK,
} from "./ai-timeouts.js";

export {
  COACH_GENERATE_TRACE_HEADER,
  COACH_GENERATE_TRACE_STAGES,
  createCoachGenerateTraceId,
  coachGenerateTraceHeaders,
  type CoachGenerateTraceStage,
  type CoachGenerateTraceEvent,
} from "./generate-trace.js";

export {
  buildCoachProgressViewModel,
  computeProgressTrend,
  type CoachProgressViewModel,
  type CoachPlanRef,
  type ProgressTrend,
  type MilestoneCelebration,
  type CoachFeedback,
} from "./progress-view.js";

export {
  buildCoachGraduationViewModel,
  shouldSuggestGoalReactivation,
  type CoachGraduationViewModel,
  type CoachGraduationInput,
  type CoachPastSuccess,
  type GraduationPath,
} from "./graduation-view.js";

export {
  resolveCoachCheckIn,
  buildCoachMemoryLine,
  coachCheckInNotificationCopy,
  mapCheckInResponseToTrend,
  pickPrimaryCoachSession,
  hoursSince,
  type CoachCheckInKind,
  type CoachCheckInViewModel,
  type CoachCheckInOption,
  type CoachCheckInHistoryEntry,
} from "./check-in-view.js";

export {
  createEmptyCoachIntelligence,
  applyCoachIntelligenceEvent,
  classifyWinStrategy,
  deriveCoachingProfile,
  rankStrategyConfidence,
  strategiesToPrefer,
  strategiesToAvoid,
  buildFamilyReferenceLine,
  buildCrossGoalInsight,
  detectIntelligencePlateau,
  renderCoachIntelligencePromptBlock,
  pickVariedPhrase,
  registerUsedPhrase,
  hashPhrase,
  mergeCoachIntelligenceSnapshots,
  buildPublicCoachIntelligenceView,
  STRATEGY_LABELS,
  type CoachIntelligencePublicView,
  type CoachIntelligenceSnapshot,
  type CoachIntelligenceEvent,
  type CoachStrategyTag,
  type CoachContentDensity,
  type CoachParentStyle,
  type StrategyConfidenceTier,
} from "./coaching-intelligence.js";

/** @deprecated Legacy journey window — kept for migration only. */
export const COACH_JOURNEY_FREE_DAYS = 3;
export const COACH_JOURNEY_CALENDAR_CAP_DAYS = 7;

/**
 * @deprecated Use isFreeSampleCoachGoal — first goal per category is free.
 * Retained for legacy localStorage migration.
 */
export const FREE_COACH_GOAL_IDS = Object.values(COACH_CATEGORY_GOAL_IDS)
  .map((ids) => ids[0])
  .filter(Boolean) as readonly string[];

export type FreeCoachGoalId = string;

const LEGACY_FREE_GOAL_SET = new Set<string>(FREE_COACH_GOAL_IDS);

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

/** @deprecated Use isFreeSampleCoachGoal */
export function isFreeCoachGoal(goalId: string): boolean {
  return isFreeSampleCoachGoal(goalId);
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

/** @deprecated Journey-day caps removed — catalog uses per-category free samples. */
export function maxNewGoalsForJourneyDay(_journeyDay: number): number {
  return Number.MAX_SAFE_INTEGER;
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

  return {
    isPremium: false,
    isFreePeriod: true,
    isLocked: false,
    lockReason: "none",
    daysCompleted: completed.length,
    daysTotal: COACH_JOURNEY_FREE_DAYS,
    currentDay: Math.min(completed.length + 1, COACH_JOURNEY_FREE_DAYS),
    calendarDaysLeft,
    calendarDeadline: deadline.toISOString(),
  };
}

/** Infant coach topics are static 12-win plans (no OpenAI) — always free per product rules. */
export const FREE_COACH_CATEGORIES = ["infant-problems"] as const;

export function isFreeCoachCategory(categoryId: string): boolean {
  return (FREE_COACH_CATEGORIES as readonly string[]).includes(categoryId);
}

export function getCoachGoalAccess(opts: {
  goalId: string;
  isPremium: boolean;
  access?: CoachJourneyAccess;
  completedGoalIds: string[];
}): CoachGoalAccess {
  if (opts.isPremium) return "open";

  const categoryId = coachGoalCategoryId(opts.goalId);
  if (!categoryId) return "locked";

  if (isFreeCoachCategory(categoryId)) return "open";

  const freeSampleId = goalsInCoachCategory(categoryId)[0];
  if (!freeSampleId) return "locked";

  if (opts.goalId === freeSampleId) {
    if (opts.completedGoalIds.includes(opts.goalId)) return "open";
    return "try-free";
  }

  return "locked";
}

export function canGenerateCoachPlan(opts: {
  goalId: string;
  isPremium: boolean;
  access?: CoachJourneyAccess;
  completedGoalIds: string[];
}): boolean {
  return getCoachGoalAccess(opts) !== "locked";
}

/** Win extension beyond the initial plan is a premium feature. */
export function isCoachExtendUnlocked(opts: {
  isPremium: boolean;
  access?: CoachJourneyAccess;
  completedDays?: number[];
}): boolean {
  return opts.isPremium;
}

/** Map legacy localStorage usage into journey state. */
export function migrateLegacyCoachUsage(blockUsedIds: string[]): {
  completedDays: number[];
  plansCompleted: CoachPlanRecord[];
} {
  const goals = blockUsedIds.filter((id) => LEGACY_FREE_GOAL_SET.has(id) || isFreeSampleCoachGoal(id)).slice(0, COACH_JOURNEY_FREE_DAYS);
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
