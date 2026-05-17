/**
 * Canonical schedule categories for adjacency, audit alignment, and energy shaping.
 */
import type { RoutineScheduleItem } from "./routine-scheduler.js";
import { minsToTime24, normalizeTo24h, parseTimeToMins } from "./routine-scheduler.js";

export type ScheduleCategory =
  | "meal"
  | "physical"
  | "creative"
  | "cognitive_light"
  | "social"
  | "event"
  | "learning"
  | "school"
  | "rest"
  | "wind-down"
  | "sleep"
  | "general";

export const CATEGORY_DISTANCE: Record<string, ScheduleCategory[]> = {
  creative: ["physical", "cognitive_light", "social"],
  physical: ["creative", "social", "cognitive_light"],
  cognitive: ["physical", "creative", "social"],
  cognitive_light: ["creative", "social", "physical"],
  social: ["cognitive_light", "creative", "physical"],
  learning: ["creative", "social", "cognitive_light"],
  play: ["creative", "social", "cognitive_light"],
  family: ["social", "cognitive_light", "creative"],
  outdoor: ["cognitive_light", "social", "creative"],
};

const REPLACEMENT_BY_CATEGORY: Record<
  ScheduleCategory,
  { activity: string; category: string; energyImpact?: string }
> = {
  meal: { activity: "Snack break", category: "meal" },
  physical: { activity: "Quiet indoor play", category: "cognitive_light", energyImpact: "low" },
  creative: { activity: "Family chat time", category: "social", energyImpact: "low" },
  cognitive_light: { activity: "Calm play together", category: "social", energyImpact: "low" },
  social: { activity: "Puzzles or calm games", category: "cognitive_light", energyImpact: "low" },
  event: { activity: "Quiet time", category: "rest", energyImpact: "low" },
  learning: { activity: "Creative activity", category: "creative", energyImpact: "medium" },
  school: { activity: "Quiet time", category: "rest", energyImpact: "low" },
  rest: { activity: "Creative activity", category: "creative", energyImpact: "low" },
  "wind-down": { activity: "Quiet time", category: "rest", energyImpact: "low" },
  sleep: { activity: "Quiet time", category: "rest", energyImpact: "low" },
  general: { activity: "Quiet indoor time", category: "cognitive_light", energyImpact: "low" },
};

const EVENING_ENERGY_CUTOFF_MINS = 18 * 60 + 30;

export function isOutdoorActivityLabel(text: string): boolean {
  if (/indoor|air-safe|board games|breathing-safe|hydration break/i.test(text)) {
    return false;
  }
  return /outdoor|park|cricket|walk|playground|evening outdoor|light outdoor|nature|backyard/i.test(
    text,
  );
}

/** Audit-aligned category — uses normalized `category` + activity hints; never maps dinner to family. */
export function getScheduleCategory(item: RoutineScheduleItem): ScheduleCategory {
  if (item.culturalTag === "special_event" || item.activitySource === "special") {
    return "event";
  }
  const cat = (item.category ?? "").toLowerCase();
  const act = (item.activity ?? "").toLowerCase();

  if (cat === "event") return "event";
  if (cat === "school" || /\bat school\b/i.test(act)) return "school";
  if (/lights out|sleep/i.test(act) || cat === "sleep") return "sleep";
  if (cat === "wind-down" || /\b(wind.?down|bedtime story)\b/i.test(act)) return "wind-down";

  if (
    cat === "meal" ||
    cat === "tiffin" ||
    /\b(breakfast|lunch|dinner|drunch|refuel|snack|tiffin)\b/i.test(act)
  ) {
    return "meal";
  }

  if (
    cat === "physical" ||
    cat === "outdoor" ||
    cat === "exercise" ||
    isOutdoorActivityLabel(act) ||
    /\b(soccer|football|sport|training|cricket)\b/i.test(act)
  ) {
    return "physical";
  }

  if (
    cat === "social" ||
    (/\bfamily\b/i.test(act) && !/\bdinner\b/i.test(act) && !/\blunch\b/i.test(act))
  ) {
    return "social";
  }

  if (
    cat === "cognitive_light" ||
    /\b(quiet|calm|indoor play|puzzle|reading corner)\b/i.test(act)
  ) {
    return "cognitive_light";
  }

  if (
    cat === "creative" ||
    /\b(creative|craft|drawing|lego|project at home)\b/i.test(act)
  ) {
    return "creative";
  }

  if (cat === "study" || /\b(homework|tuition|learning|music class)\b/i.test(act)) {
    return "learning";
  }

  if (cat === "play" || /\bplay\b/i.test(act)) return "creative";

  if (cat === "family") return "social";
  if (cat === "rest") return "rest";

  return "general";
}

export function isProtectedScheduleBlock(item: RoutineScheduleItem): boolean {
  return (
    item.locked === true ||
    item.activitySource === "fixed" ||
    item.activitySource === "special" ||
    item.culturalTag === "fixed_recurring" ||
    item.culturalTag === "special_event" ||
    getScheduleCategory(item) === "school" ||
    getScheduleCategory(item) === "meal" ||
    getScheduleCategory(item) === "event" ||
    getScheduleCategory(item) === "sleep" ||
    getScheduleCategory(item) === "wind-down"
  );
}

/** Normalize `category` on generated blocks for consistent adjacency rules. */
export function normalizeScheduleItemCategory(
  item: RoutineScheduleItem,
): RoutineScheduleItem {
  if (isProtectedScheduleBlock(item)) return item;

  const sched = getScheduleCategory(item);
  const act = item.activity.toLowerCase();

  let category = item.category ?? "general";
  switch (sched) {
    case "meal":
      category = "meal";
      break;
    case "physical":
      category = "physical";
      break;
    case "creative":
      category = "creative";
      break;
    case "cognitive_light":
      category = "cognitive_light";
      break;
    case "social":
      category = "social";
      break;
    case "learning":
      category = "study";
      break;
    default:
      break;
  }

  if (/\bdinner\b/i.test(act) || /\blunch\b/i.test(act) || /\bbreakfast\b/i.test(act)) {
    category = "meal";
  }

  return category === item.category ? item : { ...item, category };
}

export function normalizeScheduleCategories(
  items: RoutineScheduleItem[],
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];
  const out = items.map((it) => {
    const next = normalizeScheduleItemCategory(it);
    if (next.category !== it.category) {
      adjustments.push(`normalized category "${it.activity}" → ${next.category}`);
    }
    return next;
  });
  return { items: out, adjustments };
}

export function inferBlockEnergyLevel(
  item: RoutineScheduleItem,
): "high" | "medium" | "low" {
  const impact = (item.energyImpact ?? "").toLowerCase();
  if (/high|active|vigorous/i.test(impact)) return "high";
  if (/low|calm|quiet|rest/i.test(impact)) return "low";

  const sched = getScheduleCategory(item);
  const act = item.activity.toLowerCase();
  if (sched === "physical" && isOutdoorActivityLabel(act)) return "high";
  if (/\b(soccer|football|training|sport|run)\b/i.test(act)) return "high";
  if (sched === "cognitive_light" || sched === "rest" || sched === "wind-down") {
    return "low";
  }
  if (sched === "social" && /\bcalm\b/i.test(act)) return "low";
  return "medium";
}

export function downgradeHighEnergyBlock(
  item: RoutineScheduleItem,
  rainMode?: boolean,
): RoutineScheduleItem {
  const sched = getScheduleCategory(item);
  if (rainMode && (sched === "creative" || sched === "physical")) {
    return {
      ...item,
      activity: "Quiet indoor play",
      category: "cognitive_light",
      energyImpact: "low",
    };
  }
  if (sched === "physical") {
    return {
      ...item,
      activity: "Light indoor movement",
      category: "cognitive_light",
      energyImpact: "medium",
    };
  }
  return {
    ...item,
    activity: "Calm family time",
    category: "social",
    energyImpact: "low",
  };
}

export type EnergyCurveOpts = {
  rainMode?: boolean;
};

/** After 18:30, no high-energy blocks — downgrade in place. */
export function enforceEnergyCurve(
  items: RoutineScheduleItem[],
  opts: EnergyCurveOpts = {},
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];
  const out = items.map((it) => {
    if (isProtectedScheduleBlock(it)) return it;
    const start = parseTimeToMins(normalizeTo24h(it.time));
    if (start < EVENING_ENERGY_CUTOFF_MINS) return it;
    if (inferBlockEnergyLevel(it) !== "high") return it;
    adjustments.push(`downgraded evening energy for "${it.activity}"`);
    return downgradeHighEnergyBlock(it, opts.rainMode);
  });
  return { items: out, adjustments };
}

export type CategoryReplacementOpts = {
  rainMode?: boolean;
  usedActivities?: Set<string>;
  /** Schedule categories that must not be used for the replacement result. */
  avoidCategories?: ScheduleCategory[];
};

function templateScheduleCategory(template: {
  activity: string;
  category: string;
}): ScheduleCategory {
  return getScheduleCategory({
    time: "12:00",
    activity: template.activity,
    category: template.category,
    duration: 30,
    status: "pending",
  });
}

export function pickDistantCategoryReplacement(
  bucket: ScheduleCategory | string,
  opts: CategoryReplacementOpts = {},
): { activity: string; category: string; energyImpact?: string } | null {
  const used = opts.usedActivities ?? new Set<string>();
  const avoid = new Set<ScheduleCategory>([
    bucket as ScheduleCategory,
    ...(opts.avoidCategories ?? []),
  ]);
  const distances = CATEGORY_DISTANCE[bucket] ?? ["cognitive_light", "social", "physical"];

  const candidates: ScheduleCategory[] = opts.rainMode
    ? distances.filter((c) => c !== "creative" && c !== "physical").concat(["social", "cognitive_light"])
    : distances;

  for (const target of candidates) {
    if (avoid.has(target)) continue;
    const template = REPLACEMENT_BY_CATEGORY[target];
    if (!template) continue;
    if (opts.rainMode && template.category === "creative") continue;
    const resultCat = templateScheduleCategory(template);
    if (avoid.has(resultCat)) continue;
    if (!used.has(template.activity.toLowerCase())) {
      return template;
    }
  }

  const rainFallback = REPLACEMENT_BY_CATEGORY.social;
  const fallback = opts.rainMode ? rainFallback : REPLACEMENT_BY_CATEGORY.social;
  if (fallback && !avoid.has(templateScheduleCategory(fallback))) {
    return fallback;
  }
  for (const key of Object.keys(REPLACEMENT_BY_CATEGORY) as ScheduleCategory[]) {
    const template = REPLACEMENT_BY_CATEGORY[key];
    if (!template) continue;
    const resultCat = templateScheduleCategory(template);
    if (avoid.has(resultCat)) continue;
    if (!used.has(template.activity.toLowerCase())) return template;
  }
  return null;
}

export function isOutdoorPhysicalBlock(item: RoutineScheduleItem): boolean {
  return (
    getScheduleCategory(item) === "physical" &&
    isOutdoorActivityLabel(item.activity)
  );
}

export function createLowEnergyBlock(
  startMins: number,
  endMins: number,
  rainMode?: boolean,
): RoutineScheduleItem {
  const duration = Math.max(10, Math.min(30, endMins - startMins));
  return {
    time: minsToTime24(startMins),
    activity: rainMode ? "Quiet indoor play together" : "Calm family time",
    duration,
    category: rainMode ? "cognitive_light" : "social",
    status: "pending",
    energyImpact: "low",
    notes: "Light post-dinner continuity block.",
  };
}

export function createLowEnergyIndoorAlternative(
  item: RoutineScheduleItem,
  rainMode?: boolean,
): RoutineScheduleItem {
  return {
    ...item,
    activity: rainMode ? "Quiet creative indoor time" : "Indoor calm play",
    category: "cognitive_light",
    duration: Math.min(item.duration ?? 30, 30),
    energyImpact: "low",
  };
}
