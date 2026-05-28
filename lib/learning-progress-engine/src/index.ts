/**
 * LearningProgressEngine — unified progression layer for AmyNest.
 * Single source of truth for unlocks, mastery, daily freshness, and recommendations.
 * Delegates to existing journey/quota systems; does not replace content catalogs.
 */

export * from "./types";
export * from "./unlocks";
export * from "./mastery";
export * from "./study-zone-progression";
export * from "./daily-freshness";
export * from "./analytics";
export * from "./parent-report";
export * from "./play-categories";
export * from "./worksheets";
export * from "./skill-graph";
export * from "./learning-memory";
export * from "./daily-session";
export * from "./rewards";
export * from "./difficulty-engine";
export * from "./re-engagement";
export * from "./skill-trees";
export * from "./adaptive-routing";
export * from "./ai-tutor-insights";
export * from "./parent-insights";
export * from "./phase3";
export * from "./emotional-copy";
export * from "./living-companion";
export * from "./anti-spam";
export * from "./growth-arc";
export * from "./notifications";
export * from "./feature-flags";
export * from "./behavior-experiments";
export * from "./behavior-optimizer";
export * from "./recommendation-quality";
export * from "./ai-guardrails";
export * from "./family-milestones";
export * from "./platform-health";
export * from "./retention-cohorts";
export * from "./data-lifecycle";
export * from "./learning-simulator";

import {
  computeHubJourneyAccess,
  HUB_CONTENT_QUOTAS,
  isPhonicsSubItemUnlocked,
  phonicsUnlockedSubItems,
  getSectionLifetimeLimit,
  type HubJourneyAccess,
} from "@workspace/parent-hub-journey";
import type {
  LearningProgressProfile,
  GetUnlocksInput,
  UnlockResult,
  AiTutorContext,
  SectionKey,
  SectionProgress,
} from "./types";
import { defaultSectionProgress } from "./types";
import {
  computeMasteryScore,
  computeLearningLevel,
  phaseForMastery,
  curriculumStageForLevel,
  deriveWeakSkills,
  deriveUnlockedSkills,
  xpForActivity,
  streakMultiplier,
  isRevisionDay,
} from "./mastery";
import { getUnlocks, filterAlphabetItems, filterNumberItems } from "./unlocks";
import { buildWeeklyParentReport } from "./parent-report";
import { dailyUnlockSeed } from "./daily-freshness";

export interface LearningProgressEngineInput {
  childId: number;
  age: number;
  journeyDay: number;
  isPremium: boolean;
  hubAccess: HubJourneyAccess;
  profile?: Partial<LearningProgressProfile>;
  dateIso?: string;
}

export interface LearningProgressStatus {
  profile: LearningProgressProfile;
  unlocks: UnlockResult;
  hubAccess: HubJourneyAccess;
  quotas: typeof HUB_CONTENT_QUOTAS;
  aiTutorContext: AiTutorContext;
  isPremium: boolean;
}

/** Build a full profile from partial DB row + live journey state. */
export function buildLearningProfile(
  childId: number,
  partial: Partial<LearningProgressProfile> & { journeyDay?: number },
  age: number,
): LearningProgressProfile {
  const sectionProgress = {
    ...defaultSectionProgress(),
    ...(partial.sectionProgress ?? {}),
  };
  const completedActivities = partial.completedActivities ?? [];
  const streakDays = partial.streakDays ?? 0;
  const masteryScore =
    partial.masteryScore ??
    computeMasteryScore(sectionProgress, completedActivities, streakDays);
  const totalXP = partial.totalXP ?? 0;
  const learningLevel =
    partial.learningLevel ?? computeLearningLevel(masteryScore, totalXP);

  return {
    childId,
    journeyDay: partial.journeyDay ?? 1,
    learningLevel,
    masteryScore,
    streakDays,
    totalXP,
    completedActivities,
    unlockedSkills:
      partial.unlockedSkills ?? deriveUnlockedSkills({ masteryScore, learningLevel, sectionProgress }),
    weakSkills: partial.weakSkills ?? deriveWeakSkills(sectionProgress),
    preferredLearningModes: partial.preferredLearningModes ?? ["play", "visual"],
    lastActiveDate: partial.lastActiveDate ?? null,
    currentPhase: partial.currentPhase ?? phaseForMastery(masteryScore),
    currentCurriculumStage:
      partial.currentCurriculumStage ?? curriculumStageForLevel(learningLevel, age),
    dailyUnlockSeed:
      partial.dailyUnlockSeed ??
      dailyUnlockSeed(
        new Date().toISOString().slice(0, 10),
        childId,
      ),
    nextRecommendedSkills:
      partial.nextRecommendedSkills ?? deriveWeakSkills(sectionProgress).slice(0, 3),
    sectionProgress,
  };
}

/**
 * Main engine entry — aggregates journey access, profile, unlocks, AI context.
 */
export function computeLearningProgressStatus(
  input: LearningProgressEngineInput,
): LearningProgressStatus {
  const profile = buildLearningProfile(input.childId, {
    ...input.profile,
    journeyDay: input.journeyDay,
  }, input.age);

  const unlockInput: GetUnlocksInput = {
    age: input.age,
    journeyDay: input.journeyDay,
    masteryScore: profile.masteryScore,
    streakDays: profile.streakDays,
    completedActivities: profile.completedActivities,
    sectionProgress: profile.sectionProgress,
    isPremium: input.isPremium,
    dateIso: input.dateIso,
    childId: input.childId,
  };

  const unlocks = getUnlocks(unlockInput);

  const aiTutorContext: AiTutorContext = {
    weakSkills: profile.weakSkills,
    recentMistakes: profile.weakSkills,
    learningLevel: profile.learningLevel,
    unlockedSkills: profile.unlockedSkills,
    age: input.age,
    masteryScore: profile.masteryScore,
    currentPhase: profile.currentPhase,
    journeyDay: input.journeyDay,
  };

  return {
    profile,
    unlocks,
    hubAccess: input.hubAccess,
    quotas: HUB_CONTENT_QUOTAS,
    aiTutorContext,
    isPremium: input.isPremium,
  };
}

/** Record activity completion and return updated profile fields (caller persists). */
export function recordActivityCompletion(
  profile: LearningProgressProfile,
  activityId: string,
  section: SectionKey,
  correct: boolean,
  dateIso?: string,
): Partial<LearningProgressProfile> {
  const today = dateIso ?? new Date().toISOString().slice(0, 10);
  const completed = profile.completedActivities.includes(activityId)
    ? profile.completedActivities
    : [...profile.completedActivities, activityId].slice(-200);

  const sec = profile.sectionProgress[section] ?? {
    level: 1,
    masteryPct: 0,
    activitiesCompleted: 0,
    lastActivityId: null,
  };
  const nextActivities = sec.activitiesCompleted + 1;
  const masteryBump = correct ? 4 : 1;
  const nextMastery = Math.min(100, sec.masteryPct + masteryBump);
  const levelUp = nextMastery >= 80 && sec.level < 10 ? sec.level + 1 : sec.level;

  const sectionProgress = {
    ...profile.sectionProgress,
    [section]: {
      level: levelUp,
      masteryPct: nextMastery,
      activitiesCompleted: nextActivities,
      lastActivityId: activityId,
    } satisfies SectionProgress,
  };

  const xpGain = Math.round(xpForActivity(activityId, correct) * streakMultiplier(profile.streakDays));
  const totalXP = profile.totalXP + xpGain;
  const lastActive = today;
  const streakDays =
    profile.lastActiveDate === today
      ? profile.streakDays
      : profile.lastActiveDate &&
          new Date(today).getTime() - new Date(profile.lastActiveDate).getTime() <= 86400000 * 2
        ? profile.streakDays + 1
        : 1;

  const masteryScore = computeMasteryScore(sectionProgress, completed, streakDays);
  const learningLevel = computeLearningLevel(masteryScore, totalXP);

  return {
    completedActivities: completed,
    sectionProgress,
    totalXP,
    streakDays,
    lastActiveDate: lastActive,
    masteryScore,
    learningLevel,
    currentPhase: phaseForMastery(masteryScore),
    unlockedSkills: deriveUnlockedSkills({ masteryScore, learningLevel, sectionProgress }),
    weakSkills: deriveWeakSkills(sectionProgress),
  };
}

export {
  computeHubJourneyAccess,
  HUB_CONTENT_QUOTAS,
  isPhonicsSubItemUnlocked,
  phonicsUnlockedSubItems,
  getSectionLifetimeLimit,
  getUnlocks,
  filterAlphabetItems,
  filterNumberItems,
  buildWeeklyParentReport,
  isRevisionDay,
};
