import type { NotificationGoal } from "./types.js";

export interface LearningOutcomeCopy {
  title: string;
  body: string;
  deepLink: string;
  goal: NotificationGoal;
  recommendationKey: string;
}

export interface LearningSignals {
  childName: string;
  lessonsCompletedTotal: number;
  lessonsCompleted7d: number;
  weakSubjects: string[];
  strongSubjects: string[];
  unfinishedLessonCount: number;
  currentLevel?: number;
}

const SUBJECT_LABELS: Record<string, string> = {
  math: "math",
  english: "reading",
  gk: "general knowledge",
  science: "science",
};

/**
 * Generate learning outcome notifications from actual progress data.
 */
export function buildLearningOutcomeCopy(s: LearningSignals): LearningOutcomeCopy | null {
  if (s.unfinishedLessonCount > 0) {
    const subject = s.weakSubjects[0] ?? "english";
    const label = SUBJECT_LABELS[subject] ?? subject;
    return {
      goal: "GOAL_LEARNING_COMPLETION",
      title: `Almost there — ${label} lesson 📚`,
      body: `${s.childName} has an unfinished ${label} lesson. One more session closes the loop.`,
      deepLink: "/study-zone",
      recommendationKey: `learning:unfinished:${subject}`,
    };
  }

  if (s.weakSubjects.length > 0) {
    const weak = s.weakSubjects[0]!;
    const label = SUBJECT_LABELS[weak] ?? weak;
    return {
      goal: "GOAL_LEARNING_COMPLETION",
      title: `Boost ${label} today 🎯`,
      body: `${s.childName}'s ${label} could use a quick 10-minute practice — we picked the right level.`,
      deepLink: "/study-zone",
      recommendationKey: `learning:weak:${weak}`,
    };
  }

  if (s.strongSubjects.length >= 1 && s.lessonsCompleted7d >= 2) {
    const strong = s.strongSubjects[0]!;
    const label = SUBJECT_LABELS[strong] ?? strong;
    return {
      goal: "GOAL_LEARNING_COMPLETION",
      title: `${s.childName} is on a roll in ${label} ⭐`,
      body: `Strong ${label} week — one bonus challenge keeps the momentum going.`,
      deepLink: "/study-zone",
      recommendationKey: `learning:strong:${strong}`,
    };
  }

  if (s.lessonsCompleted7d === 0 && s.lessonsCompletedTotal > 0) {
    return {
      goal: "GOAL_LEARNING_COMPLETION",
      title: "Reading goal waiting 📖",
      body: `${s.childName} is only one lesson away from this week's learning goal.`,
      deepLink: "/study-zone",
      recommendationKey: "learning:weekly_goal",
    };
  }

  if (s.lessonsCompletedTotal === 0) {
    return {
      goal: "GOAL_LEARNING_COMPLETION",
      title: "First lesson adventure 🚀",
      body: `A 5-minute ${SUBJECT_LABELS.english} activity is perfect for ${s.childName} today.`,
      deepLink: "/study-zone",
      recommendationKey: "learning:first_lesson",
    };
  }

  return null;
}
