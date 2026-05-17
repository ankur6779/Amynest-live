// ─────────────────────────────────────────────────────────────────────────
// Subtle hydration guidance — integrated hints, not recurring water blocks.
// ─────────────────────────────────────────────────────────────────────────

import type { EnvLevel, EnvironmentalContext } from "./types.js";

export const HYDRATION_ACTIVITY_HINT =
  "Offer water during or after this activity";

export const MAX_STANDALONE_HYDRATION_BLOCKS = 2;

export type EnrichableItemWithHydration = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes?: string;
  hydration?: string;
  [extra: string]: unknown;
};

const OUTDOOR_CATEGORIES = new Set(["outdoor", "outdoor_play"]);
const OUTDOOR_RE =
  /\b(outdoor|park|playground|walk|nature|garden|cricket|evening outdoor|light outdoor)\b/i;
const PLAY_CATEGORIES = new Set(["play", "outdoor", "outdoor_play", "exercise", "sport", "activity"]);
const STUDY_CATEGORIES = new Set(["learning", "study", "homework", "academic"]);
const STUDY_RE = /\b(study|homework|tuition|learn|reading)\b/i;
const HYDRATION_BLOCK_RE = /\b(water break|hydration break|quick water)\b/i;

function timeToMins(t: string): number {
  const [h, m] = t.split(":").map((s) => parseInt(s, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

function minsToTime(mins: number): string {
  const safe = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function isHotTemperature(temp: number | null | undefined): boolean {
  return temp != null && temp > 35;
}

function isOutdoor(item: EnrichableItemWithHydration): boolean {
  if (OUTDOOR_CATEGORIES.has(item.category.toLowerCase())) return true;
  return OUTDOOR_RE.test(item.activity);
}

function isPlayOrActive(item: EnrichableItemWithHydration): boolean {
  const cat = item.category.toLowerCase();
  if (PLAY_CATEGORIES.has(cat)) return true;
  return /\b(play|sport|exercise)\b/i.test(item.activity);
}

function isStudy(item: EnrichableItemWithHydration): boolean {
  const cat = item.category.toLowerCase();
  if (STUDY_CATEGORIES.has(cat)) return true;
  return STUDY_RE.test(item.activity);
}

function alreadyHasHydrationGuidance(item: EnrichableItemWithHydration): boolean {
  if (item.hydration?.trim()) return true;
  const notes = item.notes ?? "";
  return /offer water|hydration need|rehydrate|drink water/i.test(notes);
}

export function attachHydrationHint<T extends EnrichableItemWithHydration>(
  item: T,
  hint: string = HYDRATION_ACTIVITY_HINT,
): T {
  if (alreadyHasHydrationGuidance(item)) return item;
  return { ...item, hydration: hint };
}

function needsHydrationAwareness(ctx: EnvironmentalContext): boolean {
  return (
    ctx.hydrationNeeded ||
    ctx.hydrationNeedLevel === "high" ||
    ctx.hydrationNeedLevel === "extreme" ||
    isHotTemperature(ctx.temperatureC ?? ctx.snapshot.temperatureC)
  );
}

/** Attach hydration hints to play / outdoor / study when hot or high need. */
export function annotateHydrationOnActivities<T extends EnrichableItemWithHydration>(
  items: T[],
  ctx: EnvironmentalContext,
): T[] {
  const temp = ctx.temperatureC ?? ctx.snapshot.temperatureC;
  const hot = isHotTemperature(temp);
  const highNeed =
    ctx.hydrationNeedLevel === "high" || ctx.hydrationNeedLevel === "extreme";

  if (!hot && !highNeed && !ctx.hydrationNeeded) return items;

  return items.map((item) => {
    if (alreadyHasHydrationGuidance(item)) return item;
    if (HYDRATION_BLOCK_RE.test(item.activity)) return item;

    if (isOutdoor(item) || (hot && (isPlayOrActive(item) || isStudy(item)))) {
      return attachHydrationHint(item);
    }
    if (highNeed && isPlayOrActive(item)) {
      return attachHydrationHint(item);
    }
    return item;
  });
}

/** Max 2 short blocks — only immediately before / after outdoor (not on hot-only days). */
export function buildOutdoorAdjacentHydrationBlocks(
  items: EnrichableItemWithHydration[],
  ctx: EnvironmentalContext,
): EnrichableItemWithHydration[] {
  const temp = ctx.temperatureC ?? ctx.snapshot.temperatureC;
  if (isHotTemperature(temp)) return [];

  if (!needsHydrationAwareness(ctx)) return [];

  const outdoorItems = items.filter(isOutdoor);
  if (outdoorItems.length === 0) return [];

  const first = outdoorItems[0]!;
  const last = outdoorItems[outdoorItems.length - 1]!;
  const blocks: EnrichableItemWithHydration[] = [];

  const beforeStart = Math.max(timeToMins(first.time) - 8, 6 * 60);
  blocks.push({
    time: minsToTime(beforeStart),
    activity: "Quick water break",
    duration: 5,
    category: "hydration",
    notes: "Offer water before outdoor time.",
  });

  if (outdoorItems.length > 0 && blocks.length < MAX_STANDALONE_HYDRATION_BLOCKS) {
    const afterStart = timeToMins(last.time) + (last.duration ?? 20);
    blocks.push({
      time: minsToTime(afterStart),
      activity: "Quick water break",
      duration: 5,
      category: "hydration",
      notes: "Rehydrate after outdoor activity.",
    });
  }

  return blocks.slice(0, MAX_STANDALONE_HYDRATION_BLOCKS);
}

export function buildHydrationSummary(ctx: EnvironmentalContext): string | null {
  const temp = ctx.temperatureC ?? ctx.snapshot.temperatureC;
  if (!needsHydrationAwareness(ctx)) return null;
  if (isHotTemperature(temp)) {
    return "Encourage regular water intake throughout the day due to heat.";
  }
  if (ctx.hydrationNeedLevel === "extreme" || ctx.hydrationNeedLevel === "high") {
    return "Encourage steady hydration today — offer water with meals and active play.";
  }
  if (ctx.hydrationNeeded) {
    return "Encourage regular water intake today based on today's conditions.";
  }
  return null;
}

function mergeChronological(
  items: EnrichableItemWithHydration[],
  inserts: EnrichableItemWithHydration[],
): EnrichableItemWithHydration[] {
  if (inserts.length === 0) return items;
  const all = [...items, ...inserts];
  all.sort((a, b) => timeToMins(a.time) - timeToMins(b.time));
  return all;
}

export type HydrationGuidanceResult<T> = {
  items: T[];
  hydrationSummary: string | null;
  standaloneBlocks: number;
};

/** Full hydration pass for environmental enrichments. */
export function applyHydrationGuidance<T extends EnrichableItemWithHydration>(
  items: T[],
  ctx: EnvironmentalContext,
): HydrationGuidanceResult<T> {
  let next = annotateHydrationOnActivities(items, ctx);
  const standalone = buildOutdoorAdjacentHydrationBlocks(next, ctx);
  if (standalone.length > 0) {
    next = mergeChronological(next, standalone) as T[];
  }
  return {
    items: next,
    hydrationSummary: buildHydrationSummary(ctx),
    standaloneBlocks: standalone.length,
  };
}

/** Map pipeline state → guidance for api-server weather pass. */
export type HydrationWeatherInput = {
  temperatureC?: number | null;
  hydrationNeedLevel?: EnvLevel;
  requireHydrationHints?: boolean;
};

export function applyHydrationHintsForWeather<T extends EnrichableItemWithHydration>(
  items: T[],
  input: HydrationWeatherInput,
): T[] {
  const hot = isHotTemperature(input.temperatureC);
  if (!input.requireHydrationHints && !hot) return items;

  return items.map((item) => {
    if (alreadyHasHydrationGuidance(item)) return item;
    if (HYDRATION_BLOCK_RE.test(item.activity)) return item;
    if (isOutdoor(item) || (hot && (isPlayOrActive(item) || isStudy(item)))) {
      return attachHydrationHint(item);
    }
    return item;
  });
}
