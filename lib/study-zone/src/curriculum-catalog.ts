// Smart Study Zone — curriculum scale, journey stages, and explorer catalog.
// Pure data/helpers for parent-facing long-term value UI.

import type { StudyMode } from "./types";
import { resolveStudyMode } from "./types";
import { BASIC_SUBJECTS } from "./content/basic";
import { ADVANCED_SUBJECTS } from "./content/advanced";
import { PLAY_CATEGORIES } from "./content/play";

export type JourneyStageId = "play" | "basic" | "advanced";

export interface JourneyStage {
  id: JourneyStageId;
  ageLabel: string;
  minAge: number;
  maxAge: number;
  title: string;
  subtitle: string;
  emoji: string;
  topicCount: number;
  highlights: string[];
}

export interface FutureWorld {
  id: string;
  title: string;
  shortTitle: string;
  unlockAge: number;
  emoji: string;
  gradient: string;
  previewSkills: string[];
  /** Emoji-prefixed skill lines for card display. */
  skillHighlights: { emoji: string; label: string }[];
  topicCount: number;
  previewTopics: { subject: string; topics: string[] }[];
  stageId: JourneyStageId;
}

export interface FutureLessonBreakdown {
  id: string;
  label: string;
  count: number;
  locked: boolean;
}

export interface LearningTimelineMilestone {
  id: string;
  horizon: string;
  items: { label: string; locked: boolean; emoji?: string }[];
}

export interface StageTopicPreview {
  ageLabel: string;
  stageId: JourneyStageId;
  groups: { subject: string; topics: string[] }[];
}

export interface CurriculumExplorerBand {
  ageLabel: string;
  stageId: JourneyStageId;
  groups: { subject: string; topics: string[] }[];
}

export interface CurriculumStat {
  id: string;
  emoji: string;
  value: string;
  label: string;
}

export interface WhatComesNextItem {
  id: string;
  horizon: "next_week" | "next_month" | "future_stage";
  title: string;
  emoji: string;
  locked: boolean;
}

export interface CurriculumUnlockSnapshot {
  availableNow: number;
  futureWaiting: number;
  unlockedPercent: number;
  currentStageIndex: number;
  stagesAhead: number;
  currentStageTitle: string;
  nextUnlockTitle: string;
  futureTopics: number;
  futureWorldsCount: number;
  futureLessonBreakdown: FutureLessonBreakdown[];
  totalFutureLessons: number;
}

export const WHY_STAY_WITH_AMYNEST = [
  { id: "personalized", emoji: "✓", label: "Personalized by age" },
  { id: "adaptive", emoji: "✓", label: "Adaptive AI learning" },
  { id: "lessons", emoji: "✓", label: "500+ lessons" },
  { id: "path", emoji: "✓", label: "Learning path until age 15" },
  { id: "unlocks", emoji: "✓", label: "New content unlocks over time" },
] as const;

/** Content-bank smart-study totals (see content-bank/stats.json). */
export const CONTENT_BANK_SMART_STUDY_LESSONS = 500;

export const CONTENT_BANK_BY_AGE: Record<string, number> = {
  "2-4": 213,
  "4-6": 227,
  "6-8": 216,
  "8-10": 230,
  "10-12": 214,
};

export const LEARNING_DOMAINS = [
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

const PLAY_TOPIC_COUNT = PLAY_CATEGORIES.length;
const BASIC_TOPIC_COUNT = BASIC_SUBJECTS.reduce((n, s) => n + s.topics.length, 0);
const ADVANCED_TOPIC_COUNT = ADVANCED_SUBJECTS.reduce((n, s) => n + s.topics.length, 0);
const CORE_TOPIC_COUNT = BASIC_TOPIC_COUNT + ADVANCED_TOPIC_COUNT + PLAY_TOPIC_COUNT;

export const CURRICULUM_STATS: CurriculumStat[] = [
  { id: "lessons", emoji: "📚", value: "500+", label: "Lessons" },
  { id: "topics", emoji: "🎯", value: `${CORE_TOPIC_COUNT}+`, label: "Core Topics" },
  { id: "domains", emoji: "🧠", value: "20", label: "Learning Domains" },
  { id: "countries", emoji: "🌍", value: "6+", label: "Countries Localized" },
  { id: "ages", emoji: "👶", value: "2–15", label: "Age Range" },
  { id: "adaptive", emoji: "⚡", value: "6", label: "AI Practice Levels" },
];

export const JOURNEY_STAGES: JourneyStage[] = [
  {
    id: "play",
    ageLabel: "2–5",
    minAge: 2,
    maxAge: 5,
    title: "Play & Learn",
    subtitle: "Tap, listen, explore",
    emoji: "👶",
    topicCount: PLAY_TOPIC_COUNT,
    highlights: ["Alphabets", "Numbers", "Colors", "Shapes", "Rhymes"],
  },
  {
    id: "basic",
    ageLabel: "6–10",
    minAge: 6,
    maxAge: 10,
    title: "Basic Learning",
    subtitle: `${BASIC_TOPIC_COUNT}+ core topics`,
    emoji: "📘",
    topicCount: BASIC_TOPIC_COUNT,
    highlights: ["Math", "Science", "English", "General Knowledge"],
  },
  {
    id: "advanced",
    ageLabel: "11–15",
    minAge: 11,
    maxAge: 15,
    title: "Advanced Study",
    subtitle: "Math • Science • English",
    emoji: "📊",
    topicCount: ADVANCED_TOPIC_COUNT,
    highlights: ["Algebra", "Physics concepts", "Essay writing"],
  },
];

function previewFromSubjects(
  subjectIds: string[],
  maxPerSubject = 4,
): { subject: string; topics: string[] }[] {
  return BASIC_SUBJECTS.filter((s) => subjectIds.includes(s.id)).map((s) => ({
    subject: s.title,
    topics: s.topics.slice(0, maxPerSubject).map((t) => t.title),
  }));
}

function previewFromAdvanced(
  subjectIds: string[],
  maxPerSubject = 4,
): { subject: string; topics: string[] }[] {
  return ADVANCED_SUBJECTS.filter((s) => subjectIds.includes(s.id)).map((s) => ({
    subject: s.title,
    topics: s.topics.slice(0, maxPerSubject).map((t) => t.title),
  }));
}

export const FUTURE_WORLDS: FutureWorld[] = [
  {
    id: "reading-vocabulary",
    title: "Reading & Vocabulary World",
    shortTitle: "Reading Explorer",
    unlockAge: 5,
    emoji: "📖",
    gradient: "from-violet-500/30 via-purple-500/20 to-fuchsia-500/25",
    previewSkills: ["Sight words", "Story comprehension", "Word families"],
    skillHighlights: [
      { emoji: "📚", label: "Sight words" },
      { emoji: "📖", label: "Story comprehension" },
      { emoji: "🔤", label: "Word families" },
    ],
    topicCount: 8,
    previewTopics: previewFromSubjects(["english"], 3),
    stageId: "basic",
  },
  {
    id: "science-explorer",
    title: "Science Explorer World",
    shortTitle: "Science Explorer",
    unlockAge: 6,
    emoji: "🔬",
    gradient: "from-emerald-500/30 via-teal-500/20 to-cyan-500/25",
    previewSkills: ["Plants & habitats", "Weather cycles", "Human body basics"],
    skillHighlights: [
      { emoji: "🌱", label: "Plants" },
      { emoji: "🌦", label: "Weather" },
      { emoji: "🦴", label: "Human Body" },
    ],
    topicCount: 6,
    previewTopics: previewFromSubjects(["science"], 3),
    stageId: "basic",
  },
  {
    id: "math-mastery",
    title: "Math Mastery World",
    shortTitle: "Math Mastery",
    unlockAge: 7,
    emoji: "➕",
    gradient: "from-amber-500/30 via-orange-500/20 to-yellow-500/25",
    previewSkills: ["Multiplication tables", "Fractions", "Word problems"],
    skillHighlights: [
      { emoji: "✖️", label: "Multiplication" },
      { emoji: "🍰", label: "Fractions" },
      { emoji: "📝", label: "Word problems" },
    ],
    topicCount: 7,
    previewTopics: previewFromSubjects(["math"], 3),
    stageId: "basic",
  },
  {
    id: "stem-logic",
    title: "STEM & Logic Lab",
    shortTitle: "STEM & Logic",
    unlockAge: 8,
    emoji: "🧩",
    gradient: "from-blue-500/30 via-indigo-500/20 to-violet-500/25",
    previewSkills: ["Patterns & puzzles", "Observation skills", "Critical thinking"],
    skillHighlights: [
      { emoji: "🧩", label: "Patterns & puzzles" },
      { emoji: "👁", label: "Observation" },
      { emoji: "💡", label: "Critical thinking" },
    ],
    topicCount: 5,
    previewTopics: [
      { subject: "Logic", topics: ["Patterns", "Memory games", "Observation"] },
      { subject: "Science", topics: ["States of matter", "Food & nutrition"] },
    ],
    stageId: "basic",
  },
  {
    id: "advanced-hub",
    title: "Advanced Study Hub",
    shortTitle: "Advanced Study",
    unlockAge: 11,
    emoji: "🎓",
    gradient: "from-rose-500/30 via-pink-500/20 to-indigo-500/25",
    previewSkills: ["Algebra & trigonometry", "Electricity & optics", "Essay writing"],
    skillHighlights: [
      { emoji: "📐", label: "Algebra" },
      { emoji: "⚡", label: "Electricity" },
      { emoji: "✍️", label: "Essay writing" },
    ],
    topicCount: ADVANCED_TOPIC_COUNT,
    previewTopics: previewFromAdvanced(["math", "science", "english"], 2),
    stageId: "advanced",
  },
];

/** Condensed topic previews for future stages (not full curriculum). */
export const FUTURE_STAGE_PREVIEWS: StageTopicPreview[] = [
  {
    ageLabel: "6–10",
    stageId: "basic",
    groups: [
      { subject: "Math", topics: ["Addition", "Fractions", "Time & Calendar"] },
      { subject: "Science", topics: ["Plants", "Weather & Seasons", "Human Body"] },
      { subject: "English", topics: ["Nouns", "Verbs", "Making Sentences"] },
    ],
  },
  {
    ageLabel: "11–15",
    stageId: "advanced",
    groups: [
      { subject: "Math", topics: ["Algebra Basics", "Trigonometry Basics", "Statistics"] },
      { subject: "Science", topics: ["Electricity", "Force and Motion", "Light & Optics"] },
      { subject: "English", topics: ["Essay Writing", "Reported Speech", "Tenses Overview"] },
    ],
  },
];

/** Full curriculum tree for the explorer sheet. */
export const CURRICULUM_EXPLORER: CurriculumExplorerBand[] = [
  {
    ageLabel: "2–5",
    stageId: "play",
    groups: [
      {
        subject: "Play & Learn",
        topics: PLAY_CATEGORIES.map((c) => c.title),
      },
    ],
  },
  {
    ageLabel: "6–10",
    stageId: "basic",
    groups: BASIC_SUBJECTS.map((s) => ({
      subject: s.title,
      topics: s.topics.map((t) => t.title),
    })),
  },
  {
    ageLabel: "11–15",
    stageId: "advanced",
    groups: ADVANCED_SUBJECTS.map((s) => ({
      subject: s.title,
      topics: s.topics.map((t) => t.title),
    })),
  },
];

const STAGE_ORDER: JourneyStageId[] = ["play", "basic", "advanced"];

export function journeyStageIndex(stageId: JourneyStageId): number {
  return STAGE_ORDER.indexOf(stageId);
}

export function resolveJourneyStage(
  ageYears: number,
  childClass?: string | null,
): JourneyStageId {
  return resolveStudyMode(ageYears, childClass);
}

const BAND_ORDER = ["2-4", "4-6", "6-8", "8-10", "10-12"] as const;

export function ageBandKey(ageYears: number): (typeof BAND_ORDER)[number] {
  if (ageYears <= 4) return "2-4";
  if (ageYears <= 6) return "4-6";
  if (ageYears <= 8) return "6-8";
  if (ageYears <= 10) return "8-10";
  return "10-12";
}

const FUTURE_BAND_LABELS: Record<(typeof BAND_ORDER)[number], string> = {
  "2-4": "Early Play lessons",
  "4-6": "Reading lessons",
  "6-8": "Science lessons",
  "8-10": "Math & Logic lessons",
  "10-12": "Advanced lessons",
};

function futureLessonBreakdownForAge(ageYears: number): FutureLessonBreakdown[] {
  const currentBand = ageBandKey(ageYears);
  const currentIdx = BAND_ORDER.indexOf(currentBand);
  return BAND_ORDER.slice(currentIdx + 1).map((band) => ({
    id: band,
    label: FUTURE_BAND_LABELS[band],
    count: CONTENT_BANK_BY_AGE[band] ?? 0,
    locked: true,
  }));
}

export function getNextUnlockWorld(
  ageYears: number,
  childClass?: string | null,
): FutureWorld | undefined {
  const worlds = futureWorldsForChild(ageYears, childClass);
  return worlds.sort((a, b) => a.unlockAge - b.unlockAge)[0];
}

export function buildLearningTimeline(
  ageYears: number,
  childClass?: string | null,
  todayItems: string[] = [],
): LearningTimelineMilestone[] {
  const mode = resolveJourneyStage(ageYears, childClass);
  const todayLabels = todayItems.length > 0
    ? todayItems.slice(0, 3)
    : mode === "play"
      ? ["Colors", "Numbers", "Alphabets"]
      : mode === "basic"
        ? ["Today's Plan", "Adaptive Practice"]
        : ["Today's Plan", "Advanced Practice"];

  const milestones: LearningTimelineMilestone[] = [
    {
      id: "today",
      horizon: "Today",
      items: todayLabels.map((label) => ({ label, locked: false, emoji: "✓" })),
    },
    {
      id: "next-year",
      horizon: "Next Year",
      items: [
        { label: "Reading Stories", locked: true },
        { label: "Vocabulary Builder", locked: true },
      ],
    },
  ];

  if (ageYears < 6) {
    milestones.push({
      id: "age-6",
      horizon: "Age 6+",
      items: [
        { label: "Science Explorer", locked: true },
        { label: "Math Foundations", locked: true },
      ],
    });
  }
  if (ageYears < 8) {
    milestones.push({
      id: "age-8",
      horizon: "Age 8+",
      items: [{ label: "Logic & STEM", locked: true }],
    });
  }
  if (ageYears < 11) {
    milestones.push({
      id: "age-11",
      horizon: "Age 11+",
      items: [
        { label: "Algebra", locked: true },
        { label: "Essay Writing", locked: true },
      ],
    });
  }

  milestones.push({
    id: "graduation",
    horizon: "Age 15",
    items: [{ label: "AmyNest Graduation", locked: ageYears < 14, emoji: "🏆" }],
  });

  return milestones;
}

export function futureStagePreviewsForChild(
  ageYears: number,
  childClass?: string | null,
): StageTopicPreview[] {
  const mode = resolveJourneyStage(ageYears, childClass);
  const stageIdx = journeyStageIndex(mode);
  return FUTURE_STAGE_PREVIEWS.filter(
    (p) => journeyStageIndex(p.stageId) > stageIdx,
  );
}

/** Lessons + topics available at the child's current stage vs waiting ahead. */
export function computeCurriculumUnlockSnapshot(
  ageYears: number,
  childClass?: string | null,
): CurriculumUnlockSnapshot {
  const mode = resolveJourneyStage(ageYears, childClass);
  const stageIdx = journeyStageIndex(mode);
  const currentBand = ageBandKey(ageYears);
  const availableNow = CONTENT_BANK_BY_AGE[currentBand] ?? 200;
  const futureLessonBreakdown = futureLessonBreakdownForAge(ageYears);
  const totalFutureLessons = futureLessonBreakdown.reduce((s, b) => s + b.count, 0);

  const futureStageTopics = JOURNEY_STAGES.slice(stageIdx + 1)
    .reduce((sum, s) => sum + s.topicCount, 0);

  const worlds = futureWorldsForChild(ageYears, childClass);
  const futureWaiting = totalFutureLessons + futureStageTopics;
  const totalUniverse = availableNow + futureWaiting + CORE_TOPIC_COUNT;
  const unlockedPercent = Math.min(
    99,
    Math.max(8, Math.round((availableNow / totalUniverse) * 100)),
  );

  const currentStage = JOURNEY_STAGES[stageIdx]!;
  const nextWorld = getNextUnlockWorld(ageYears, childClass);

  return {
    availableNow,
    futureWaiting: totalFutureLessons + futureStageTopics,
    unlockedPercent,
    currentStageIndex: stageIdx,
    stagesAhead: Math.max(0, JOURNEY_STAGES.length - 1 - stageIdx),
    currentStageTitle: currentStage.title,
    nextUnlockTitle: nextWorld?.shortTitle ?? "Advanced Study",
    futureTopics: futureStageTopics + (mode === "play" ? BASIC_TOPIC_COUNT + ADVANCED_TOPIC_COUNT : mode === "basic" ? ADVANCED_TOPIC_COUNT : 0),
    futureWorldsCount: worlds.length,
    futureLessonBreakdown,
    totalFutureLessons,
  };
}

export function futureWorldsForChild(
  ageYears: number,
  childClass?: string | null,
): FutureWorld[] {
  const mode = resolveJourneyStage(ageYears, childClass);
  const stageIdx = journeyStageIndex(mode);
  return FUTURE_WORLDS.filter((w) => journeyStageIndex(w.stageId) > stageIdx || ageYears < w.unlockAge);
}

export function buildWhatComesNextItems(
  ageYears: number,
  childClass?: string | null,
  nextSessionTitles: string[] = [],
): WhatComesNextItem[] {
  const mode = resolveJourneyStage(ageYears, childClass);
  const items: WhatComesNextItem[] = [];

  if (nextSessionTitles[0]) {
    items.push({
      id: "next-week",
      horizon: "next_week",
      title: nextSessionTitles[0],
      emoji: "🔓",
      locked: false,
    });
  } else if (mode === "play") {
    items.push({
      id: "next-week-numbers",
      horizon: "next_week",
      title: "New Numbers & Letters",
      emoji: "🔓",
      locked: false,
    });
  } else {
    items.push({
      id: "next-week-practice",
      horizon: "next_week",
      title: "Fresh Adaptive Practice",
      emoji: "🔓",
      locked: false,
    });
  }

  if (nextSessionTitles[1]) {
    items.push({
      id: "next-month",
      horizon: "next_month",
      title: nextSessionTitles[1],
      emoji: "🔓",
      locked: false,
    });
  } else if (mode === "play") {
    items.push({
      id: "next-month-reading",
      horizon: "next_month",
      title: "Reading Readiness",
      emoji: "🔓",
      locked: false,
    });
  } else if (mode === "basic") {
    items.push({
      id: "next-month-science",
      horizon: "next_month",
      title: "Science Explorer Topics",
      emoji: "🔓",
      locked: false,
    });
  } else {
    items.push({
      id: "next-month-advanced",
      horizon: "next_month",
      title: "Advanced Practice Sets",
      emoji: "🔓",
      locked: false,
    });
  }

  const lockedWorlds = futureWorldsForChild(ageYears, childClass).slice(0, 3);
  for (const world of lockedWorlds) {
    items.push({
      id: world.id,
      horizon: "future_stage",
      title: world.title.replace(" World", "").replace(" Hub", ""),
      emoji: "🔒",
      locked: true,
    });
  }

  if (lockedWorlds.length < 3) {
    const extras: WhatComesNextItem[] = [
      { id: "future-algebra", horizon: "future_stage", title: "Algebra & Advanced Math", emoji: "🔒", locked: true },
      { id: "future-essay", horizon: "future_stage", title: "Essay Writing & Critical Thinking", emoji: "🔒", locked: true },
    ];
    for (const ex of extras) {
      if (items.length >= 5) break;
      if (!items.some((i) => i.title === ex.title)) items.push(ex);
    }
  }

  return items.slice(0, 5);
}

export function journeyStageMessage(
  stageIndex: number,
  stagesAhead: number,
): string {
  if (stagesAhead <= 0) {
    return "Your child is in the final learning stage — mastery mode unlocked across the full curriculum.";
  }
  const stageNum = stageIndex + 1;
  const word = stagesAhead === 1 ? "world is" : "worlds are";
  return `Your child is currently exploring Stage ${stageNum}. ${stagesAhead} more learning ${word} already waiting ahead.`;
}

/** Whether a journey stage is active, upcoming, or past for this child. */
export function stageStatus(
  stageId: JourneyStageId,
  currentMode: StudyMode,
): "current" | "locked" | "past" {
  const cur = journeyStageIndex(currentMode);
  const idx = journeyStageIndex(stageId);
  if (idx === cur) return "current";
  if (idx < cur) return "past";
  return "locked";
}
