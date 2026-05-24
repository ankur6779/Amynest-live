/**
 * Semantic enrichment layer — contextual titles, descriptions, and Parent Hub
 * module links. Runs BEFORE the intelligence pipeline; does not alter timing,
 * duration, or scheduling.
 */

export type LaunchCountry = "US" | "UK" | "AU" | "NZ" | "AT" | "AE" | "IN";

export type EnhanceableItem = {
  time?: string;
  activity: string;
  duration: number;
  category: string;
  notes?: string;
  description?: string;
  linkedModules?: string[];
  type?: string;
  locked?: boolean;
  activitySource?: "fixed" | "special" | "generated";
  parentHubTopic?: string | null;
};

export type ActivityEnhancerContext = {
  age: number;
  country?: string | null;
  interests?: readonly string[];
  goals?: readonly string[];
};

const COUNTRY_ALIASES: Record<string, LaunchCountry> = {
  US: "US",
  USA: "US",
  "UNITED STATES": "US",
  UK: "UK",
  GB: "UK",
  "UNITED KINGDOM": "UK",
  AU: "AU",
  AUS: "AU",
  AUSTRALIA: "AU",
  NZ: "NZ",
  "NEW ZEALAND": "NZ",
  AT: "AT",
  AUT: "AT",
  AUSTRIA: "AT",
  AE: "AE",
  UAE: "AE",
  "UNITED ARAB EMIRATES": "AE",
  IN: "IN",
  IND: "IN",
  INDIA: "IN",
};

const SKIP_CATEGORIES = new Set([
  "meal",
  "tiffin",
  "school",
  "sleep",
  "travel",
  "hygiene",
  "morning",
  "morning_routine",
  "wind-down",
  "self_care",
  "screen",
]);

type TitleMapping = Partial<Record<string, readonly string[]>>;

const TITLE_MAPPINGS: Record<LaunchCountry, TitleMapping> = {
  IN: {
    study: [
      "Math practice (school aligned)",
      "English reading aloud",
      "EVS concept revision",
    ],
    play: [
      "Outdoor cricket / free play",
      "Indoor board games with parent",
    ],
    outdoor: [
      "Evening park time (light play)",
      "Nature walk with parent",
    ],
    creative: [
      "Drawing & craft time",
      "Indoor creative play",
    ],
  },
  US: {
    study: [
      "Reading log practice",
      "STEM kit exploration",
    ],
    play: [
      "Backyard sports",
      "Creative free play",
    ],
    outdoor: [
      "Park playdate",
      "Backyard active play",
    ],
    creative: [
      "Arts & crafts session",
      "Building & imagination play",
    ],
  },
  UK: {
    study: [
      "Homework & reading time",
      "Spelling practice",
    ],
    play: [
      "Football in the garden",
      "Indoor board games",
    ],
    outdoor: [
      "After-school outdoor play",
      "Nature walk",
    ],
  },
  AU: {
    study: [
      "Reading & homework",
      "Math facts practice",
    ],
    play: [
      "Backyard cricket",
      "Creative free play",
    ],
    outdoor: [
      "Playground time",
      "Backyard sports",
    ],
  },
  NZ: {
    study: [
      "Reading & homework",
      "School-aligned revision",
    ],
    play: [
      "Nature play",
      "Indoor creative play",
    ],
    outdoor: [
      "Beach or bush walk",
      "Backyard exploration",
    ],
  },
  AT: {
    study: [
      "Hausaufgaben (homework)",
      "Reading practice",
    ],
    play: [
      "Structured outdoor play",
      "Indoor creative time",
    ],
    outdoor: [
      "Structured outdoor activity",
      "Park walk",
    ],
  },
  AE: {
    play: [
      "Indoor obstacle play",
      "Creative art session",
    ],
    outdoor: [
      "Evening outdoor walk",
      "Heat-safe light play",
    ],
    creative: [
      "Indoor creative play",
      "Art & craft session",
    ],
  },
};

const MODULE_LINKS: Record<string, readonly string[]> = {
  study: ["parent_focus_guide", "amy_coach_study_tips"],
  homework: ["parent_focus_guide", "amy_coach_study_tips"],
  play: ["benefits_of_play", "activity_ideas"],
  outdoor: ["benefits_of_play", "activity_ideas"],
  creative: ["benefits_of_play", "activity_ideas"],
  exercise: ["benefits_of_play", "activity_ideas"],
  bonding: ["benefits_of_play", "family_bonding_ideas"],
  family: ["family_bonding_ideas"],
  reading: ["phonics_audio", "story_audio"],
};

const PARENT_HUB_TOPIC_BY_MODULE: Record<string, string> = {
  parent_focus_guide: "Focus & Study Habits",
  amy_coach_study_tips: "Study Support with Amy",
  benefits_of_play: "Benefits of Play",
  activity_ideas: "Activity Ideas",
  family_bonding_ideas: "Family Bonding Ideas",
  phonics_audio: "Phonics & Reading",
  story_audio: "Story Time Audio",
};

function normalizeCountry(country?: string | null): LaunchCountry {
  if (!country?.trim()) return "US";
  const key = country.trim().toUpperCase();
  if (key in TITLE_MAPPINGS) return key as LaunchCountry;
  return COUNTRY_ALIASES[key] ?? "US";
}

function categoryKey(item: EnhanceableItem): string | null {
  const cat = (item.category ?? "").toLowerCase();
  if (cat === "homework" || cat === "study") return "study";
  if (cat === "reading") return "reading";
  if (cat === "outdoor" || cat === "outdoor_play") return "outdoor";
  if (cat === "creative") return "creative";
  if (["play", "exercise", "bonding", "family"].includes(cat)) return "play";
  return null;
}

function isEnrichable(item: EnhanceableItem): boolean {
  if (item.locked) return false;
  if (item.activitySource === "fixed" || item.activitySource === "special") return false;
  const cat = (item.category ?? "").toLowerCase();
  if (SKIP_CATEGORIES.has(cat)) return false;
  return categoryKey(item) != null;
}

function deterministicIndex(item: EnhanceableItem, modulo: number): number {
  if (modulo <= 0) return 0;
  const seed = (item.time?.length ?? 0) + item.activity.length + (item.category?.length ?? 0);
  return seed % modulo;
}

function matchesInterest(option: string, interests: readonly string[]): boolean {
  const lower = option.toLowerCase();
  return interests.some((i) => i.trim() && lower.includes(i.trim().toLowerCase()));
}

function matchesGoal(option: string, goals: readonly string[]): boolean {
  const lower = option.toLowerCase();
  return goals.some((g) => {
    const token = g.trim().toLowerCase();
    if (!token) return false;
    if (token.includes("focus") && lower.includes("study")) return true;
    if (token.includes("sleep") && lower.includes("wind")) return true;
    if (token.includes("independence") && lower.includes("parent")) return true;
    return lower.includes(token);
  });
}

function pickTitle(
  options: readonly string[],
  item: EnhanceableItem,
  interests: readonly string[],
  goals: readonly string[],
): string {
  if (interests.length > 0) {
    const byInterest = options.find((o) => matchesInterest(o, interests));
    if (byInterest) return byInterest;
  }
  if (goals.length > 0) {
    const byGoal = options.find((o) => matchesGoal(o, goals));
    if (byGoal) return byGoal;
  }
  return options[deterministicIndex(item, options.length)]!;
}

function getSmartTitle(
  item: EnhanceableItem,
  age: number,
  country: LaunchCountry,
  interests: readonly string[],
  goals: readonly string[],
): string {
  const key = categoryKey(item);
  if (!key) return item.activity;

  const countryMap = TITLE_MAPPINGS[country] ?? TITLE_MAPPINGS.US;
  const options = countryMap[key];
  if (!options?.length) return item.activity;

  // Keep infant/toddler labels simpler — only swap generic STEM/play phrasing.
  if (age <= 3 && key === "study") return item.activity;

  const genericRe =
    /\b(stem|activity|homework|study|outdoor play|creative play|free play|learning block|sport|exercise)\b/i;
  if (!genericRe.test(item.activity) && item.activity.length > 12) {
    return item.activity;
  }

  return pickTitle(options, item, interests, goals);
}

function getSmartDescription(
  item: EnhanceableItem,
  age: number,
  country: LaunchCountry,
): string {
  const key = categoryKey(item);
  if (!key) return item.description ?? "";

  if (country === "IN" && key === "study") {
    return "Focus on school-aligned concepts with light parent guidance";
  }
  if (country === "AE" && (key === "play" || key === "outdoor")) {
    return "Heat-safe indoor activity to keep energy balanced";
  }
  if (country === "US" && key === "study" && age >= 5) {
    return "Short, focused practice — celebrate effort over perfection";
  }
  if (country === "UK" && key === "study") {
    return "Homework first — calm table, steady pace, parent nearby if needed";
  }
  if (key === "reading") {
    return age <= 5
      ? "Shared reading builds vocabulary and connection"
      : "Daily reading for pleasure — child picks the book";
  }
  if (key === "play" && age <= 5) {
    return "Child-led play with you nearby — process over outcome";
  }

  return item.description ?? "";
}

function getLinkedModules(item: EnhanceableItem): string[] {
  const cat = (item.category ?? "").toLowerCase();
  const modules = MODULE_LINKS[cat] ?? MODULE_LINKS[categoryKey(item) ?? ""] ?? [];
  return [...modules];
}

function primaryParentHubTopic(modules: readonly string[]): string | undefined {
  const first = modules[0];
  if (!first) return undefined;
  return PARENT_HUB_TOPIC_BY_MODULE[first];
}

/**
 * Enrich routine items with contextual titles, descriptions, and module links.
 * Does not modify time, duration, category, or notes.
 */
export function enhanceActivities<T extends EnhanceableItem>(
  items: T[],
  context: ActivityEnhancerContext,
): T[] {
  const country = normalizeCountry(context.country);
  const interests = context.interests ?? [];
  const goals = context.goals ?? [];
  const age = context.age;

  return items.map((item) => {
    if (!isEnrichable(item)) return item;

    const linkedModules = getLinkedModules(item);
    const description = getSmartDescription(item, age, country);
    const activity = getSmartTitle(item, age, country, interests, goals);

    const enhanced: T = {
      ...item,
      activity,
      ...(description ? { description } : {}),
      ...(linkedModules.length > 0 ? { linkedModules: [...linkedModules] } : {}),
    };

    if (!enhanced.parentHubTopic && linkedModules.length > 0) {
      const topic = primaryParentHubTopic(linkedModules);
      if (topic) {
        enhanced.parentHubTopic = topic;
      }
    }

    return enhanced;
  });
}

/** Safe wrapper — returns original items on any failure. */
export function safeEnhanceActivities<T extends EnhanceableItem>(
  items: T[],
  context: ActivityEnhancerContext,
): T[] {
  try {
    return enhanceActivities(items, context);
  } catch (err) {
    console.warn("[routine-intelligence] Activity enhancer failed, using original items", err);
    return items;
  }
}
