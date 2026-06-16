import type { CurriculumLevel } from "@workspace/phonics-curriculum";
import type { DisplayPhonicsItem, PhonicsProgressMap } from "@/hooks/use-phonics-data";

/** Parent-facing reading journey — six milestones from sound awareness to stories. */
export type PhonicsJourneyStageId =
  | "sound_awareness"
  | "basic_phonics"
  | "blending"
  | "reading_words"
  | "fluency"
  | "story_reading";

export interface PhonicsJourneyStage {
  id: PhonicsJourneyStageId;
  order: number;
  /** Milestone title shown on the journey map */
  milestoneName: string;
  emoji: string;
  /** Plain outcome parents understand — no curriculum jargon */
  outcomeLabel: string;
  /** Maps to curriculum engine level(s) that power this stage. */
  curriculumLevels: CurriculumLevel[];
  parentWhy: string;
  skillsDeveloped: string[];
  nextMilestone: string;
}

export const PHONICS_JOURNEY_STAGES: PhonicsJourneyStage[] = [
  {
    id: "sound_awareness",
    order: 1,
    milestoneName: "Sound Explorer",
    emoji: "🌱",
    outcomeLabel: "Hears and copies familiar sounds",
    curriculumLevels: [1],
    parentWhy:
      "Before letters, children learn to hear rhymes, rhythm, and everyday sounds. This builds the listening foundation every reader needs.",
    skillsDeveloped: ["Listening", "Rhyme play", "Sound copying"],
    nextMilestone: "Connect sounds to letter shapes",
  },
  {
    id: "basic_phonics",
    order: 2,
    milestoneName: "Letter Detective",
    emoji: "🔤",
    outcomeLabel: "Knows what each letter sounds like",
    curriculumLevels: [1],
    parentWhy:
      "When children link letters to sounds, they can decode new words instead of memorising every word by sight.",
    skillsDeveloped: ["Letter sounds", "Picture clues", "Sound–letter links"],
    nextMilestone: "Blend sounds into first words",
  },
  {
    id: "blending",
    order: 3,
    milestoneName: "Word Builder",
    emoji: "🧩",
    outcomeLabel: "Reads simple words independently",
    curriculumLevels: [2],
    parentWhy:
      "Blending c-a-t into \"cat\" is the breakthrough — your child starts reading on their own for the first time.",
    skillsDeveloped: ["Sound blending", "First words", "Decoding"],
    nextMilestone: "Read more words with confidence",
  },
  {
    id: "reading_words",
    order: 4,
    milestoneName: "Reader",
    emoji: "📖",
    outcomeLabel: "Reads short sentences",
    curriculumLevels: [3, 4],
    parentWhy:
      "A growing word bank means your child can tackle new books without stopping on every word.",
    skillsDeveloped: ["Word reading", "Short sentences", "Reading stamina"],
    nextMilestone: "Read smoothly and with expression",
  },
  {
    id: "fluency",
    order: 5,
    milestoneName: "Fluent Reader",
    emoji: "🚀",
    outcomeLabel: "Reads confidently",
    curriculumLevels: [5, 6],
    parentWhy:
      "Fluent readers spend less energy on each word and more on understanding the story.",
    skillsDeveloped: ["Smooth reading", "Expression", "Speed with accuracy"],
    nextMilestone: "Enjoy short stories cover to cover",
  },
  {
    id: "story_reading",
    order: 6,
    milestoneName: "Story Master",
    emoji: "🏆",
    outcomeLabel: "Reads stories independently",
    curriculumLevels: [7],
    parentWhy:
      "Story reading is the payoff — phonics working in real books your child can pick up on their own.",
    skillsDeveloped: ["Story fluency", "Comprehension", "Independent reading"],
    nextMilestone: "Move into chapter books",
  },
];

export const MISSION_READING_POINTS = 25;

export type PhonicsPrimaryCtaState =
  | "start_mission"
  | "continue_learning"
  | "take_daily_quiz"
  | "view_progress";

export type PhonicsPrimaryCta = {
  state: PhonicsPrimaryCtaState;
  label: string;
  scrollTarget: string;
};

export type GuidedMissionGoal = {
  id: string;
  emoji: string;
  label: string;
  done: boolean;
};

export type PhonicsAchievement = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
};

/** ~8 sessions to reach 85% mastery within a stage (curriculum pacing). */
export const SESSIONS_PER_STAGE_EXPORT = 8;
const SESSIONS_PER_STAGE = SESSIONS_PER_STAGE_EXPORT;

export function journeyStageForCurriculumLevel(
  level: CurriculumLevel,
  totalAgeMonths?: number,
): PhonicsJourneyStage {
  if (level === 1 && totalAgeMonths != null && totalAgeMonths >= 24) {
    return PHONICS_JOURNEY_STAGES.find((s) => s.id === "basic_phonics") ?? PHONICS_JOURNEY_STAGES[1]!;
  }
  const match =
    PHONICS_JOURNEY_STAGES.find((s) => s.curriculumLevels.includes(level)) ??
    PHONICS_JOURNEY_STAGES[0]!;
  return match;
}

export function journeyStageForAgeMonths(totalMonths: number): PhonicsJourneyStage {
  if (totalMonths < 24) return PHONICS_JOURNEY_STAGES[0]!;
  if (totalMonths < 36) return PHONICS_JOURNEY_STAGES[1]!;
  if (totalMonths < 48) return PHONICS_JOURNEY_STAGES[2]!;
  if (totalMonths < 60) return PHONICS_JOURNEY_STAGES[3]!;
  return PHONICS_JOURNEY_STAGES[4]!;
}

export function resolveActiveJourneyStage(
  curriculumLevel: CurriculumLevel | null | undefined,
  totalAgeMonths: number,
): PhonicsJourneyStage {
  if (curriculumLevel != null) {
    return journeyStageForCurriculumLevel(curriculumLevel, totalAgeMonths);
  }
  return journeyStageForAgeMonths(totalAgeMonths);
}

export function computeJourneyCompletionPct(
  curriculumLevel: CurriculumLevel | null | undefined,
  masteryScore: number,
  progress?: PhonicsProgressMap,
  itemCount?: number,
): number {
  if (curriculumLevel != null) {
    const completedStages = Math.max(0, curriculumLevel - 1);
    const withinStage = Math.min(100, Math.max(0, masteryScore)) / 100;
    return Math.round(Math.min(100, ((completedStages + withinStage) / 7) * 100));
  }
  if (progress && itemCount && itemCount > 0) {
    const mastered = Object.keys(progress.mastered).length;
    return Math.round(Math.min(100, (mastered / itemCount) * 100));
  }
  return 0;
}

export function stageStatus(
  stage: PhonicsJourneyStage,
  activeStage: PhonicsJourneyStage,
): "completed" | "current" | "locked" {
  if (stage.order < activeStage.order) return "completed";
  if (stage.order === activeStage.order) return "current";
  return "locked";
}

export function nextJourneyStage(active: PhonicsJourneyStage): PhonicsJourneyStage | null {
  return PHONICS_JOURNEY_STAGES.find((s) => s.order === active.order + 1) ?? null;
}

export function readingAgeBand(totalAgeMonths: number): string {
  if (totalAgeMonths < 24) return "1–2 Years";
  if (totalAgeMonths < 36) return "2–3 Years";
  if (totalAgeMonths < 48) return "3–4 Years";
  if (totalAgeMonths < 60) return "4–5 Years";
  return "5–6 Years";
}

export function readingConfidence(
  journeyCompletionPct: number,
  masteryScore: number,
): "Developing" | "Growing" | "Confident" {
  if (journeyCompletionPct >= 75 || masteryScore >= 85) return "Confident";
  if (journeyCompletionPct >= 35 || masteryScore >= 45) return "Growing";
  return "Developing";
}

/** ETA copy for hero — uses curriculum pacing estimates. */
export function estimateJourneyEta(
  activeStage: PhonicsJourneyStage,
  masteryScore: number,
  curriculumLevel: CurriculumLevel | null | undefined,
): string {
  const finalStage = PHONICS_JOURNEY_STAGES[PHONICS_JOURNEY_STAGES.length - 1]!;
  const stagesLeft = Math.max(0, finalStage.order - activeStage.order);
  const withinStageRemaining = Math.max(0, (100 - masteryScore) / 100);

  if (activeStage.order === finalStage.order && masteryScore >= 85) {
    return "Journey complete — keep reading stories!";
  }

  if (stagesLeft >= 2) {
    const weekEstimate = Math.max(
      1,
      Math.ceil(stagesLeft * 1.5 + withinStageRemaining * 1.2),
    );
    return `Approx. ${weekEstimate} week${weekEstimate !== 1 ? "s" : ""} until ${finalStage.milestoneName}`;
  }

  const sessions = Math.max(
    1,
    Math.ceil(withinStageRemaining * SESSIONS_PER_STAGE),
  );
  const next = nextJourneyStage(activeStage);
  if (next && sessions <= 3) {
    return `Next milestone: ${next.milestoneName} soon`;
  }
  return `Next milestone in ${sessions} session${sessions !== 1 ? "s" : ""}`;
}

export function buildGuidedMissionGoals(
  plan: {
    practice: { id: string; kind: string; label: string; completed: boolean }[];
    revision: { id: string; kind: string; label: string; completed: boolean }[];
    test: { id: string; kind: string; label: string; completed: boolean };
  } | null,
  progress: PhonicsProgressMap,
  practiceItems: DisplayPhonicsItem[],
): GuidedMissionGoal[] {
  if (plan) {
    const soundActivities = [...plan.practice, ...plan.revision].filter((a) =>
      ["letter_sound", "revision_phoneme"].includes(a.kind),
    );
    const wordActivities = [...plan.practice, ...plan.revision].filter((a) =>
      ["blend_word", "read_word", "digraph", "blend_cluster", "sentence"].includes(a.kind),
    );
    const soundTarget = Math.max(soundActivities.length, 3);
    const wordTarget = Math.max(wordActivities.length, 2);
    const soundsDone = soundActivities.filter((a) => a.completed).length;
    const wordsDone = wordActivities.filter((a) => a.completed).length;

    return [
      {
        id: "sounds",
        emoji: "🎯",
        label: `Learn ${soundTarget} sound${soundTarget !== 1 ? "s" : ""}`,
        done: soundsDone >= soundTarget,
      },
      {
        id: "words",
        emoji: "📖",
        label: `Read ${wordTarget} word${wordTarget !== 1 ? "s" : ""}`,
        done: wordsDone >= wordTarget,
      },
      {
        id: "quiz",
        emoji: "📝",
        label: "Complete quick check",
        done: plan.test.completed,
      },
    ];
  }

  const playedToday = Object.keys(progress.practiced).length;
  return [
    {
      id: "sounds",
      emoji: "🎯",
      label: "Learn 3 sounds",
      done: playedToday >= 3,
    },
    {
      id: "words",
      emoji: "📖",
      label: `Read ${Math.min(5, Math.max(2, practiceItems.filter((i) => i.type === "word").length || 2))} words`,
      done: playedToday >= 5,
    },
    {
      id: "quiz",
      emoji: "📝",
      label: "Complete quick check",
      done: false,
    },
  ];
}

export function isMissionComplete(goals: GuidedMissionGoal[]): boolean {
  return goals.length > 0 && goals.every((g) => g.done);
}

export function isMissionStarted(
  goals: GuidedMissionGoal[],
  practicedCount: number,
): boolean {
  return goals.some((g) => g.done) || practicedCount > 0;
}

export function resolvePrimaryCta(params: {
  missionStarted: boolean;
  missionComplete: boolean;
  dailyQuizComplete: boolean;
  hasReviewItems?: boolean;
}): PhonicsPrimaryCta {
  const { missionStarted, missionComplete, dailyQuizComplete, hasReviewItems = false } = params;

  if (dailyQuizComplete) {
    if (hasReviewItems) {
      return {
        state: "view_progress",
        label: "Review Missed Words",
        scrollTarget: "phonics-practice-sounds",
      };
    }
    return {
      state: "view_progress",
      label: "View Today's Progress",
      scrollTarget: "phonics-progress",
    };
  }
  if (missionComplete) {
    return {
      state: "take_daily_quiz",
      label: "Start Quick Check",
      scrollTarget: "phonics-daily-quiz",
    };
  }
  if (missionStarted) {
    return {
      state: "continue_learning",
      label: "Continue Learning",
      scrollTarget: "phonics-practice-sounds",
    };
  }
  return {
    state: "start_mission",
    label: "Start Today's Mission",
    scrollTarget: "phonics-today-mission",
  };
}

export function detectAchievements(
  masteredCount: number,
  activeStage: PhonicsJourneyStage,
  curriculumLevel: CurriculumLevel | null | undefined,
  masteryScore: number,
): PhonicsAchievement[] {
  const achievements: PhonicsAchievement[] = [];

  if (masteredCount >= 100) {
    achievements.push({
      id: "words_100",
      emoji: "💯",
      title: "100 words mastered",
      subtitle: "A huge reading milestone!",
    });
  } else if (masteredCount >= 50) {
    achievements.push({
      id: "words_50",
      emoji: "⭐",
      title: "50 words mastered",
      subtitle: "Your reader is on a roll",
    });
  }

  const stageAchievements: Partial<
    Record<PhonicsJourneyStageId, { title: string; subtitle: string; emoji: string }>
  > = {
    blending: {
      emoji: "🧩",
      title: "Word Builder unlocked",
      subtitle: "Reads simple words independently",
    },
    reading_words: {
      emoji: "📖",
      title: "Reader milestone",
      subtitle: "Reads short sentences",
    },
    fluency: {
      emoji: "🚀",
      title: "Fluent Reader",
      subtitle: "Reads with confidence",
    },
    story_reading: {
      emoji: "🏆",
      title: "Story Master",
      subtitle: "Reads stories independently",
    },
  };

  if (curriculumLevel != null && masteryScore >= 85) {
    for (const stage of PHONICS_JOURNEY_STAGES) {
      if (stage.order >= activeStage.order) break;
      const def = stageAchievements[stage.id];
      if (def) {
        achievements.push({
          id: `stage_${stage.id}`,
          emoji: def.emoji,
          title: def.title,
          subtitle: def.subtitle,
        });
      }
    }
  }

  return achievements.slice(0, 3);
}
