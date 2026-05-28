// Smart Study Zone — country + class-aware content resolution.
// Wraps static packs with runtime country localization and class filtering.

import type { SubjectPack, StudyTopic, StudyMode } from "./types";
import { BASIC_SUBJECTS } from "./content/basic";
import { ADVANCED_SUBJECTS } from "./content/advanced";
import { enrichTopic } from "./content/enrich-topics";
import { COUNTRY_BASICS_TOPIC, COUNTRY_FESTIVALS_TOPIC } from "./content/country-gk";
import { getPlayCategoriesForCountry } from "./content/country-play";
import type { PlayCategory } from "./types";
import type { SmartSubjectId } from "./levels";
import { levelForAge } from "./levels";
import { isTopicPracticeSubject } from "./topic-practice";

const SUPPORTED_COUNTRIES = new Set(["IN", "US", "UK", "AU", "NZ", "AE"]);

/** Map profile / GPS country codes to study-zone country keys. */
export function normalizeStudyCountry(raw?: string | null): string {
  if (!raw?.trim()) return "US";
  const u = raw.trim().toUpperCase();
  if (u === "GB") return "UK";
  return SUPPORTED_COUNTRIES.has(u) ? u : "DEFAULT";
}

/** Parse child's school class (1–10) from profile; nursery/UKG → 0. */
export function parseChildClassNumber(
  childClass?: string | null,
  ageYears?: number,
): number | null {
  if (childClass?.trim()) {
    const c = childClass.trim().toLowerCase();
    if (/(nursery|prep|lkg|ukg|kg|kindergarten)/.test(c)) return 0;
    const num = parseInt(c.replace(/[^0-9]/g, ""), 10);
    if (!Number.isNaN(num)) return num;
  }
  if (ageYears != null && Number.isFinite(ageYears)) {
    if (ageYears <= 5) return 0;
    return Math.min(10, Math.max(1, ageYears - 5));
  }
  return null;
}

const BASIC_TOPIC_CLASS: Record<string, { min: number; max: number }> = {
  "math:addition": { min: 1, max: 2 },
  "math:subtraction": { min: 1, max: 3 },
  "math:multiplication": { min: 2, max: 4 },
  "math:division": { min: 2, max: 5 },
  "math:fractions": { min: 3, max: 5 },
  "math:geometry-basics": { min: 1, max: 3 },
  "math:time-calendar": { min: 1, max: 3 },
  "science:plants": { min: 1, max: 2 },
  "science:animals": { min: 1, max: 3 },
  "science:states-of-matter": { min: 3, max: 5 },
  "science:human-body": { min: 1, max: 3 },
  "science:weather-seasons": { min: 2, max: 4 },
  "science:food-nutrition": { min: 3, max: 5 },
  "english:nouns": { min: 1, max: 2 },
  "english:verbs": { min: 1, max: 3 },
  "english:adjectives": { min: 2, max: 4 },
  "english:pronouns": { min: 2, max: 4 },
  "english:sentences": { min: 2, max: 5 },
  "gk:country-basics": { min: 2, max: 5 },
  "gk:india-basics": { min: 2, max: 5 },
  "gk:solar-system": { min: 2, max: 5 },
  "gk:local-festivals": { min: 1, max: 5 },
  "gk:indian-festivals": { min: 1, max: 5 },
  "gk:transport": { min: 1, max: 3 },
  "gk:community-helpers": { min: 1, max: 3 },
};

const ADVANCED_TOPIC_CLASS: Record<string, { min: number; max: number }> = {
  "math:algebra-basics": { min: 6, max: 7 },
  "math:linear-equations": { min: 7, max: 8 },
  "math:quadratic-equations": { min: 9, max: 10 },
  "math:geometry-triangles": { min: 6, max: 8 },
  "math:mensuration": { min: 7, max: 9 },
  "math:trigonometry-basics": { min: 9, max: 10 },
  "math:statistics-basics": { min: 8, max: 10 },
  "science:force-motion": { min: 6, max: 8 },
  "science:cells": { min: 6, max: 8 },
  "science:acids-bases": { min: 7, max: 9 },
  "science:electricity": { min: 8, max: 10 },
  "science:digestive-system": { min: 6, max: 8 },
  "science:light-optics": { min: 8, max: 10 },
  "english:tenses": { min: 6, max: 8 },
  "english:active-passive": { min: 7, max: 9 },
  "english:prepositions": { min: 6, max: 8 },
  "english:reported-speech": { min: 8, max: 10 },
  "english:essay-writing": { min: 9, max: 10 },
};

export function topicMatchesClass(
  topicId: string,
  subjectId: string,
  mode: "basic" | "advanced",
  classNum: number | null,
): boolean {
  if (classNum == null || classNum === 0) return true;
  const map = mode === "basic" ? BASIC_TOPIC_CLASS : ADVANCED_TOPIC_CLASS;
  const band = map[`${subjectId}:${topicId}`];
  if (!band) return true;
  return classNum >= band.min && classNum <= band.max;
}

export function filterTopicsForClass<T extends { id: string }>(
  topics: T[],
  subjectId: string,
  mode: "basic" | "advanced",
  classNum: number | null,
): T[] {
  return topics.filter((t) => topicMatchesClass(t.id, subjectId, mode, classNum));
}

function applyCountryGkPack(packs: SubjectPack[], country: string): SubjectPack[] {
  const key = SUPPORTED_COUNTRIES.has(country) ? country : "DEFAULT";
  const basicsDraft = COUNTRY_BASICS_TOPIC[key] ?? COUNTRY_BASICS_TOPIC.DEFAULT!;
  const festivalsDraft = COUNTRY_FESTIVALS_TOPIC[key] ?? COUNTRY_FESTIVALS_TOPIC.DEFAULT!;
  const basicsTopic = enrichTopic("gk", basicsDraft);
  const festivalsTopic = enrichTopic("gk", festivalsDraft);

  return packs.map((pack) => {
    if (pack.id !== "gk") return pack;
    const rest = pack.topics.filter(
      (t) => !["india-basics", "country-basics", "indian-festivals", "local-festivals"].includes(t.id),
    );
    return {
      ...pack,
      topics: [basicsTopic, festivalsTopic, ...rest],
    };
  });
}

export function getBasicSubjectsForCountry(country?: string | null): SubjectPack[] {
  return applyCountryGkPack([...BASIC_SUBJECTS], normalizeStudyCountry(country));
}

export function getAdvancedSubjectsForCountry(country?: string | null): SubjectPack[] {
  // Advanced packs are global today; country hook reserved for future localized science/english.
  void country;
  return [...ADVANCED_SUBJECTS];
}

export function getBasicSubjectsForChild(
  country?: string | null,
  childClass?: string | null,
  ageYears?: number,
): SubjectPack[] {
  const classNum = parseChildClassNumber(childClass, ageYears);
  return getBasicSubjectsForCountry(country).map((pack) => ({
    ...pack,
    topics: filterTopicsForClass(pack.topics, pack.id, "basic", classNum),
  })).filter((p) => p.topics.length > 0);
}

export function getAdvancedSubjectsForChild(
  country?: string | null,
  childClass?: string | null,
  ageYears?: number,
): SubjectPack[] {
  const classNum = parseChildClassNumber(childClass, ageYears);
  return getAdvancedSubjectsForCountry(country).map((pack) => ({
    ...pack,
    topics: filterTopicsForClass(pack.topics, pack.id, "advanced", classNum),
  })).filter((p) => p.topics.length > 0);
}

export function getSubjectPacksForChild(
  mode: StudyMode,
  country?: string | null,
  childClass?: string | null,
  ageYears?: number,
): SubjectPack[] {
  if (mode === "play") return [];
  return mode === "basic"
    ? getBasicSubjectsForChild(country, childClass, ageYears)
    : getAdvancedSubjectsForChild(country, childClass, ageYears);
}

export { getPlayCategoriesForCountry };

/** Play-mode item caps per hub journey day (free 3-day journey — mirrors phonics drip). */
export const PLAY_JOURNEY_LIMITS: Record<
  "alphabets" | "numbers" | "colors" | "shapes" | "animals" | "fruits" | "rhymes",
  Record<1 | 2 | 3, number>
> = {
  alphabets: { 1: 5, 2: 10, 3: 26 },
  numbers: { 1: 5, 2: 10, 3: 20 },
  colors: { 1: 6, 2: 10, 3: 10 },
  shapes: { 1: 3, 2: 6, 3: 8 },
  animals: { 1: 6, 2: 10, 3: 12 },
  fruits: { 1: 6, 2: 10, 3: 10 },
  rhymes: { 1: 3, 2: 5, 3: 8 },
};

function clampJourneyDay(journeyDay: number): 1 | 2 | 3 {
  return Math.min(3, Math.max(1, Math.floor(journeyDay))) as 1 | 2 | 3;
}

export function playCategoryLimitForJourneyDay(categoryId: string, journeyDay: number): number {
  const limits = PLAY_JOURNEY_LIMITS[categoryId as keyof typeof PLAY_JOURNEY_LIMITS];
  if (!limits) return Number.MAX_SAFE_INTEGER;
  return limits[clampJourneyDay(journeyDay)];
}

export function playUnlocksTomorrowForCategory(categoryId: string, journeyDay: number): number {
  if (journeyDay >= 3) return 0;
  const cur = playCategoryLimitForJourneyDay(categoryId, journeyDay);
  const next = playCategoryLimitForJourneyDay(categoryId, journeyDay + 1);
  return Math.max(0, next - cur);
}

function filterPlayCategoryByJourneyDay(cat: PlayCategory, journeyDay: number): PlayCategory {
  const cap = playCategoryLimitForJourneyDay(cat.id, journeyDay);
  if (!Number.isFinite(cap)) return cat;

  switch (cat.id) {
    case "alphabets":
      return {
        ...cat,
        items: cat.items.filter((i) => {
          const idx = i.id.charCodeAt(0) - 65;
          return idx >= 0 && idx < cap;
        }),
      };
    case "numbers":
      return {
        ...cat,
        items: cat.items.filter((i) => {
          const n = parseInt(i.id, 10);
          return !Number.isNaN(n) && n <= cap;
        }),
      };
    case "shapes":
      if (journeyDay <= 1) {
        return {
          ...cat,
          items: cat.items.filter((i) => ["circle", "square", "triangle"].includes(i.id)),
        };
      }
      return { ...cat, items: cat.items.slice(0, cap) };
    default:
      return { ...cat, items: cat.items.slice(0, cap) };
  }
}

/** Play mode age bands — younger kids see fewer items; hub journey day expands the catalog. */
export function getPlayCategoriesForChild(
  country?: string | null,
  ageYears?: number,
  journeyDay = 1,
): PlayCategory[] {
  const cats = getPlayCategoriesForCountry(normalizeStudyCountry(country));
  const age = ageYears ?? 4;
  const band = levelForAge(age);
  const day = Math.max(1, Math.floor(journeyDay));

  // Ages 4–5 get the full play catalog regardless of journey day.
  if (band >= 2) return cats;

  return cats.map((cat) => filterPlayCategoryByJourneyDay(cat, day));
}

/** Any topic with a programmatic practice generator (math, science, English). */
export function isAdaptivePracticeTopic(topicId: string): boolean {
  return isTopicPracticeSubject(topicId);
}

/** @deprecated use isAdaptivePracticeTopic */
export function isAdaptiveMathTopic(topicId: string): topicId is SmartSubjectId {
  return isTopicPracticeSubject(topicId);
}

/** @deprecated use isAdaptivePracticeTopic */
export const ADAPTIVE_MATH_TOPIC_IDS = new Set<string>([
  "addition", "subtraction", "multiplication", "division", "fractions",
]);
