import { eq, and, sql } from "drizzle-orm";
import {
  db,
  childrenTable,
  learningProgressTable,
  parentProfilesTable,
} from "@workspace/db";
import {
  filterUnlockedCatalog,
  getRecommendedNextLesson,
  getUnseenLessons,
  toFreshLessonSummary,
  lessonSummaryFromId,
  readLessonVisibility,
  readFreshLessonState,
  mergeFreshLessonState,
  recordLessonViewed,
  extractCompletedSmartStudyIds,
  smartStudyActivityId,
  parseContentBankActivityId,
  buildFreshLessonSequence,
  resolveFreshLessonOnLogin,
  emptyFreshLessonState,
  assignFreshLesson,
  computeLessonEligibilityStats,
  pickFirstEligibleLessonId,
  isFreshLessonStateValid,
  validateLessonEligibility,
  type FreshLessonSummary,
  type ContentBankLessonVisibility,
  type FreshLessonProgressState,
  type FreshLessonProgressEvent,
  type ContentBankUnlockContext,
} from "@workspace/content-bank";
import { resolveStudyMode, normalizeStudyCountry } from "@workspace/study-zone";
import { logger } from "../lib/logger.js";
import { getOrCreateSubscription, isPremiumNow } from "./subscriptionService.js";
import { recordProgressAnalytics } from "./learningProgressService.js";
import {
  loadContentBankCategory,
  type SmartStudyLesson,
} from "./contentBankStore.js";

export type { FreshLessonSummary, ContentBankLessonVisibility, FreshLessonProgressState };

export interface StudyZoneRecommendationContext extends ContentBankUnlockContext {
  childId: number;
  dateIso: string;
  isPremium: boolean;
  visibility: ContentBankLessonVisibility;
  freshState: FreshLessonProgressState;
  completedActivityIds: string[];
  unlockedLessons: SmartStudyLesson[];
  contentBankAvailable: boolean;
  sectionProgress: Record<string, unknown>;
  progressRowId: number | null;
}


async function loadOwnedChildProfile(childId: number, userId: string) {
  const rows = await db
    .select({
      id: childrenTable.id,
      age: childrenTable.age,
      childClass: childrenTable.childClass,
    })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

async function loadUserCountry(userId: string): Promise<string> {
  const rows = await db
    .select({ country: parentProfilesTable.country })
    .from(parentProfilesTable)
    .where(eq(parentProfilesTable.userId, userId))
    .limit(1);
  return normalizeStudyCountry(rows[0]?.country);
}

async function loadProgressRow(childId: number, userId: string) {
  const rows = await db
    .select()
    .from(learningProgressTable)
    .where(
      and(
        eq(learningProgressTable.childId, childId),
        eq(learningProgressTable.userId, userId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function loadUnlockContextFields(
  userId: string,
  childId: number,
  dateIso: string,
  isPremium: boolean,
) {
  const child = await loadOwnedChildProfile(childId, userId);
  if (!child) return null;
  const row = await loadProgressRow(childId, userId);
  const completed = Array.isArray(row?.completedActivities)
    ? (row.completedActivities as string[])
    : [];
  const sectionProgress =
    row?.sectionProgress && typeof row.sectionProgress === "object"
      ? (row.sectionProgress as Record<string, unknown>)
      : {};
  const studyMode = resolveStudyMode(child.age, child.childClass);
  const country = await loadUserCountry(userId);
  return {
    childAge: child.age,
    childClass: child.childClass,
    studyMode,
    country,
    learningLevel: row?.learningLevel ?? 1,
    masteryScore: row?.masteryScore ?? 0,
    journeyDay: row?.journeyDay ?? 1,
    completedActivityIds: completed,
    dateIso,
    childId,
    isPremium,
    sectionProgress,
    progressRowId: row?.id ?? null,
  };
}

export async function loadStudyZoneRecommendationContext(
  userId: string,
  childId: number,
  dateIso: string,
): Promise<StudyZoneRecommendationContext | null> {
  const sub = await getOrCreateSubscription(userId);
  const isPremium = isPremiumNow(sub);
  const fields = await loadUnlockContextFields(userId, childId, dateIso, isPremium);
  if (!fields) return null;

  const visibility = readLessonVisibility(fields.sectionProgress);
  const freshState = readFreshLessonState(fields.sectionProgress);
  let unlockedLessons: SmartStudyLesson[] = [];
  let contentBankAvailable = false;

  try {
    const catalog = await loadContentBankCategory<SmartStudyLesson>("smart-study");
    const stats = computeLessonEligibilityStats(childId, catalog, fields);
    logger.info(
      `daily-fresh-lesson catalog: childId=${stats.childId} age=${stats.childAge} class=${stats.childClass ?? "none"} mode=${stats.studyMode} total=${stats.totalLessons} eligible=${stats.eligibleLessons} filtered=${stats.filteredLessons} bands=${stats.minAgeBand}-${stats.maxAgeBand}`,
    );
    unlockedLessons = filterUnlockedCatalog("smart-study", catalog, fields);
    contentBankAvailable = catalog.length > 0;
  } catch (err) {
    logger.warn(
      `study-zone recommendations: content bank unavailable (${err instanceof Error ? err.message : String(err)})`,
    );
  }

  return {
    childId,
    childAge: fields.childAge,
    childClass: fields.childClass,
    studyMode: fields.studyMode,
    country: fields.country,
    learningLevel: fields.learningLevel,
    masteryScore: fields.masteryScore,
    journeyDay: fields.journeyDay,
    completedActivityIds: fields.completedActivityIds,
    dateIso,
    isPremium,
    visibility,
    freshState,
    unlockedLessons,
    contentBankAvailable,
    sectionProgress: fields.sectionProgress,
    progressRowId: fields.progressRowId,
  };
}

async function persistFreshLessonState(
  userId: string,
  childId: number,
  freshState: FreshLessonProgressState,
): Promise<void> {
  await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(learningProgressTable)
      .where(
        and(
          eq(learningProgressTable.childId, childId),
          eq(learningProgressTable.userId, userId),
        ),
      )
      .for("update")
      .limit(1);

    let row = existing[0];
    if (!row) {
      const inserted = await tx
        .insert(learningProgressTable)
        .values({ childId, userId })
        .returning();
      row = inserted[0];
    }
    if (!row?.id) return;

    const sectionProgress =
      row.sectionProgress && typeof row.sectionProgress === "object"
        ? (row.sectionProgress as Record<string, unknown>)
        : {};
    const visibility = readLessonVisibility(sectionProgress);
    const nextSection = mergeFreshLessonState(
      sectionProgress,
      visibility,
      freshState,
    );
    await tx
      .update(learningProgressTable)
      .set({
        sectionProgress: nextSection,
        updatedAt: sql`now()`,
      })
      .where(eq(learningProgressTable.id, row.id));
  });
}

async function emitFreshLessonAnalytics(
  userId: string,
  childId: number,
  event: FreshLessonProgressEvent,
  lessonId: string | null,
): Promise<void> {
  if (!lessonId) return;
  const analyticsEvent =
    event === "assigned" ? "fresh_lesson_assigned"
      : event === "advanced" ? "fresh_lesson_advanced"
        : "fresh_lesson_reopened";
  await recordProgressAnalytics(userId, childId, analyticsEvent, {
    lessonId,
  });
}

export interface ResolveFreshLessonResult {
  lesson: FreshLessonSummary | null;
  state: FreshLessonProgressState;
  event: FreshLessonProgressEvent;
}

/**
 * Login-driven fresh lesson: resolves progression, persists state, emits analytics.
 */
export async function resolveAndPersistFreshLesson(
  userId: string,
  childId: number,
  dateIso: string,
  nowMs: number = Date.now(),
): Promise<ResolveFreshLessonResult | null> {
  const ctx = await loadStudyZoneRecommendationContext(userId, childId, dateIso);
  if (!ctx || !ctx.contentBankAvailable || ctx.unlockedLessons.length === 0) {
    return null;
  }

  let freshState = ctx.freshState;
  if (!isFreshLessonStateValid(freshState, ctx, ctx.unlockedLessons)) {
    logger.warn(
      `daily-fresh-lesson: discarding stale sequence for childId=${childId} lesson=${freshState.currentFreshLessonId ?? "none"}`,
    );
    freshState = emptyFreshLessonState();
  }

  const sequence = buildFreshLessonSequence(
    ctx.unlockedLessons,
    ctx.visibility,
    ctx.completedActivityIds,
  );

  let resolved = resolveFreshLessonOnLogin({
    state: freshState,
    sequence,
    nowMs,
  });

  let lessonId = resolved.lessonId;
  if (lessonId) {
    const lesson = ctx.unlockedLessons.find((l) => l.id === lessonId);
    if (!lesson || !validateLessonEligibility(ctx, lesson)) {
      logger.warn(
        `daily-fresh-lesson: rejected ineligible lesson childId=${childId} lessonId=${lessonId} mode=${ctx.studyMode} class=${ctx.childClass ?? "none"}`,
      );
      const fallbackId = pickFirstEligibleLessonId(sequence, ctx, ctx.unlockedLessons);
      if (!fallbackId) {
        return { lesson: null, state: emptyFreshLessonState(), event: "reopened" };
      }
      const assignedAtIso = new Date(nowMs).toISOString();
      resolved = {
        state: assignFreshLesson(sequence, fallbackId, assignedAtIso),
        lessonId: fallbackId,
        event: "assigned",
      };
      lessonId = fallbackId;
    }
  }

  const stateChanged =
    resolved.state.currentFreshLessonId !== ctx.freshState.currentFreshLessonId
    || resolved.state.currentFreshLessonAssignedAt !== ctx.freshState.currentFreshLessonAssignedAt
    || resolved.state.freshLessonSequence.join(",") !== ctx.freshState.freshLessonSequence.join(",");

  if (stateChanged) {
    await persistFreshLessonState(userId, childId, resolved.state);
  }

  if (resolved.event === "assigned" || resolved.event === "advanced") {
    await emitFreshLessonAnalytics(userId, childId, resolved.event, lessonId);
  } else if (resolved.event === "reopened") {
    await emitFreshLessonAnalytics(userId, childId, "reopened", lessonId);
  }

  const lesson = lessonId
    ? lessonSummaryFromId(
        lessonId,
        ctx.unlockedLessons,
        ctx.visibility,
        ctx.completedActivityIds,
        resolved.state.currentFreshLessonAssignedAt,
      )
    : null;

  return { lesson, state: resolved.state, event: resolved.event };
}

export async function getCurrentFreshLesson(
  userId: string,
  childId: number,
  dateIso: string,
): Promise<FreshLessonSummary | null> {
  const out = await resolveAndPersistFreshLesson(userId, childId, dateIso);
  return out?.lesson ?? null;
}

export function getDailyFreshLessonFromContext(
  ctx: StudyZoneRecommendationContext,
): FreshLessonSummary | null {
  if (!ctx.contentBankAvailable || !ctx.freshState.currentFreshLessonId) return null;
  const lesson = ctx.unlockedLessons.find(
    (l) => l.id === ctx.freshState.currentFreshLessonId,
  );
  if (!lesson || !validateLessonEligibility(ctx, lesson)) return null;
  return lessonSummaryFromId(
    ctx.freshState.currentFreshLessonId,
    ctx.unlockedLessons,
    ctx.visibility,
    ctx.completedActivityIds,
    ctx.freshState.currentFreshLessonAssignedAt,
  );
}

export async function getDailyFreshLesson(
  userId: string,
  childId: number,
  dateIso: string,
): Promise<FreshLessonSummary | null> {
  return getCurrentFreshLesson(userId, childId, dateIso);
}

export function getUnseenLessonsFromContext(
  ctx: StudyZoneRecommendationContext,
): FreshLessonSummary[] {
  if (!ctx.contentBankAvailable) return [];
  return getUnseenLessons(
    ctx.unlockedLessons,
    ctx.visibility,
    ctx.completedActivityIds,
  ).map((l) => toFreshLessonSummary(l, true));
}

export async function getUnseenLessonsForChild(
  userId: string,
  childId: number,
  dateIso: string,
): Promise<FreshLessonSummary[]> {
  const ctx = await loadStudyZoneRecommendationContext(userId, childId, dateIso);
  if (!ctx) return [];
  return getUnseenLessonsFromContext(ctx);
}

export async function getRecommendedNextLessonForTopic(
  userId: string,
  childId: number,
  dateIso: string,
  subjectPackId: string,
  topicId: string,
): Promise<FreshLessonSummary | null> {
  const ctx = await loadStudyZoneRecommendationContext(userId, childId, dateIso);
  if (!ctx || !ctx.contentBankAvailable) return null;
  return getRecommendedNextLesson(
    childId,
    dateIso,
    subjectPackId,
    topicId,
    ctx.unlockedLessons,
    ctx.visibility,
    ctx.completedActivityIds,
  );
}

export function completedContentBankLessonIds(
  completedActivityIds: string[],
): Set<string> {
  return extractCompletedSmartStudyIds(completedActivityIds);
}

export async function recordContentBankLessonViewed(
  userId: string,
  childId: number,
  lessonId: string,
): Promise<boolean> {
  const ts = new Date().toISOString();
  let updated = false;
  await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(learningProgressTable)
      .where(
        and(
          eq(learningProgressTable.childId, childId),
          eq(learningProgressTable.userId, userId),
        ),
      )
      .for("update")
      .limit(1);

    let row = existing[0];
    if (!row) {
      const inserted = await tx
        .insert(learningProgressTable)
        .values({ childId, userId })
        .returning();
      row = inserted[0];
    }
    if (!row?.id) return;

    const prevSection =
      row.sectionProgress && typeof row.sectionProgress === "object"
        ? (row.sectionProgress as Record<string, unknown>)
        : {};
    const visibility = recordLessonViewed(
      readLessonVisibility(prevSection),
      lessonId,
      ts,
    );
    const freshState = readFreshLessonState(prevSection);
    const nextSection = mergeFreshLessonState(prevSection, visibility, freshState);
    await tx
      .update(learningProgressTable)
      .set({
        sectionProgress: nextSection,
        lastActiveDate: ts.slice(0, 10),
        updatedAt: sql`now()`,
      })
      .where(eq(learningProgressTable.id, row.id));
    updated = true;
  });
  return updated;
}

export async function notifyFreshLessonCompleted(
  userId: string,
  childId: number,
  activityId: string,
): Promise<void> {
  const parsed = parseContentBankActivityId(activityId);
  if (parsed?.category !== "smart-study") return;
  const row = await loadProgressRow(childId, userId);
  if (!row) return;
  const sectionProgress =
    row.sectionProgress && typeof row.sectionProgress === "object"
      ? (row.sectionProgress as Record<string, unknown>)
      : {};
  const freshState = readFreshLessonState(sectionProgress);
  if (freshState.currentFreshLessonId !== parsed.itemId) return;
  await recordProgressAnalytics(userId, childId, "fresh_lesson_completed", {
    lessonId: parsed.itemId,
  });
}

export async function loadSmartStudyLessonItem(
  userId: string,
  childId: number,
  lessonId: string,
  dateIso: string,
): Promise<SmartStudyLesson | null> {
  const ctx = await loadStudyZoneRecommendationContext(userId, childId, dateIso);
  if (!ctx) return null;
  const lesson = ctx.unlockedLessons.find((l) => l.id === lessonId);
  if (!lesson || !validateLessonEligibility(ctx, lesson)) return null;
  return lesson;
}

export { smartStudyActivityId };
