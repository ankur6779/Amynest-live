export type {
  EventCategoryId,
  Difficulty,
  EventCharacter,
  EventCategory,
  EventFilter,
} from "./types";

export type {
  EventPrepCountry,
  SchoolEventCategory,
  PrepTimelineStep,
  SchoolEvent,
  UpcomingEvent,
  CountryConfig,
} from "./eventTypes";

import type { EventCategoryId, EventCharacter, EventFilter } from "./types";
import type { EventPrepCountry } from "./eventTypes";
import { EVENT_CATEGORIES } from "./content/categories";
import { EVENT_CHARACTERS } from "./content/characters";
import { getNextEvent } from "./events";

export { EVENT_CATEGORIES, EVENT_CHARACTERS };

export {
  detectEventPrepCountry,
  countryConfig,
  COUNTRY_CONFIGS,
} from "./country";

export {
  ALL_SCHOOL_EVENTS,
  EVENTS_IN,
  EVENTS_US,
  EVENTS_GB,
  EVENTS_AU,
  EVENTS_NZ,
  EVENTS_CA,
  EVENTS_AE,
  EVENTS_EU,
  getEvents,
  findSchoolEvent,
  getUpcomingEvents,
  getNextEvent,
  searchSchoolEvents,
  daysUntilEvent,
  formatCountdown,
} from "./events";

export {
  getEventImages,
  withEventImages,
  type EventImages,
} from "./eventImages";

export {
  generateQuickActionLocal,
  parseQuickActionAiResponse,
  type QuickActionType,
  type QuickActionResult,
  type QuickActionInput,
} from "./quickActions";

/** Find a single character by id (or undefined). */
export function findCharacter(id: string): EventCharacter | undefined {
  return EVENT_CHARACTERS.find((c) => c.id === id);
}

/** All characters in a given category. */
export function charactersByCategory(category: EventCategoryId): EventCharacter[] {
  return EVENT_CHARACTERS.filter((c) => c.category === category);
}

/** Apply user-selected filters. */
export function applyFilters(
  list: EventCharacter[],
  f: EventFilter,
): EventCharacter[] {
  let out = list;
  if (f.lastMinute) {
    out = out.filter(
      (c) => c.timeMinutes <= 30 && c.difficulty === "Easy" && c.lowCost,
    );
    return out;
  }
  if (f.easyOnly) out = out.filter((c) => c.difficulty === "Easy");
  if (f.lowCostOnly) out = out.filter((c) => c.lowCost);
  if (f.quickOnly) out = out.filter((c) => c.timeMinutes <= 30);
  return out;
}

/**
 * Amy AI generator — rule-based recommender (used by the home screen
 * "Amy AI picks" row).
 */
export function recommendForChild(
  category: EventCategoryId,
  ageYears: number,
): EventCharacter[] {
  const all = charactersByCategory(category);
  if (all.length === 0) return [];
  const filtered =
    ageYears <= 5
      ? all.filter((c) => c.difficulty === "Easy" && c.timeMinutes <= 25)
      : all;
  const list = filtered.length ? filtered : all;
  return [...list].sort((a, b) => a.timeMinutes - b.timeMinutes).slice(0, 3);
}

/** Pick the right speech variant based on age. */
export function speechForAge(c: EventCharacter, ageYears: number): string {
  if (ageYears <= 5 && c.speechShort) return c.speechShort;
  return c.speech;
}

/** Pick the most relevant costume category based on country + calendar. */
export function getTimelyCategory(country?: EventPrepCountry | null): EventCategoryId {
  const next = getNextEvent(country);
  if (next?.event.costumeCategory) return next.event.costumeCategory;

  const m = new Date().getMonth();
  if (m === 0) return "republic-day";
  if (m === 7 || m === 8) return "independence-day";
  if (m === 9) return "gandhi-jayanti";
  if (m === 11 || m === 1) return "annual-day";
  return "fancy-dress";
}

// ─── Amy AI Event Generator ─────────────────────────────────────────────────

export type AgeBand = "2-5" | "6-10" | "10+";
export type TimeBudget = 15 | 30 | 60;
export type CostBudget = "low" | "medium";

/** Semantic tags applied to characters for occasion → tag matching. */
export type CharacterTag =
  | "freedom" | "profession" | "animal" | "nature"
  | "mythology" | "community" | "science" | "performance" | "general";

/**
 * High-level "events" the parent picks from. Distinct from EventCategoryId
 * (which is the bucket a character belongs to). One event maps to many tags.
 */
export type EventOccasionId =
  | "independence-day"
  | "republic-day"
  | "gandhi-jayanti"
  | "childrens-day"
  | "fancy-dress"
  | "annual-day"
  | "janmashtami"
  | "shivratri";

export interface EventOccasion {
  id: EventOccasionId;
  title: string;
  emoji: string;
}

export const EVENT_OCCASIONS: EventOccasion[] = [
  { id: "independence-day", title: "Independence Day", emoji: "🇮🇳" },
  { id: "republic-day",     title: "Republic Day",     emoji: "🎖️" },
  { id: "gandhi-jayanti",   title: "Gandhi Jayanti",   emoji: "🕊️" },
  { id: "childrens-day",    title: "Children's Day",   emoji: "🎈" },
  { id: "fancy-dress",      title: "Fancy Dress",      emoji: "🎉" },
  { id: "annual-day",       title: "Annual Day",       emoji: "🎭" },
  { id: "janmashtami",      title: "Janmashtami",      emoji: "🪈" },
  { id: "shivratri",        title: "Shivratri",        emoji: "🔱" },
];

/** event → semantic tag(s) — exactly as per the product spec. */
const OCCASION_TAGS: Record<EventOccasionId, CharacterTag[]> = {
  "independence-day": ["freedom"],
  "republic-day":     ["freedom"],
  "gandhi-jayanti":   ["freedom"],
  "childrens-day":    ["freedom", "community"],
  "fancy-dress":      ["profession", "animal", "nature", "science"],
  "annual-day":       ["profession", "science", "community", "performance"],
  "janmashtami":      ["mythology"],
  "shivratri":        ["mythology"],
};

/** Per-character semantic tags (kept here so the dataset file stays simple). */
const CHARACTER_TAGS: Record<string, CharacterTag[]> = {
  // Freedom fighters
  "bhagat-singh":          ["freedom"],
  "subhash-chandra-bose":  ["freedom"],
  "rani-lakshmibai":       ["freedom"],
  "freedom-fighter-girl":  ["freedom"],
  "dr-apj-abdul-kalam":    ["freedom", "science"],
  "indian-soldier":        ["freedom", "community", "profession"],
  "dr-bhimrao-ambedkar":   ["freedom"],
  "mahatma-gandhi":        ["freedom"],
  "kasturba-gandhi":       ["freedom"],
  "jawaharlal-nehru":      ["freedom"],
  // Mythology
  "krishna":               ["mythology"],
  "shiva":                 ["mythology"],
  // Performance / annual day
  "fairy":                 ["performance"],
  "santa":                 ["performance"],
  // Animals
  "lion":                  ["animal"],
  "peacock":               ["animal", "nature"],
  "rabbit":                ["animal"],
  // Professions / community
  "doctor":                ["profession", "community"],
  "police":                ["profession", "community"],
  "farmer":                ["profession", "community"],
  "teacher":               ["profession", "community"],
  "traffic-police":        ["profession", "community"],
  // Science
  "scientist":             ["profession", "science"],
  "astronaut":             ["profession", "science"],
  // Nature
  "tree":                  ["nature"],
  "sun":                   ["nature"],
};

/** age band → allowed difficulty levels (per spec). */
const AGE_DIFFICULTY: Record<AgeBand, Array<"Easy" | "Medium">> = {
  "2-5":  ["Easy"],
  "6-10": ["Easy", "Medium"],
  "10+":  ["Medium", "Easy"], // spec lists ["medium"] but Easy is fine for 10+ too
};

const AGE_BAND_TO_YEARS: Record<AgeBand, number> = { "2-5": 4, "6-10": 8, "10+": 12 };

export interface GeneratorInput {
  /** The chosen event. Undefined = let Amy pick the most relevant for "today". */
  event?: EventOccasionId;
  ageBand: AgeBand;
  timeMinutes: TimeBudget;
  budget: CostBudget;
}

export interface GeneratorIdea {
  character: EventCharacter;
  /** Speech adapted to the child's age band. */
  speech: string;
  /** Friendly template label shown on the result card. */
  template: "Easy: clothes + props" | "Medium: clothes + DIY craft";
  /** Why Amy picked this — friendly, parental tone. */
  reason: string;
}

export interface GeneratorResult {
  /** Friendly Amy intro line. */
  intro: string;
  /** 1–3 ordered ideas. The first is the highlighted "best" pick. */
  ideas: GeneratorIdea[];
  /** True when no exact matches existed and we fell back to general easy ideas. */
  fellBack: boolean;
}

function pickTimelyOccasion(country?: EventPrepCountry | null): EventOccasionId {
  const next = getNextEvent(country);
  const idMap: Record<string, EventOccasionId> = {
    "in-independence-day": "independence-day",
    "in-republic-day": "republic-day",
    "in-gandhi-jayanti": "gandhi-jayanti",
    "in-childrens-day": "childrens-day",
    "in-annual-day": "annual-day",
    "in-fancy-dress": "fancy-dress",
    "in-diwali": "fancy-dress",
    "in-holi": "fancy-dress",
    "us-halloween": "fancy-dress",
    "us-independence-day": "fancy-dress",
    "us-christmas": "annual-day",
    "us-thanksgiving": "fancy-dress",
    "ca-canada-day": "fancy-dress",
    "au-australia-day": "fancy-dress",
    "nz-waitangi-day": "fancy-dress",
    "ae-national-day": "fancy-dress",
    "gb-christmas-nativity": "annual-day",
    "eu-christmas-market": "annual-day",
  };
  if (next && idMap[next.event.id]) return idMap[next.event.id]!;

  const m = new Date().getMonth();
  if (m === 0) return "republic-day";
  if (m === 7 || m === 8) return "independence-day";
  if (m === 9) return "gandhi-jayanti";
  if (m === 10) return "childrens-day";
  if (m === 11 || m === 1) return "annual-day";
  return "fancy-dress";
}

function tagsFor(c: EventCharacter): CharacterTag[] {
  return CHARACTER_TAGS[c.id] ?? ["general"];
}

function templateFor(c: EventCharacter): GeneratorIdea["template"] {
  return c.steps.length <= 4 && c.lowCost
    ? "Easy: clothes + props"
    : "Medium: clothes + DIY craft";
}

function reasonFor(c: EventCharacter, input: GeneratorInput, fellBack: boolean): string {
  if (fellBack) return `No perfect match found, but this works for almost any school event in ${c.timeMinutes} minutes.`;
  const bits: string[] = [];
  if (c.timeMinutes <= input.timeMinutes) bits.push(`fits in ${c.timeMinutes} min`);
  if (c.difficulty === "Easy") bits.push("easy to put together");
  if (input.budget === "low" && c.materials.length <= 3) bits.push("uses just a few items");
  if (input.ageBand === "2-5" && c.speechShort) bits.push("has a short kid-friendly speech");
  return bits.length ? `Picked because it ${bits.join(", ")}.` : `Good all-rounder for this event.`;
}

/** Fisher–Yates shuffle (deterministic-friendly, but uses Math.random). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Amy AI Event Generator — pure rule-based.
 * Maps event → tags, applies age/time/budget filters, supports last-minute
 * mode and an "easy" fallback. Always returns 1–3 ideas.
 */
export function generateEventIdea(input: GeneratorInput): GeneratorResult {
  const occasion = input.event ?? pickTimelyOccasion();
  const ageYears = AGE_BAND_TO_YEARS[input.ageBand];
  const lastMinute = input.timeMinutes <= 15;
  const allowedDifficulties = AGE_DIFFICULTY[input.ageBand];
  const wantedTags = new Set<CharacterTag>(OCCASION_TAGS[occasion]);

  // ── Step 1: tags + difficulty ────────────────────────────────────────────
  let pool = EVENT_CHARACTERS.filter((c) => {
    const tags = tagsFor(c);
    const tagMatch = tags.some((t) => wantedTags.has(t));
    const diffMatch = allowedDifficulties.includes(c.difficulty);
    return tagMatch && diffMatch;
  });

  // ── Step 2: time budget ──────────────────────────────────────────────────
  pool = pool.filter((c) => c.timeMinutes <= input.timeMinutes);

  // ── Step 3: budget rule (low → ≤3 materials, per spec) ──────────────────
  if (input.budget === "low") {
    pool = pool.filter((c) => c.materials.length <= 3 || c.lowCost);
  }

  // ── Step 7: last-minute override (≤15 min → Easy + ≤15 only) ────────────
  if (lastMinute) {
    pool = pool.filter((c) => c.difficulty === "Easy" && c.timeMinutes <= 15);
  }

  // ── Step 5: fallback — anything Easy ─────────────────────────────────────
  let fellBack = false;
  if (pool.length === 0) {
    fellBack = true;
    pool = EVENT_CHARACTERS.filter((c) => c.difficulty === "Easy");
    // Honour the time budget on fallback too (otherwise we'd suggest a
    // 30-min idea when the parent has 15 min).
    pool = pool.filter((c) => c.timeMinutes <= Math.max(input.timeMinutes, 30));
  }

  // ── Step 6: shuffle + take top 3 ─────────────────────────────────────────
  const picked = shuffle(pool).slice(0, 3);

  // Final safety net (dataset can't realistically be empty).
  const safe = picked.length > 0
    ? picked
    : shuffle(EVENT_CHARACTERS.filter((c) => c.difficulty === "Easy")).slice(0, 3);

  const intro = lastMinute
    ? "Don't worry ❤️ Here are some quick and easy ideas for you!"
    : fellBack
    ? "Hmm, no perfect match — but here are some easy ideas you can try ✨"
    : "Got it! Here are some ideas I picked just for you ❤️";

  const ideas: GeneratorIdea[] = safe.map((c) => ({
    character: c,
    speech: speechForAge(c, ageYears),
    template: templateFor(c),
    reason: reasonFor(c, input, fellBack),
  }));

  return { intro, ideas, fellBack };
}
