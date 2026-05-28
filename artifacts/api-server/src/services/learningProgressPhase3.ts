import { eq, and } from "drizzle-orm";
import {
  db,
  skillGraphProgressTable,
  type LearningProgressRow,
  type SkillGraphProgressRow,
} from "@workspace/db";
import {
  applyActivityToSkillGraph,
  composePhase3Status,
  buildDailyLearningSession,
  markSessionStepComplete,
  computeRewardEvents,
  mergeBadges,
  walletFromProfile,
  buildLearningMemory,
  type SkillGraphEntry,
  type Phase3Persisted,
  type RewardEvent,
  type DailyLearningSession,
} from "@workspace/learning-progress-engine";
import type {
  LearningProgressProfile,
  SectionKey,
  UnlockResult,
} from "@workspace/learning-progress-engine";
import { formatDateIso } from "@workspace/parent-hub-journey";

export function rowToSkillEntry(row: SkillGraphProgressRow): SkillGraphEntry {
  return {
    childId: row.childId,
    skillId: row.skillId,
    category: row.category as SkillGraphEntry["category"],
    mastery: row.mastery,
    confidence: row.confidence,
    attempts: row.attempts,
    lastPracticedAt: row.lastPracticedAt,
    relatedSkills: Array.isArray(row.relatedSkills) ? (row.relatedSkills as string[]) : [],
    weakAreas: Array.isArray(row.weakAreas) ? (row.weakAreas as string[]) : [],
    progressionStage: row.progressionStage as SkillGraphEntry["progressionStage"],
  };
}

export async function loadSkillGraphEntries(
  childId: number,
): Promise<SkillGraphEntry[]> {
  const rows = await db
    .select()
    .from(skillGraphProgressTable)
    .where(eq(skillGraphProgressTable.childId, childId));
  return rows.map(rowToSkillEntry);
}

export async function saveSkillGraphEntries(
  userId: string,
  childId: number,
  entries: SkillGraphEntry[],
): Promise<void> {
  for (const e of entries) {
    const [existing] = await db
      .select()
      .from(skillGraphProgressTable)
      .where(
        and(
          eq(skillGraphProgressTable.childId, childId),
          eq(skillGraphProgressTable.skillId, e.skillId),
        ),
      )
      .limit(1);
    if (existing) {
      await db
        .update(skillGraphProgressTable)
        .set({
          mastery: e.mastery,
          confidence: e.confidence,
          attempts: e.attempts,
          lastPracticedAt: e.lastPracticedAt,
          relatedSkills: e.relatedSkills,
          weakAreas: e.weakAreas,
          progressionStage: e.progressionStage,
          updatedAt: new Date(),
        })
        .where(eq(skillGraphProgressTable.id, existing.id));
    } else {
      await db.insert(skillGraphProgressTable).values({
        childId,
        userId,
        skillId: e.skillId,
        category: e.category,
        mastery: e.mastery,
        confidence: e.confidence,
        attempts: e.attempts,
        lastPracticedAt: e.lastPracticedAt,
        relatedSkills: e.relatedSkills,
        weakAreas: e.weakAreas,
        progressionStage: e.progressionStage,
      });
    }
  }
}

export function phase3FromRow(row: LearningProgressRow): Phase3Persisted {
  return {
    coins: row.coins ?? 0,
    stars: row.stars ?? 0,
    badges: Array.isArray(row.badges) ? (row.badges as string[]) : [],
    dailySession:
      row.dailySession && typeof row.dailySession === "object"
        ? (row.dailySession as DailyLearningSession)
        : null,
    learningMemory:
      row.learningMemory && typeof row.learningMemory === "object"
        ? (row.learningMemory as Phase3Persisted["learningMemory"])
        : null,
  };
}

export function computeCoinsStars(
  profile: LearningProgressProfile,
  persisted: Phase3Persisted,
  rewardEvents: RewardEvent[],
): { coins: number; stars: number } {
  let coins = persisted.coins ?? Math.floor(profile.totalXP / 8);
  let stars = persisted.stars ?? Math.floor(profile.masteryScore / 15) + profile.streakDays;
  for (const e of rewardEvents) {
    if (e.type === "coins" && e.amount) coins += e.amount;
    if (e.type === "stars" && e.amount) stars += e.amount;
  }
  return { coins, stars };
}

export async function processActivityPhase3(
  userId: string,
  childId: number,
  profile: LearningProgressProfile,
  unlocks: UnlockResult,
  activityId: string,
  section: SectionKey,
  correct: boolean,
  prevRow: LearningProgressRow,
  prevProfile: LearningProgressProfile,
): Promise<{
  skillEntries: SkillGraphEntry[];
  rewardEvents: RewardEvent[];
  persisted: Phase3Persisted;
  skillMastered: boolean;
}> {
  const dateIso = formatDateIso();
  let entries = await loadSkillGraphEntries(childId);
  const applied = applyActivityToSkillGraph(
    entries,
    childId,
    activityId,
    section,
    correct,
    dateIso,
  );
  entries = applied.entries;
  await saveSkillGraphEntries(userId, childId, entries);

  const persisted = phase3FromRow(prevRow);
  const xpGained = Math.max(0, profile.totalXP - prevProfile.totalXP);
  const rewardEvents = computeRewardEvents(
    {
      level: prevProfile.learningLevel,
      xp: prevProfile.totalXP,
      streakDays: prevProfile.streakDays,
      badges: persisted.badges,
    },
    profile,
    { xpGained, skillMastered: applied.skillMastered },
  );
  const badges = mergeBadges(persisted.badges, rewardEvents);
  const { coins, stars } = computeCoinsStars(profile, { ...persisted, badges }, rewardEvents);
  const memory = buildLearningMemory(profile, entries);

  const dailySession =
    persisted.dailySession ??
    buildDailyLearningSession(profile, memory, unlocks, {
      childId,
      dateIso,
    });

  return {
    skillEntries: entries,
    rewardEvents,
    persisted: {
      coins,
      stars,
      badges,
      dailySession,
      learningMemory: memory,
    },
    skillMastered: applied.skillMastered,
  };
}
