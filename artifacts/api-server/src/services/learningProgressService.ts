import { eq, and } from "drizzle-orm";
import {
  db,
  childrenTable,
  learningProgressTable,
  childLearningProgressTable,
  lifeSkillsProgressTable,
  speechPracticeLogTable,
  type LearningProgressRow,
} from "@workspace/db";
import { formatDateIso, normaliseCompletedDays, computeHubJourneyAccess } from "@workspace/parent-hub-journey";
import {
  buildLearningProfile,
  computeLearningProgressStatus,
  recordActivityCompletion,
  buildWeeklyParentReport,
  defaultSectionProgress,
  PROGRESS_ANALYTICS_EVENTS,
  composePhase3Status,
  buildDailyLearningSession,
  markSessionStepComplete,
  computeRewardEvents,
  mergeBadges,
  buildLearningMemory,
  evaluateActivityIngest,
  type LearningProgressProfile,
  type ProgressAnalyticsEvent,
  type SectionKey,
  type SectionProgress,
  type RewardEvent,
  type RecentActivityEvent,
} from "@workspace/learning-progress-engine";
import { getHubJourneyStatus } from "./parentHubJourneyService.js";
import { getOrCreateSubscription, isPremiumNow } from "./subscriptionService.js";
import { parentHubJourneyTable } from "@workspace/db";
import {
  loadSkillGraphEntries,
  phase3FromRow,
  processActivityPhase3,
  computeCoinsStars,
} from "./learningProgressPhase3.js";
import { logger } from "../lib/logger.js";
/**
 * Phase 6 — derives a recent activity log from the canonical completed-list.
 * This avoids a new persistent table; the last N entries are sufficient for
 * cooldown / repetition checks and they're already authoritative.
 */
function buildRecentActivityFromProfile(
  profile: LearningProgressProfile,
): RecentActivityEvent[] {
  const acts = profile.completedActivities ?? [];
  const last = acts.slice(-40);
  // We don't persist per-activity timestamps in completedActivities — stagger
  // synthetic timestamps backwards from `now` so the cooldown window catches
  // genuine bursts but never blocks normal use.
  const now = Date.now();
  return last.map((id, i) => ({
    activityId: id,
    section: "math" as SectionKey,
    correct: true,
    at: new Date(now - (last.length - i) * 30_000).toISOString(),
  }));
}

function rowToProfile(row: LearningProgressRow): Partial<LearningProgressProfile> {
  return {
    journeyDay: row.journeyDay,
    learningLevel: row.learningLevel,
    masteryScore: row.masteryScore,
    streakDays: row.streakDays,
    totalXP: row.totalXP,
    completedActivities: Array.isArray(row.completedActivities)
      ? (row.completedActivities as string[])
      : [],
    unlockedSkills: Array.isArray(row.unlockedSkills)
      ? (row.unlockedSkills as string[])
      : [],
    weakSkills: Array.isArray(row.weakSkills) ? (row.weakSkills as string[]) : [],
    preferredLearningModes: Array.isArray(row.preferredLearningModes)
      ? (row.preferredLearningModes as string[])
      : [],
    lastActiveDate: row.lastActiveDate,
    currentPhase: row.currentPhase as LearningProgressProfile["currentPhase"],
    currentCurriculumStage:
      row.currentCurriculumStage as LearningProgressProfile["currentCurriculumStage"],
    dailyUnlockSeed: row.dailyUnlockSeed,
    nextRecommendedSkills: Array.isArray(row.nextRecommendedSkills)
      ? (row.nextRecommendedSkills as string[])
      : [],
    sectionProgress: {
      ...defaultSectionProgress(),
      ...(typeof row.sectionProgress === "object" && row.sectionProgress !== null
        ? (row.sectionProgress as Record<SectionKey, SectionProgress>)
        : {}),
    },
  };
}

async function loadOwnedChild(userId: string, childId: number) {
  const [child] = await db
    .select({
      id: childrenTable.id,
      name: childrenTable.name,
      age: childrenTable.age,
      ageMonths: childrenTable.ageMonths,
    })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return child ?? null;
}

async function ensureLearningProgressRow(
  userId: string,
  childId: number,
): Promise<LearningProgressRow> {
  const [existing] = await db
    .select()
    .from(learningProgressTable)
    .where(eq(learningProgressTable.childId, childId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(learningProgressTable)
    .values({
      childId,
      userId,
      sectionProgress: defaultSectionProgress(),
    })
    .returning();
  if (!created) throw new Error("learning_progress_insert_failed");
  return created;
}

/** Merge smart-study + speech + life-skills snapshots into section progress on read. */
async function enrichSectionProgress(
  userId: string,
  childId: number,
  base: Record<SectionKey, SectionProgress>,
): Promise<Record<SectionKey, SectionProgress>> {
  const out = { ...base };

  const studyRows = await db
    .select()
    .from(childLearningProgressTable)
    .where(
      and(
        eq(childLearningProgressTable.childId, childId),
        eq(childLearningProgressTable.userId, userId),
      ),
    );

  for (const r of studyRows) {
    const attempts = Array.isArray(r.accuracyRecent)
      ? (r.accuracyRecent as { correct: boolean }[])
      : [];
    const correct = attempts.filter((a) => a.correct).length;
    const pct =
      attempts.length > 0 ? Math.round((correct / attempts.length) * 100) : 0;
    const subject = String(r.subject ?? "");
    if (subject === "math" || subject === "english") {
      const key: SectionKey = subject === "math" ? "math" : "phonics";
      out[key] = {
        level: r.currentLevel ?? 1,
        masteryPct: Math.max(out[key]?.masteryPct ?? 0, pct),
        activitiesCompleted: attempts.length,
        lastActivityId: null,
      };
    }
  }

  const speechLogs = await db
    .select({ clarityScore: speechPracticeLogTable.clarityScore })
    .from(speechPracticeLogTable)
    .where(
      and(
        eq(speechPracticeLogTable.childId, childId),
        eq(speechPracticeLogTable.userId, userId),
      ),
    )
    .limit(50);
  if (speechLogs.length > 0) {
    const scored = speechLogs.filter((l) => l.clarityScore != null);
    const avg =
      scored.length > 0
        ? scored.reduce((s, l) => s + (l.clarityScore ?? 0), 0) / scored.length
        : 40;
    out.speech = {
      level: Math.min(7, Math.floor(avg / 15) + 1),
      masteryPct: Math.min(100, Math.round(avg)),
      activitiesCompleted: speechLogs.length,
      lastActivityId: null,
    };
  }

  const lsRows = await db
    .select({ completedDates: lifeSkillsProgressTable.completedDates })
    .from(lifeSkillsProgressTable)
    .where(
      and(
        eq(lifeSkillsProgressTable.childId, childId),
        eq(lifeSkillsProgressTable.userId, userId),
      ),
    );
  let lsCount = 0;
  for (const r of lsRows) {
    if (Array.isArray(r.completedDates)) lsCount += r.completedDates.length;
  }
  if (lsCount > 0) {
    out.lifeSkills = {
      level: Math.min(10, Math.floor(lsCount / 5) + 1),
      masteryPct: Math.min(100, lsCount * 3),
      activitiesCompleted: lsCount,
      lastActivityId: null,
    };
  }

  return out;
}

export async function getLearningProgressStatus(userId: string, childId: number) {
  const child = await loadOwnedChild(userId, childId);
  if (!child) return null;

  const hubStatus = await getHubJourneyStatus(userId, childId);
  if (!hubStatus) return null;

  const sub = await getOrCreateSubscription(userId);
  const premium = isPremiumNow(sub);
  const row = await ensureLearningProgressRow(userId, childId);
  const partial = rowToProfile(row);
  partial.sectionProgress = await enrichSectionProgress(
    userId,
    childId,
    partial.sectionProgress ?? defaultSectionProgress(),
  );
  partial.journeyDay = hubStatus.journeyDay;

  const status = computeLearningProgressStatus({
    childId,
    age: child.age,
    journeyDay: hubStatus.journeyDay,
    isPremium: premium,
    hubAccess: hubStatus.access,
    profile: partial,
    dateIso: formatDateIso(),
  });

  const weeklyReport = buildWeeklyParentReport({ profile: status.profile });
  const skillEntries = await loadSkillGraphEntries(childId);
  const persisted = phase3FromRow(row);
  const phase3 = composePhase3Status({
    childId,
    childName: child.name,
    profile: status.profile,
    unlocks: status.unlocks,
    hubAccess: status.hubAccess,
    isPremium: premium,
    weeklyReport,
    skillEntries,
    persisted,
    dateIso: formatDateIso(),
  });

  return {
    ...status,
    weeklyReport,
    phase3,
    rewardEvents: [] as RewardEvent[],
    child: {
      id: child.id,
      name: child.name,
      age: child.age,
      ageMonths: child.ageMonths ?? 0,
    },
    journeyDay: hubStatus.journeyDay,
  };
}

export async function completeLearningActivity(
  userId: string,
  childId: number,
  activityId: string,
  section: SectionKey,
  correct: boolean,
) {
  const child = await loadOwnedChild(userId, childId);
  if (!child) return null;

  const hubStatus = await getHubJourneyStatus(userId, childId);
  if (!hubStatus) return null;

  const row = await ensureLearningProgressRow(userId, childId);
  const prevProfile = buildLearningProfile(childId, rowToProfile(row), child.age);
  prevProfile.journeyDay = hubStatus.journeyDay;
  prevProfile.sectionProgress = await enrichSectionProgress(
    userId,
    childId,
    prevProfile.sectionProgress,
  );

  // Phase 6 anti-spam — gate credit using a server-side recent activity log
  // derived from the canonical `completedActivities` list. We treat the last
  // 40 entries as the active window for cooldown / repetition checks.
  const recent = buildRecentActivityFromProfile(prevProfile);
  const ingest = evaluateActivityIngest({
    activityId,
    section,
    correct,
    recent,
    profile: prevProfile,
  });

  if (ingest.decision === "ignore") {
    logger.info(
      {
        kind: "learning_progress_anti_spam",
        userId,
        childId,
        activityId,
        reason: ingest.reason,
      },
      "[learning_progress] activity suppressed",
    );
    const status = await getLearningProgressStatus(userId, childId);
    return status ? { ...status, rewardEvents: [] as RewardEvent[] } : null;
  }

  const updates = recordActivityCompletion(
    prevProfile,
    activityId,
    section,
    correct,
    formatDateIso(),
  );

  // Diminishing returns — partially credit XP but skip the activity log
  // mutation so repeated spammed completions don't pollute the profile.
  if (ingest.decision === "diminish" && updates.totalXP != null) {
    const earned = updates.totalXP - prevProfile.totalXP;
    updates.totalXP = prevProfile.totalXP + Math.round(earned * ingest.xpMultiplier);
  }

  const merged = buildLearningProfile(childId, { ...prevProfile, ...updates }, child.age);

  const sub = await getOrCreateSubscription(userId);
  const premium = isPremiumNow(sub);
  const statusPreview = computeLearningProgressStatus({
    childId,
    age: child.age,
    journeyDay: hubStatus.journeyDay,
    isPremium: premium,
    hubAccess: hubStatus.access,
    profile: merged,
    dateIso: formatDateIso(),
  });

  const phase3Result = await processActivityPhase3(
    userId,
    childId,
    merged,
    statusPreview.unlocks,
    activityId,
    section,
    correct,
    row,
    prevProfile,
  );

  await db
    .update(learningProgressTable)
    .set({
      learningLevel: merged.learningLevel,
      masteryScore: merged.masteryScore,
      streakDays: merged.streakDays,
      totalXP: merged.totalXP,
      completedActivities: merged.completedActivities,
      unlockedSkills: merged.unlockedSkills,
      weakSkills: merged.weakSkills,
      lastActiveDate: merged.lastActiveDate,
      currentPhase: merged.currentPhase,
      currentCurriculumStage: merged.currentCurriculumStage,
      sectionProgress: merged.sectionProgress,
      journeyDay: hubStatus.journeyDay,
      coins: phase3Result.persisted.coins,
      stars: phase3Result.persisted.stars,
      badges: phase3Result.persisted.badges,
      dailySession: phase3Result.persisted.dailySession,
      learningMemory: phase3Result.persisted.learningMemory,
      updatedAt: new Date(),
    })
    .where(eq(learningProgressTable.childId, childId));

  const full = await getLearningProgressStatus(userId, childId);
  if (!full) return null;
  return { ...full, rewardEvents: phase3Result.rewardEvents };
}

export async function completeSessionStep(
  userId: string,
  childId: number,
  stepId: string,
) {
  const child = await loadOwnedChild(userId, childId);
  if (!child) return null;
  const row = await ensureLearningProgressRow(userId, childId);
  const persisted = phase3FromRow(row);
  const profile = buildLearningProfile(childId, rowToProfile(row), child.age);
  const hubStatus = await getHubJourneyStatus(userId, childId);
  if (!hubStatus) return null;
  const sub = await getOrCreateSubscription(userId);
  const premium = isPremiumNow(sub);
  const baseStatus = computeLearningProgressStatus({
    childId,
    age: child.age,
    journeyDay: hubStatus.journeyDay,
    isPremium: premium,
    hubAccess: hubStatus.access,
    profile,
    dateIso: formatDateIso(),
  });
  const memory = buildLearningMemory(profile, await loadSkillGraphEntries(childId));
  let session =
    persisted.dailySession ??
    buildDailyLearningSession(profile, memory, baseStatus.unlocks, {
      childId,
      dateIso: formatDateIso(),
    });
  session = markSessionStepComplete(session, stepId);
  const completedIds = session.items.filter((i) => i.completed).map((i) => i.id);
  session = buildDailyLearningSession(profile, memory, baseStatus.unlocks, {
    childId,
    dateIso: session.dateIso,
    completedStepIds: completedIds,
  });
  await db
    .update(learningProgressTable)
    .set({ dailySession: session, updatedAt: new Date() })
    .where(eq(learningProgressTable.childId, childId));
  const full = await getLearningProgressStatus(userId, childId);
  if (!full) return null;
  let rewardEvents: RewardEvent[] = [];
  if (session.isComplete) {
    rewardEvents = computeRewardEvents(
      { level: profile.learningLevel, xp: profile.totalXP, streakDays: profile.streakDays, badges: persisted.badges },
      profile,
      { sessionJustCompleted: true },
    );
    const badges = mergeBadges(persisted.badges, rewardEvents);
    const { coins, stars } = computeCoinsStars(profile, { ...persisted, badges }, rewardEvents);
    await db
      .update(learningProgressTable)
      .set({ badges, coins, stars, updatedAt: new Date() })
      .where(eq(learningProgressTable.childId, childId));
  }
  return { ...full, rewardEvents, sessionComplete: session.isComplete };
}

export function isValidProgressEvent(
  event: string,
): event is ProgressAnalyticsEvent {
  return (PROGRESS_ANALYTICS_EVENTS as readonly string[]).includes(event);
}

export async function recordProgressAnalytics(
  userId: string,
  childId: number,
  event: ProgressAnalyticsEvent,
  metadata?: Record<string, string | number | boolean>,
): Promise<boolean> {
  const child = await loadOwnedChild(userId, childId);
  if (!child) return false;
  logger.info(
    {
      kind: "learning_progress_analytics",
      userId,
      childId,
      event,
      metadata,
    },
    `[learning_progress] ${event}`,
  );
  return true;
}

export async function getHubJourneyDayForUser(userId: string): Promise<number> {
  const [row] = await db
    .select()
    .from(parentHubJourneyTable)
    .where(eq(parentHubJourneyTable.userId, userId))
    .limit(1);
  if (!row) return 1;
  const sub = await getOrCreateSubscription(userId);
  const premium = isPremiumNow(sub);
  const access = computeHubJourneyAccess({
    isPremium: premium,
    completedDays: normaliseCompletedDays(row.completedDays),
    startedAt: row.startedAt,
  });
  return premium
    ? Math.min(normaliseCompletedDays(row.completedDays).length + 1, 3)
    : access.currentDay;
}
