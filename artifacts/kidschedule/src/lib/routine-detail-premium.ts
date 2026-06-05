/**
 * Routine detail — category accents, anchor detection, trust ribbon signals.
 * UI-only; reads saved routine items + adaptations (no backend changes).
 */
import {
  formatMinutesUntil,
  formatRoutineTime,
  isSleepRoutineItem,
  parseRoutineTimeToMinutes,
} from "@/lib/routine-timeline-ui";

export type RoutineCategoryVisual = {
  badge: string;
  accentBorder: string;
  surface: string;
};

const DEFAULT_VISUAL: RoutineCategoryVisual = {
  badge: "bg-white/[0.06] text-foreground/90 border-white/[0.12]",
  accentBorder: "border-l-white/15",
  surface: "bg-[rgba(18,28,60,0.45)]",
};

const MEAL_VISUAL: RoutineCategoryVisual = {
  badge: "bg-amber-500/15 text-amber-200 border-amber-500/35",
  accentBorder: "border-l-amber-400",
  surface: "bg-amber-500/[0.04]",
};

const SLEEP_VISUAL: RoutineCategoryVisual = {
  badge: "bg-indigo-500/15 text-indigo-200 border-indigo-500/35",
  accentBorder: "border-l-indigo-400",
  surface: "bg-indigo-500/[0.05]",
};

const SCHOOL_VISUAL: RoutineCategoryVisual = {
  badge: "bg-sky-500/15 text-sky-200 border-sky-500/35",
  accentBorder: "border-l-sky-400",
  surface: "bg-sky-500/[0.04]",
};

const PLAY_VISUAL: RoutineCategoryVisual = {
  badge: "bg-emerald-500/15 text-emerald-200 border-emerald-500/35",
  accentBorder: "border-l-emerald-400",
  surface: "bg-emerald-500/[0.04]",
};

const STUDY_VISUAL: RoutineCategoryVisual = {
  badge: "bg-violet-500/15 text-violet-200 border-violet-500/35",
  accentBorder: "border-l-violet-400",
  surface: "bg-violet-500/[0.04]",
};

function isOutdoorLike(category: string, activity: string): boolean {
  const cat = category.toLowerCase();
  const act = activity.toLowerCase();
  return (
    cat === "outdoor" ||
    /\b(outdoor|park|playground|outing|backyard|cricket|walk)\b/i.test(act)
  );
}

function isPlayLike(category: string): boolean {
  const cat = category.toLowerCase();
  return cat === "play" || cat === "physical" || cat === "exercise";
}

function isStudyLike(category: string, activity: string): boolean {
  const cat = category.toLowerCase();
  return (
    cat === "study" ||
    cat === "homework" ||
    /\b(study|homework|learning|revision)\b/i.test(activity)
  );
}

export function resolveRoutineCategoryVisual(
  category: string,
  activity: string,
): RoutineCategoryVisual {
  const cat = (category ?? "").toLowerCase();

  if (cat === "meal" || cat === "tiffin") {
    if (/\bdinner\b/i.test(activity)) return MEAL_VISUAL;
    return MEAL_VISUAL;
  }
  if (cat === "sleep" || cat === "wind-down" || isSleepRoutineItem(category, activity)) {
    return SLEEP_VISUAL;
  }
  if (cat === "school") return SCHOOL_VISUAL;
  if (isStudyLike(category, activity)) return STUDY_VISUAL;
  if (isOutdoorLike(category, activity) || isPlayLike(cat)) return PLAY_VISUAL;

  return DEFAULT_VISUAL;
}

export function isDinnerAnchorItem(category: string, activity: string): boolean {
  const cat = (category ?? "").toLowerCase();
  return cat === "meal" && /\bdinner\b/i.test(activity);
}

export function isBedtimeAnchorItem(category: string, activity: string): boolean {
  return isSleepRoutineItem(category, activity);
}

export type DinnerFoodChipSource = {
  notes?: string;
  meal?: string;
  recipe?: { ingredients?: string[] };
  dishes?: string[];
};

/** Up to 2 short food labels for dinner anchor chips. */
export function extractDinnerFoodChips(item: DinnerFoodChipSource): string[] {
  if (item.dishes?.length) {
    return item.dishes
      .map((d) => d.trim())
      .filter(Boolean)
      .slice(0, 2);
  }
  if (item.notes?.includes("Options:")) {
    const raw = item.notes.split("Options:")[1]?.split(".")[0] ?? "";
    return raw
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 2)
      .map(shortFoodLabel);
  }
  if (item.recipe?.ingredients?.length) {
    return item.recipe.ingredients
      .map((s) => shortFoodLabel(s))
      .filter(Boolean)
      .slice(0, 2);
  }
  if (item.meal && item.meal !== "Dinner") {
    return [item.meal];
  }
  return [];
}

function shortFoodLabel(label: string): string {
  const trimmed = label.trim();
  if (trimmed.length <= 24) return trimmed;
  const first = trimmed.split(/[,;]/)[0]?.trim();
  return first && first.length <= 24 ? first : trimmed.slice(0, 22) + "…";
}

const WEATHER_ADAPT_RE =
  /\b(weather|heat|rain|aqi|outdoor|indoor|monsoon|dust|cold|hot day|heat-safe|heatwave)\b/i;

export type TrustRibbonItem = {
  id: string;
  label: string;
};

export function buildRoutineTrustRibbonSignals(opts: {
  items: Array<{ category?: string; activity: string; notes?: string }>;
  adaptations?: readonly string[] | null;
}): TrustRibbonItem[] {
  const signals: TrustRibbonItem[] = [];
  const { items, adaptations } = opts;

  const hasDinner = items.some((it) =>
    isDinnerAnchorItem(it.category ?? "", it.activity),
  );
  if (hasDinner) {
    signals.push({ id: "dinner", label: "Dinner protected" });
  }

  const hasBedtime = items.some((it) =>
    isBedtimeAnchorItem(it.category ?? "", it.activity),
  );
  if (hasBedtime) {
    signals.push({ id: "bedtime", label: "Bedtime safe" });
  }

  const adaptBlob = (adaptations ?? []).join(" ");
  const notesBlob = items.map((it) => it.notes ?? "").join(" ");
  if (WEATHER_ADAPT_RE.test(adaptBlob) || WEATHER_ADAPT_RE.test(notesBlob)) {
    signals.push({ id: "weather", label: "Weather adapted" });
  }

  return signals;
}

const MORNING_END_MINS = 12 * 60;
const AFTERNOON_END_MINS = 17 * 60;

export type DayArcChip = {
  id: string;
  emoji: string;
  label: string;
  emphasis?: boolean;
};

export type MealOptionPillSource = DinnerFoodChipSource;

export function isMealRoutineItem(category: string): boolean {
  const cat = (category ?? "").toLowerCase();
  return cat === "meal" || cat === "tiffin";
}

/** Up to 3 meal option pills from notes, dishes, or recipe. */
export function extractMealOptionPills(
  item: MealOptionPillSource,
  max = 3,
): string[] {
  if (item.dishes?.length) {
    return item.dishes
      .map((d) => d.trim())
      .filter(Boolean)
      .slice(0, max)
      .map(shortFoodLabel);
  }
  if (item.notes?.includes("Options:")) {
    const raw = item.notes.split("Options:")[1]?.split(".")[0] ?? "";
    return raw
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, max)
      .map(shortFoodLabel);
  }
  if (item.recipe?.ingredients?.length) {
    return item.recipe.ingredients
      .map((s) => shortFoodLabel(s))
      .filter(Boolean)
      .slice(0, max);
  }
  if (item.meal) {
    return [shortFoodLabel(item.meal)];
  }
  return [];
}

function shortActivityLabel(activity: string, maxLen = 22): string {
  const trimmed = activity.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen - 1) + "…";
}

function findWindDownAnchorMins(
  items: Array<{ time: string; activity: string; category?: string }>,
): number {
  for (const it of items) {
    const cat = (it.category ?? "").toLowerCase();
    if (cat === "wind-down" || /\bwind[\s-]?down\b/i.test(it.activity)) {
      const mins = parseRoutineTimeToMinutes(it.time);
      if (mins >= 0) return mins;
    }
  }
  return -1;
}

function findNextMilestoneMins(
  items: Array<{ time: string; activity: string; category?: string }>,
  nowMins: number,
): { mins: number; kind: "wind-down" | "dinner" | "bedtime" } | null {
  const windDown = findWindDownAnchorMins(items);
  if (windDown > nowMins) {
    return { mins: windDown, kind: "wind-down" };
  }

  const dinner = items.find((it) =>
    isDinnerAnchorItem(it.category ?? "", it.activity),
  );
  if (dinner) {
    const dm = parseRoutineTimeToMinutes(dinner.time);
    if (dm > nowMins) return { mins: dm, kind: "dinner" };
  }

  const bedtime = items.find((it) =>
    isBedtimeAnchorItem(it.category ?? "", it.activity),
  );
  if (bedtime) {
    const bm = parseRoutineTimeToMinutes(bedtime.time);
    if (bm > nowMins) return { mins: bm, kind: "bedtime" };
  }

  return null;
}

/** Day arc strip: Morning · Now · Wind-down milestone (max 3 chips). */
export function buildDayArcSegments(opts: {
  items: Array<{
    time: string;
    activity: string;
    category?: string;
    status?: string;
  }>;
  nowMins: number;
  dateMode: "past" | "today" | "future";
  currentActivity?: string;
}): DayArcChip[] {
  const { items, nowMins, dateMode, currentActivity } = opts;

  if (dateMode === "past") {
    return [{ id: "complete", emoji: "✓", label: "Day complete" }];
  }

  if (dateMode === "future") {
    const first = items.find((it) => parseRoutineTimeToMinutes(it.time) >= 0);
    return [
      {
        id: "scheduled",
        emoji: "📅",
        label: first ? `Starts ${first.time}` : "Scheduled",
      },
    ];
  }

  const chips: DayArcChip[] = [];

  const morningItems = items.filter(
    (it) => parseRoutineTimeToMinutes(it.time) < MORNING_END_MINS,
  );
  const morningDone =
    morningItems.length > 0 &&
    morningItems.every(
      (it) => it.status === "completed" || it.status === "skipped",
    );

  if (nowMins >= MORNING_END_MINS || morningDone) {
    chips.push({ id: "morning", emoji: "🌅", label: "Morning complete" });
  } else {
    chips.push({ id: "morning", emoji: "🌅", label: "Morning", emphasis: true });
  }

  if (currentActivity) {
    chips.push({
      id: "now",
      emoji: "☀️",
      label: `Now: ${shortActivityLabel(currentActivity)}`,
      emphasis: true,
    });
  } else if (nowMins >= AFTERNOON_END_MINS) {
    chips.push({ id: "phase", emoji: "🌆", label: "Evening", emphasis: true });
  } else if (nowMins >= MORNING_END_MINS) {
    chips.push({ id: "phase", emoji: "☀️", label: "Afternoon", emphasis: true });
  }

  const milestone = findNextMilestoneMins(items, nowMins);
  if (milestone) {
    const delta = milestone.mins - nowMins;
    const prefix =
      milestone.kind === "dinner"
        ? "Dinner"
        : milestone.kind === "bedtime"
          ? "Bedtime"
          : "Wind-down";
    chips.push({
      id: milestone.kind,
      emoji: milestone.kind === "dinner" ? "🍽" : "🌙",
      label: `${prefix} in ${formatMinutesUntil(delta)}`,
    });
  }

  return chips.slice(0, 3);
}

export type ShareCardTimelineRow = {
  time: string;
  activity: string;
  duration: number;
};

/** Clean timeline rows for caregiver share card (no notes). */
export function buildShareCardTimeline(
  items: Array<{ time: string; activity: string; duration?: number }>,
  max = 14,
): ShareCardTimelineRow[] {
  return items.slice(0, max).map((it) => ({
    time: formatRoutineTime(it.time),
    activity: it.activity,
    duration: it.duration ?? 30,
  }));
}

/** Short meal labels for share card footer. */
export function buildShareCardMealSummary(
  items: Array<{ category?: string; activity: string }>,
  max = 4,
): string[] {
  const labels: string[] = [];
  for (const it of items) {
    if (!isMealRoutineItem(it.category ?? "")) continue;
    const label = it.activity.trim();
    if (!label || labels.includes(label)) continue;
    labels.push(label);
    if (labels.length >= max) break;
  }
  return labels;
}

/** Up to 3 adaptation chips for post-generate reveal (evidence-backed only). */
export function buildRevealHighlightChips(
  adaptations?: readonly string[] | null,
  max = 3,
): string[] {
  return (adaptations ?? [])
    .map((a) => a.trim())
    .filter(Boolean)
    .slice(0, max)
    .map((a) => (a.length > 42 ? `${a.slice(0, 40)}…` : a));
}
