/**
 * SkillGraphEngine — cross-module skill mastery (not just activity clicks).
 */

import type { SectionKey } from "./types";

export type SkillCategory =
  | "phonics"
  | "math"
  | "speech"
  | "language"
  | "stories"
  | "worksheets"
  | "puzzles"
  | "memory"
  | "creativity";

export type ProgressionStage =
  | "not_started"
  | "exploring"
  | "practicing"
  | "confident"
  | "mastered";

export interface SkillNodeDef {
  skillId: string;
  category: SkillCategory;
  title: string;
  emoji: string;
  relatedSkills: string[];
  parentSkillId?: string;
}

export interface SkillGraphEntry {
  childId: number;
  skillId: string;
  category: SkillCategory;
  mastery: number;
  confidence: number;
  attempts: number;
  lastPracticedAt: string | null;
  relatedSkills: string[];
  weakAreas: string[];
  progressionStage: ProgressionStage;
}

/** Canonical skill nodes — extend by adding ids + relations only. */
export const SKILL_CATALOG: SkillNodeDef[] = [
  { skillId: "phonics_letter_sounds", category: "phonics", title: "Letter sounds", emoji: "🔤", relatedSkills: ["phonics_blending"], parentSkillId: undefined },
  { skillId: "phonics_blending", category: "phonics", title: "Blending", emoji: "✨", relatedSkills: ["phonics_letter_sounds", "language_simple_words"], parentSkillId: "phonics_letter_sounds" },
  { skillId: "speech_clear_sounds", category: "speech", title: "Clear sounds", emoji: "🎤", relatedSkills: ["phonics_blending"], parentSkillId: undefined },
  { skillId: "speech_sentences", category: "speech", title: "Sentences", emoji: "🗣️", relatedSkills: ["speech_clear_sounds", "language_reading"], parentSkillId: "speech_clear_sounds" },
  { skillId: "math_counting", category: "math", title: "Counting", emoji: "🔢", relatedSkills: ["math_number_recognition"], parentSkillId: undefined },
  { skillId: "math_number_recognition", category: "math", title: "Number recognition", emoji: "123", relatedSkills: ["math_counting", "math_patterns"], parentSkillId: "math_counting" },
  { skillId: "math_patterns", category: "math", title: "Patterns", emoji: "🧩", relatedSkills: ["math_number_recognition", "math_addition"], parentSkillId: "math_number_recognition" },
  { skillId: "math_addition", category: "math", title: "Addition", emoji: "➕", relatedSkills: ["math_patterns"], parentSkillId: "math_patterns" },
  { skillId: "language_letters", category: "language", title: "Letters", emoji: "🔠", relatedSkills: ["phonics_letter_sounds"], parentSkillId: undefined },
  { skillId: "language_simple_words", category: "language", title: "Simple words", emoji: "📖", relatedSkills: ["phonics_blending", "language_reading"], parentSkillId: "language_letters" },
  { skillId: "language_reading", category: "language", title: "Reading", emoji: "📚", relatedSkills: ["language_simple_words", "stories_comprehension"], parentSkillId: "language_simple_words" },
  { skillId: "worksheets_tracing", category: "worksheets", title: "Tracing", emoji: "✏️", relatedSkills: ["language_letters"], parentSkillId: undefined },
  { skillId: "worksheets_writing", category: "worksheets", title: "Writing practice", emoji: "📝", relatedSkills: ["worksheets_tracing", "language_simple_words"], parentSkillId: "worksheets_tracing" },
  { skillId: "stories_listen", category: "stories", title: "Story listening", emoji: "📖", relatedSkills: ["stories_comprehension"], parentSkillId: undefined },
  { skillId: "stories_comprehension", category: "stories", title: "Comprehension", emoji: "💡", relatedSkills: ["stories_listen", "language_reading"], parentSkillId: "stories_listen" },
  { skillId: "puzzles_logic", category: "puzzles", title: "Logic puzzles", emoji: "🧠", relatedSkills: ["math_patterns"], parentSkillId: undefined },
  { skillId: "memory_shapes", category: "memory", title: "Shapes & colors", emoji: "🎨", relatedSkills: [], parentSkillId: undefined },
  { skillId: "creativity_animals", category: "creativity", title: "Animals & nature", emoji: "🦁", relatedSkills: ["stories_listen"], parentSkillId: undefined },
];

const catalogById = new Map(SKILL_CATALOG.map((s) => [s.skillId, s]));

export function getSkillDef(skillId: string): SkillNodeDef | undefined {
  return catalogById.get(skillId);
}

export function stageForMastery(mastery: number, attempts: number): ProgressionStage {
  if (attempts === 0) return "not_started";
  if (mastery >= 85 && attempts >= 4) return "mastered";
  if (mastery >= 70) return "confident";
  if (mastery >= 40 || attempts >= 2) return "practicing";
  return "exploring";
}

/** Map activity completion → skill ids to update. */
export function activityToSkillIds(
  activityId: string,
  section: SectionKey,
): string[] {
  const ids: string[] = [];
  if (activityId.startsWith("phonics_") || section === "phonics") {
    if (activityId.includes("blend")) ids.push("phonics_blending");
    else ids.push("phonics_letter_sounds", "language_letters");
  }
  if (activityId.startsWith("speech_") || section === "speech") {
    ids.push("speech_clear_sounds");
    if (activityId.includes("session")) ids.push("speech_sentences");
  }
  if (activityId.startsWith("play_numbers_") || (section === "math" && activityId.includes("play"))) {
    ids.push("math_counting", "math_number_recognition");
  }
  if (activityId.startsWith("play_alphabets_")) {
    ids.push("language_letters", "phonics_letter_sounds");
  }
  if (activityId.startsWith("topic_")) {
    if (activityId.includes("math") || section === "math") {
      ids.push("math_patterns", "math_addition");
    } else {
      ids.push("language_simple_words", "language_reading");
    }
  }
  if (activityId.startsWith("worksheet_") || section === "worksheets") {
    if (activityId.includes("trace") || activityId.includes("alphabet")) {
      ids.push("worksheets_tracing");
    } else ids.push("worksheets_writing");
  }
  if (section === "stories" || activityId.includes("story")) {
    ids.push("stories_listen", "stories_comprehension");
  }
  if (section === "puzzles") ids.push("puzzles_logic");
  if (section === "memory") ids.push("memory_shapes");
  if (section === "creativity") ids.push("creativity_animals");

  if (ids.length === 0) {
    const fallback: Record<SectionKey, string> = {
      phonics: "phonics_letter_sounds",
      math: "math_counting",
      speech: "speech_clear_sounds",
      stories: "stories_listen",
      lifeSkills: "creativity_animals",
      puzzles: "puzzles_logic",
      worksheets: "worksheets_tracing",
      spelling: "language_simple_words",
      memory: "memory_shapes",
      creativity: "creativity_animals",
    };
    const f = fallback[section];
    if (f) ids.push(f);
  }
  return [...new Set(ids)];
}

export function applySkillAttempt(
  entry: SkillGraphEntry | null,
  skillId: string,
  correct: boolean,
  nowIso: string,
): SkillGraphEntry {
  const def = getSkillDef(skillId);
  const base: SkillGraphEntry = entry ?? {
    childId: 0,
    skillId,
    category: def?.category ?? "phonics",
    mastery: 0,
    confidence: 0,
    attempts: 0,
    lastPracticedAt: null,
    relatedSkills: def?.relatedSkills ?? [],
    weakAreas: [],
    progressionStage: "not_started",
  };
  const attempts = base.attempts + 1;
  const bump = correct ? 8 : 3;
  const mastery = Math.min(100, base.mastery + bump);
  const confidence = Math.min(
    100,
    Math.round((base.confidence * base.attempts + (correct ? 90 : 40)) / attempts),
  );
  const weakAreas =
    mastery < 55 && attempts >= 2
      ? [...new Set([...base.weakAreas, skillId])].slice(0, 5)
      : base.weakAreas.filter((w) => w !== skillId);

  return {
    ...base,
    skillId,
    category: def?.category ?? base.category,
    mastery,
    confidence,
    attempts,
    lastPracticedAt: nowIso,
    relatedSkills: def?.relatedSkills ?? base.relatedSkills,
    weakAreas,
    progressionStage: stageForMastery(mastery, attempts),
  };
}

export function summarizeSkillGraph(entries: SkillGraphEntry[]): {
  masteredSkills: string[];
  strugglingSkills: string[];
  forgottenSkills: string[];
  inProgressSkills: string[];
} {
  const now = Date.now();
  const mastered: string[] = [];
  const struggling: string[] = [];
  const forgotten: string[] = [];
  const inProgress: string[] = [];

  for (const e of entries) {
    if (e.progressionStage === "mastered") mastered.push(e.skillId);
    else if (e.mastery < 50 && e.attempts >= 2) struggling.push(e.skillId);
    else if (e.attempts > 0) inProgress.push(e.skillId);

    if (e.lastPracticedAt) {
      const days =
        (now - new Date(e.lastPracticedAt).getTime()) / 86400000;
      if (days >= 14 && e.mastery >= 60 && e.progressionStage !== "mastered") {
        forgotten.push(e.skillId);
      }
    }
  }
  return {
    masteredSkills: mastered,
    strugglingSkills: struggling,
    forgottenSkills: forgotten,
    inProgressSkills: inProgress,
  };
}
