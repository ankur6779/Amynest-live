import type { AgeBand, SmartStudyDifficulty } from "./types.js";

export const AGE_BANDS: AgeBand[] = ["2-4", "4-6", "6-8", "8-10", "10-12"];

export const SMART_STUDY_SUBJECTS = [
  "Numbers",
  "Counting",
  "Addition",
  "Subtraction",
  "Multiplication",
  "Division",
  "Patterns",
  "Shapes",
  "Colors",
  "Measurement",
  "Time",
  "Money",
  "Logic",
  "Memory",
  "Observation",
  "Science Basics",
  "Geography Basics",
  "Language",
  "Vocabulary",
  "Reading",
] as const;

export const LIFE_SKILL_TOPICS = [
  "Respect",
  "Sharing",
  "Kindness",
  "Gratitude",
  "Responsibility",
  "Safety",
  "Stranger Awareness",
  "Internet Safety",
  "Emotional Intelligence",
  "Self Confidence",
  "Communication",
  "Teamwork",
  "Leadership",
  "Decision Making",
  "Conflict Resolution",
  "Daily Habits",
  "Hygiene",
  "Time Management",
  "Empathy",
  "Growth Mindset",
] as const;

export const EVENT_PREP_TYPES = [
  "Speech",
  "Anchoring",
  "Presentation",
  "Fancy Dress",
  "Show And Tell",
  "Debate",
  "Storytelling",
  "Quiz Host",
  "School Assembly",
  "Cultural Program",
] as const;

export const MATH_STAGES: { stage: string; packCount: number }[] = [
  { stage: "Numbers 1-20", packCount: 7 },
  { stage: "Numbers 21-50", packCount: 6 },
  { stage: "Numbers 51-100", packCount: 6 },
  { stage: "Count by 2", packCount: 5 },
  { stage: "Count by 5", packCount: 5 },
  { stage: "Count by 10", packCount: 5 },
  { stage: "Patterns", packCount: 6 },
  { stage: "Addition", packCount: 8 },
  { stage: "Subtraction", packCount: 8 },
  { stage: "Multiplication", packCount: 8 },
  { stage: "Division", packCount: 6 },
  { stage: "Fractions", packCount: 6 },
  { stage: "Mental Math", packCount: 7 },
  { stage: "Memory Math", packCount: 5 },
  { stage: "Logic Math", packCount: 5 },
  { stage: "Word Problems", packCount: 7 },
];

export const DIFFICULTIES: SmartStudyDifficulty[] = [
  "starter",
  "easy",
  "medium",
  "challenging",
  "advanced",
];

export function difficultyForLessonIndex(index: number): SmartStudyDifficulty {
  return DIFFICULTIES[Math.min(index, DIFFICULTIES.length - 1)]!;
}

export function learningLevelFor(
  ageBand: AgeBand,
  lessonIndex: number,
): number {
  const ageOffset: Record<AgeBand, number> = {
    "2-4": 1,
    "4-6": 2,
    "6-8": 3,
    "8-10": 4,
    "10-12": 5,
  };
  return Math.min(10, ageOffset[ageBand] + lessonIndex);
}

export function ageBandForLifeSkillTopic(
  topicIndex: number,
  slot: number,
): AgeBand {
  const bands = AGE_BANDS;
  return bands[(topicIndex + slot) % bands.length]!;
}

export function maxNumberForAge(ageBand: AgeBand): number {
  switch (ageBand) {
    case "2-4":
      return 10;
    case "4-6":
      return 20;
    case "6-8":
      return 50;
    case "8-10":
      return 100;
    case "10-12":
      return 200;
    default:
      return 20;
  }
}
