/**
 * Evergreen content library — 1000+ ideas generated from live feature discovery.
 * Ideas scale with the product; never a frozen static catalog.
 */

import { buildMasterKnowledgeBase, type KnowledgeSnapshot } from "../knowledge/engine.js";
import type {
  StudioCategory,
  StudioDifficulty,
  StudioEmotion,
  StudioTopicIdea,
} from "../types.js";

const ALL_CATEGORIES: StudioCategory[] = [
  "Learning",
  "Speech",
  "Health",
  "Routine",
  "Games",
  "Astro",
  "Amy Coach",
  "Audio Lessons",
  "Nutrition",
  "Parent Tips",
  "Brain Development",
  "Emotional Intelligence",
  "Reading",
  "Writing",
  "Math",
  "Science",
  "Memory",
  "Focus",
  "Motor Skills",
  "Creativity",
  "Weekend Activities",
  "Family Time",
  "School Preparation",
  "Premium",
  "Feature Updates",
  "Milestones",
  "Daily Parenting Tips",
];

const ANGLES = [
  "Most parents don't know",
  "Before your child turns 6",
  "This one habit changes everything",
  "A 2-minute daily ritual",
  "The calm way to build",
  "What happy learners practice",
  "A small switch with big results",
  "Why play beats pressure",
  "The gentle parent move",
  "Tonight's 90-second win",
  "How AmyNest makes it easy",
  "Turn screen time into skill time",
] as const;

const EMOTIONS: StudioEmotion[] = [
  "confidence",
  "pride",
  "curiosity",
  "hope",
  "achievement",
  "calm",
  "bonding",
  "routine-success",
];

const AGES = ["2-4", "3-5", "4-6", "5-8", "6-10"] as const;
const DIFFICULTIES: StudioDifficulty[] = ["beginner", "intermediate", "advanced"];
const DURATIONS = [15, 20, 30] as const;

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length]!;
}

function scoreFromSeed(seed: number, min: number, max: number): number {
  const span = max - min;
  return Math.round((min + (seed % (span * 10)) / 10) * 10) / 10;
}

function titleFor(
  angle: string,
  featureTitle: string,
  category: StudioCategory,
  emotion: StudioEmotion,
): string {
  const clean = featureTitle.replace(/^AmyNest\s*/i, "").trim();
  switch (emotion) {
    case "curiosity":
      return `${angle} about ${clean}`;
    case "pride":
      return `Watch your child shine with ${clean}`;
    case "calm":
      return `A calmer path to ${clean}`;
    case "bonding":
      return `Family time that grows ${clean}`;
    case "achievement":
      return `Small wins that build ${clean}`;
    case "hope":
      return `Every parent can unlock ${clean}`;
    case "routine-success":
      return `Make ${clean} part of your daily rhythm`;
    default:
      return `${angle}: ${category} with ${clean}`;
  }
}

/** Generate 1000+ evergreen ideas from knowledge + compositional angles. */
export function generateEvergreenLibrary(options?: {
  knowledge?: KnowledgeSnapshot;
  minIdeas?: number;
}): StudioTopicIdea[] {
  const knowledge = options?.knowledge ?? buildMasterKnowledgeBase();
  const minIdeas = options?.minIdeas ?? 1000;
  const ideas: StudioTopicIdea[] = [];
  const seen = new Set<string>();

  const seeds =
    knowledge.topicSeeds.length > 0
      ? knowledge.topicSeeds
      : ALL_CATEGORIES.map((category, i) => ({
          id: `fallback-${i}`,
          title: `${category} with AmyNest AI`,
          category,
          featureId: `fallback-${category}`,
          featureTitle: `AmyNest ${category}`,
          keywords: [category.toLowerCase(), "amynest", "parenting"],
          sourcePath: "studio/library",
        }));

  let angleIndex = 0;
  let ageIndex = 0;
  let emotionIndex = 0;
  let durationIndex = 0;
  let difficultyIndex = 0;
  let safety = 0;

  while (ideas.length < minIdeas && safety < minIdeas * 20) {
    safety += 1;
    const seed = seeds[safety % seeds.length]!;
    const category = seed.category;
    const angle = ANGLES[angleIndex % ANGLES.length]!;
    const age = AGES[ageIndex % AGES.length]!;
    const emotion = EMOTIONS[emotionIndex % EMOTIONS.length]!;
    const duration = DURATIONS[durationIndex % DURATIONS.length]!;
    const difficulty = DIFFICULTIES[difficultyIndex % DIFFICULTIES.length]!;

    angleIndex += 1;
    if (angleIndex % ANGLES.length === 0) ageIndex += 1;
    if (ageIndex % AGES.length === 0) emotionIndex += 1;
    if (emotionIndex % EMOTIONS.length === 0) durationIndex += 1;
    if (durationIndex % DURATIONS.length === 0) difficultyIndex += 1;

    const title = titleFor(angle, seed.featureTitle, category, emotion);
    const idBase = `${seed.featureId}|${angle}|${age}|${emotion}|${duration}|${difficulty}`;
    const id = `evergreen-${hashString(idBase).toString(16)}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const h = hashString(id);
    ideas.push({
      id,
      title,
      category,
      featureId: seed.featureId,
      featureTitle: seed.featureTitle,
      difficulty,
      audience: pick(["parents", "caregivers", "families"] as const, h),
      targetAge: age,
      estimatedCtr: scoreFromSeed(h, 4.2, 9.4),
      estimatedRetention: scoreFromSeed(h >> 3, 72, 94),
      emotion,
      recommendedDuration: duration,
      keywords: [
        ...seed.keywords.slice(0, 6),
        category.toLowerCase(),
        emotion,
        "amynest ai",
      ],
      angle,
    });
  }

  // Guarantee every studio category appears at least once.
  for (const category of ALL_CATEGORIES) {
    if (ideas.some((i) => i.category === category)) continue;
    const h = hashString(category);
    ideas.push({
      id: `evergreen-cat-${hashString(category).toString(16)}`,
      title: `${pick(ANGLES, h)} — ${category} with AmyNest AI`,
      category,
      difficulty: "beginner",
      audience: "parents",
      targetAge: "3-5",
      estimatedCtr: 6.5,
      estimatedRetention: 85,
      emotion: pick(EMOTIONS, h),
      recommendedDuration: 20,
      keywords: [category.toLowerCase(), "amynest", "parenting"],
      angle: pick(ANGLES, h),
    });
  }

  return ideas;
}

export function getEvergreenByCategory(
  ideas: StudioTopicIdea[],
  category: StudioCategory,
): StudioTopicIdea[] {
  return ideas.filter((i) => i.category === category);
}

export function rankEvergreenIdeas(ideas: StudioTopicIdea[]): StudioTopicIdea[] {
  return [...ideas].sort(
    (a, b) =>
      b.estimatedRetention * 0.55 +
      b.estimatedCtr * 4.5 -
      (a.estimatedRetention * 0.55 + a.estimatedCtr * 4.5),
  );
}

export { ALL_CATEGORIES };
