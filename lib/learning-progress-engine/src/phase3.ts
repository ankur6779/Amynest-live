/**
 * Phase 3 bundle — composes skill graph, memory, sessions, rewards, routing.
 * All features derive from LearningProgressEngine inputs (no parallel progression).
 */

import type { LearningProgressProfile, UnlockResult, WeeklyParentReport } from "./types";
import type { HubJourneyAccess } from "@workspace/parent-hub-journey";
import { formatDateIso } from "@workspace/parent-hub-journey";
import {
  activityToSkillIds,
  applySkillAttempt,
  type SkillGraphEntry,
} from "./skill-graph";
import { buildLearningMemory, type LearningMemory } from "./learning-memory";
import {
  buildDailyLearningSession,
  markSessionStepComplete,
  type DailyLearningSession,
} from "./daily-session";
import {
  computeRewardEvents,
  mergeBadges,
  walletFromProfile,
  type RewardEvent,
  type RewardWallet,
} from "./rewards";
import { difficultyAdjustmentEngine, type DifficultyAdjustment } from "./difficulty-engine";
import { buildComebackMission, daysSinceActive, type ComebackMission } from "./re-engagement";
import { buildSkillTrees } from "./skill-trees";
import { buildAdaptiveRecommendations, type AdaptiveRecommendation } from "./adaptive-routing";
import { buildProactiveTutorLines, type ProactiveTutorLine } from "./ai-tutor-insights";
import { buildParentGrowthDashboard, type ParentGrowthDashboard } from "./parent-insights";

export interface Phase3Persisted {
  coins: number;
  stars: number;
  badges: string[];
  dailySession: DailyLearningSession | null;
  learningMemory: LearningMemory | null;
}

export interface Phase3Status {
  skillGraph: SkillGraphEntry[];
  memory: LearningMemory;
  dailySession: DailyLearningSession;
  wallet: RewardWallet;
  difficulty: DifficultyAdjustment;
  recommendations: AdaptiveRecommendation[];
  comeback: ComebackMission | null;
  tutorLines: ProactiveTutorLine[];
  parentDashboard: ParentGrowthDashboard;
}

export function entriesMap(entries: SkillGraphEntry[]): Map<string, SkillGraphEntry> {
  return new Map(entries.map((e) => [e.skillId, e]));
}

export function applyActivityToSkillGraph(
  entries: SkillGraphEntry[],
  childId: number,
  activityId: string,
  section: import("./types").SectionKey,
  correct: boolean,
  dateIso: string,
): { entries: SkillGraphEntry[]; skillMastered: boolean } {
  const map = entriesMap(entries);
  const skillIds = activityToSkillIds(activityId, section);
  let skillMastered = false;
  for (const skillId of skillIds) {
    const prev = map.get(skillId) ?? null;
    const next = applySkillAttempt(
      prev ? { ...prev, childId } : null,
      skillId,
      correct,
      dateIso,
    );
    next.childId = childId;
    if (next.progressionStage === "mastered" && prev?.progressionStage !== "mastered") {
      skillMastered = true;
    }
    map.set(skillId, next);
  }
  return { entries: [...map.values()], skillMastered };
}

export function composePhase3Status(input: {
  childId: number;
  childName: string;
  profile: LearningProgressProfile;
  unlocks: UnlockResult;
  hubAccess: HubJourneyAccess;
  isPremium: boolean;
  weeklyReport: WeeklyParentReport;
  skillEntries: SkillGraphEntry[];
  persisted: Phase3Persisted;
  dateIso?: string;
}): Phase3Status {
  const dateIso = input.dateIso ?? formatDateIso();
  const memory =
    input.persisted.learningMemory ??
    buildLearningMemory(input.profile, input.skillEntries, {
      sessionCompletedToday: input.persisted.dailySession?.isComplete,
    });

  const daysInactive = daysSinceActive(input.profile.lastActiveDate, dateIso);
  const session =
    input.persisted.dailySession ??
    buildDailyLearningSession(input.profile, memory, input.unlocks, {
      childId: input.childId,
      dateIso,
      completedStepIds: [],
    });

  const skillMap = entriesMap(input.skillEntries);
  const skillTrees = buildSkillTrees(skillMap);
  const difficulty = difficultyAdjustmentEngine({
    profile: input.profile,
    unlocks: input.unlocks,
    memory,
    streakDays: input.profile.streakDays,
  });
  const recommendations = buildAdaptiveRecommendations({
    profile: input.profile,
    memory,
    unlocks: input.unlocks,
    difficulty,
    isPremium: input.isPremium,
  });
  const comeback = buildComebackMission(daysInactive, session, input.isPremium);
  const tutorLines = buildProactiveTutorLines({
    profile: input.profile,
    memory,
    weeklyReport: input.weeklyReport,
    childName: input.childName,
    daysInactive,
  });
  const parentDashboard = buildParentGrowthDashboard({
    profile: input.profile,
    memory,
    weeklyReport: input.weeklyReport,
    skillEntries: input.skillEntries,
    skillTrees,
    isPremium: input.isPremium,
    dateIso,
  });

  const wallet = walletFromProfile(input.profile, {
    coins: input.persisted.coins,
    stars: input.persisted.stars,
    badges: input.persisted.badges,
  });

  return {
    skillGraph: input.skillEntries,
    memory,
    dailySession: session,
    wallet,
    difficulty,
    recommendations,
    comeback,
    tutorLines,
    parentDashboard,
  };
}

export {
  markSessionStepComplete,
  computeRewardEvents,
  mergeBadges,
  type RewardEvent,
  type RewardWallet,
  type DailyLearningSession,
  type ComebackMission,
  type ProactiveTutorLine,
  type ParentGrowthDashboard,
  type AdaptiveRecommendation,
  type DifficultyAdjustment,
};
