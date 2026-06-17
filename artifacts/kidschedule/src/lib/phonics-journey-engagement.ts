import type { PhonicsInsight } from "@/hooks/use-phonics-data";
import type { DisplayPhonicsItem, PhonicsProgressMap } from "@/hooks/use-phonics-data";
import type { CurriculumLevel } from "@workspace/phonics-curriculum";
import {
  PHONICS_JOURNEY_STAGES,
  SESSIONS_PER_STAGE_EXPORT,
  parentStageStatus,
  type PhonicsJourneyStage,
  type PhonicsPrimaryCta,
} from "./phonics-journey-roadmap";

export const READING_POINTS = {
  practice: 5,
  masterWord: 10,
  quickCheck: 10,
  mission: 25,
} as const;

export type NextBestAction = {
  question: string;
  action: string;
  detail: string;
  scrollTarget: string;
};

export type WeeklyMomentum = {
  practiceDays: number;
  wordsReviewed: number;
  wordsMastered: number;
  accuracyPct: number;
};

export type StreakMotivation = {
  label: string;
  nextReward: string;
  daysToBadge: number;
};

export type CelebrationBanner = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  earned: boolean;
};

export function resolveHeroEncouragement(params: {
  childName: string;
  journeyCompletionPct: number;
  streak: number;
  sessionsUntilMilestone: number;
  activeStage: PhonicsJourneyStage;
  nextStage: PhonicsJourneyStage | null;
  missionComplete: boolean;
  masteryScore: number;
}): string {
  const {
    childName,
    journeyCompletionPct,
    streak,
    sessionsUntilMilestone,
    activeStage,
    nextStage,
    missionComplete,
    masteryScore,
  } = params;

  if (missionComplete && streak >= 1) {
    return `${childName} finished today's mission — great consistency!`;
  }
  if (streak >= 3) {
    return `${streak} days in a row — keep the reading streak going!`;
  }
  if (nextStage?.id === "story_reading" && sessionsUntilMilestone <= 8) {
    return "Almost ready for Story Reading — you're so close!";
  }
  if (sessionsUntilMilestone <= 5 && sessionsUntilMilestone > 0) {
    return `Only ${sessionsUntilMilestone} session${sessionsUntilMilestone !== 1 ? "s" : ""} until the next milestone.`;
  }
  if (journeyCompletionPct >= 60) {
    return "You're making great progress on the reading journey.";
  }
  if (masteryScore >= 70) {
    return `${activeStage.milestoneName} skills are really taking shape.`;
  }
  if (streak === 1) {
    return "Day one of a new streak — nice start today!";
  }
  return `${childName} is building strong reading foundations — one step at a time.`;
}

export function sessionsUntilNextMilestone(masteryScore: number): number {
  const remaining = Math.max(0, (100 - masteryScore) / 100);
  return Math.max(1, Math.ceil(remaining * SESSIONS_PER_STAGE_EXPORT));
}

export function resolveNextBestAction(params: {
  missionStarted: boolean;
  missionComplete: boolean;
  dailyQuizComplete: boolean;
  hasReviewItems: boolean;
  primaryCta: PhonicsPrimaryCta;
}): NextBestAction {
  const { missionComplete, dailyQuizComplete, hasReviewItems, primaryCta, missionStarted } =
    params;

  if (dailyQuizComplete) {
    if (hasReviewItems) {
      return {
        question: "What should I do next?",
        action: "Review missed words",
        detail: "A quick replay locks in today's learning.",
        scrollTarget: "phonics-practice-sounds",
      };
    }
    return {
      question: "What should I do next?",
      action: "View today's progress",
      detail: "See what improved and what's coming next.",
      scrollTarget: "phonics-progress",
    };
  }
  if (missionComplete) {
    return {
      question: "What should I do next?",
      action: "Start Quick Check",
      detail: "Takes less than 2 minutes — proof of today's learning.",
      scrollTarget: "phonics-daily-quiz",
    };
  }
  if (missionStarted) {
    return {
      question: "What should I do next?",
      action: primaryCta.label,
      detail: "Pick up where you left off in today's mission.",
      scrollTarget: primaryCta.scrollTarget,
    };
  }
  return {
    question: "What should I do next?",
    action: "Start today's mission",
    detail: "About 5 minutes — AmyNest will guide each step.",
    scrollTarget: "phonics-today-mission",
  };
}

export function computeWeeklyMomentum(
  progress: PhonicsProgressMap,
  streak: number,
): WeeklyMomentum {
  const practicedIds = Object.keys(progress.practiced);
  const masteredIds = Object.keys(progress.mastered);
  const wordsReviewed = Object.values(progress.practiced).reduce((a, b) => a + b, 0);
  const accuracyPct =
    practicedIds.length > 0
      ? Math.round(
          (practicedIds.filter((id) => progress.mastered[id]).length /
            practicedIds.length) *
            100,
        )
      : 0;

  return {
    practiceDays: Math.min(7, Math.max(streak, practicedIds.length > 0 ? 1 : 0)),
    wordsReviewed,
    wordsMastered: masteredIds.length,
    accuracyPct,
  };
}

export function resolveStreakMotivation(streak: number): StreakMotivation {
  const badgeAt = streak < 3 ? 3 : streak < 7 ? 7 : streak < 14 ? 14 : 30;
  const daysToBadge = Math.max(0, badgeAt - streak);

  return {
    label: streak > 0 ? `${streak} Day Reading Streak` : "Start your reading streak",
    nextReward:
      daysToBadge === 0
        ? "Reading Badge earned — keep going!"
        : `${daysToBadge} more day${daysToBadge !== 1 ? "s" : ""} for Reading Badge`,
    daysToBadge,
  };
}

export function buildParentInsight(params: {
  childName: string;
  weakPhonemes: string[];
  insights: PhonicsInsight[] | null;
  momentum: WeeklyMomentum;
  activeStage: PhonicsJourneyStage;
  lastTestScore: number | null;
}): string {
  const { childName, weakPhonemes, insights, momentum, activeStage, lastTestScore } = params;

  const apiInsight = insights?.find((i) => i.tone === "good" || i.tone === "info");
  if (apiInsight?.text) {
    const sentence = apiInsight.text.split(/[.!]/)[0]?.trim();
    if (sentence && sentence.length < 120) return `${sentence}.`;
  }

  if (weakPhonemes.length > 0) {
    const focus = weakPhonemes.slice(0, 2).join(" and ");
    return `${childName} is consistently working on ${focus} sounds — extra practice helps them stick.`;
  }

  if (lastTestScore != null && lastTestScore >= 80) {
    return `Quick Check score was ${lastTestScore}% — reading accuracy is looking strong.`;
  }

  if (momentum.wordsMastered >= 5 && momentum.accuracyPct >= 70) {
    return `Reading accuracy is at ${momentum.accuracyPct}% with ${momentum.wordsMastered} words mastered.`;
  }

  if (activeStage.id === "blending") {
    return "Blending skills are developing — connecting sounds into words is the key breakthrough.";
  }

  return `${childName} is progressing through ${activeStage.milestoneName} — steady practice builds confident readers.`;
}

export function buildCelebrationBanners(params: {
  masteredCount: number;
  activeStage: PhonicsJourneyStage;
  curriculumLevel: CurriculumLevel | null | undefined;
  masteryScore: number;
  totalAgeMonths: number;
  hasTestHistory?: boolean;
  streak?: number;
  practicedCount?: number;
}): CelebrationBanner[] {
  const {
    masteredCount,
    curriculumLevel,
    masteryScore,
    totalAgeMonths,
    hasTestHistory,
    streak,
    practicedCount,
  } = params;
  const banners: CelebrationBanner[] = [];

  if (masteredCount >= 100) {
    banners.push({
      id: "words_100",
      emoji: "🎉",
      title: "100 Words Mastered",
      subtitle: "A major reading milestone — celebrate together!",
      earned: true,
    });
  } else if (masteredCount >= 50) {
    banners.push({
      id: "words_50",
      emoji: "🎉",
      title: "50 Words Mastered",
      subtitle: "Halfway to a hundred — momentum is building.",
      earned: true,
    });
  }

  if (curriculumLevel != null && curriculumLevel >= 2 && masteryScore >= 50) {
    banners.push({
      id: "first_milestone",
      emoji: "🏆",
      title: "First Reading Milestone",
      subtitle: "Your child is reading real words independently.",
      earned: masteryScore >= 85,
    });
  }

  const stageCelebrations: Partial<
    Record<string, { emoji: string; title: string; subtitle: string }>
  > = {
    blending: {
      emoji: "🧩",
      title: "Word Builder Completed",
      subtitle: "Simple words unlocked — keep blending!",
    },
    reading_words: {
      emoji: "📖",
      title: "Reader Milestone",
      subtitle: "Short sentences are within reach.",
    },
    fluency: {
      emoji: "🚀",
      title: "Fluency Completed",
      subtitle: "Reading with confidence and expression.",
    },
    story_reading: {
      emoji: "🏆",
      title: "Story Reading Unlocked",
      subtitle: "Independent story reading is here.",
    },
  };

  for (const stage of PHONICS_JOURNEY_STAGES) {
    const mastered = parentStageStatus(stage, {
      curriculumLevel,
      masteryScore,
      totalAgeMonths,
      hasTestHistory,
      streak,
      practicedCount,
    });
    if (mastered !== "mastered") continue;
    const def = stageCelebrations[stage.id];
    if (def) {
      banners.push({
        id: `stage_${stage.id}`,
        emoji: def.emoji,
        title: def.title,
        subtitle: def.subtitle,
        earned: true,
      });
    }
  }

  return banners.slice(0, 4);
}

export function resolveNextUnlock(nextStage: PhonicsJourneyStage | null): {
  emoji: string;
  title: string;
  outcome: string;
} | null {
  if (!nextStage) return null;
  return {
    emoji: nextStage.emoji,
    title: nextStage.milestoneName,
    outcome: nextStage.outcomeLabel,
  };
}

export function hasReviewItems(
  progress: PhonicsProgressMap,
  items: DisplayPhonicsItem[],
): boolean {
  return items.some(
    (i) => (progress.practiced[i.id] ?? 0) >= 3 && !progress.mastered[i.id],
  );
}

export function computeTotalReadingPoints(params: {
  practicedCount: number;
  masteredCount: number;
  missionComplete: boolean;
  quizComplete: boolean;
}): number {
  let total = params.practicedCount * READING_POINTS.practice;
  total += params.masteredCount * READING_POINTS.masterWord;
  if (params.missionComplete) total += READING_POINTS.mission;
  if (params.quizComplete) total += READING_POINTS.quickCheck;
  return total;
}

export function missionCompleteEmptyActions(): { label: string; scrollTarget: string }[] {
  return [
    { label: "Review mastered words", scrollTarget: "phonics-practice-sounds" },
    { label: "Practice favorite sounds", scrollTarget: "phonics-practice-sounds" },
    { label: "View progress", scrollTarget: "phonics-progress" },
  ];
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function scrollToJourneySection(id: string) {
  scrollToSection(id);
}
