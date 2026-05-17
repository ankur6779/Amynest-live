/**
 * Age-aware feeding and soft-meal logic for routine + meal integration.
 * Branches before country/fridge meal logic for infants and toddlers.
 */
import type { AgeBand } from "./meal-safety.js";
import {
  minsToTime24,
  parseTimeToMins,
  type RoutineScheduleItem,
} from "./routine-scheduler.js";

/** Feeding-focused age groups used by routine meal integration. */
export type FeedingAgeGroup =
  | "infant_0_6"
  | "infant_6_12"
  | "toddler"
  | "child";

export type InfantMilkType = "breast_milk" | "formula";

export type RoutineBlockType = "feeding" | "feeding_optional";

export const ON_DEMAND_FEEDING_NOTE =
  "On-demand feeding — times are approximate; follow baby's hunger cues.";

export type AgeFeedingOpts = {
  wakeMins?: number;
  sleepMins?: number;
  ageInMonths?: number;
  feedingType?: "breastfeeding" | "formula" | "mixed";
  seed?: number;
};

const GAP_MINS = 10;

const ADULT_MEAL_RE =
  /\b(breakfast|lunch|dinner|snack|drunch|tiffin|quick meal before school)\b/i;

const ADULT_ACTIVITY_RE =
  /\b(tuition|homework|revision|study time|at school|school day|football club|soccer practice)\b/i;

const HEAVY_OR_HARD_RE =
  /\b(fried|deep.?fried|nugget|taco|mac & cheese|biryani|steak|crispy|chips|burger|pizza)\b/i;

const INFANT_CARE_BLOCKS: ReadonlyArray<{
  activity: string;
  category: string;
  durationRange: readonly [number, number];
  notes?: string;
}> = [
  {
    activity: "Morning care & diaper change",
    category: "hygiene",
    durationRange: [15, 25],
    notes: "Calm diaper change and fresh clothes. Narrate softly to baby.",
  },
  {
    activity: "Tummy time",
    category: "play",
    durationRange: [10, 20],
    notes: "Firm surface only; always supervised. Stop if baby fusses.",
  },
  {
    activity: "Sensory play",
    category: "play",
    durationRange: [15, 25],
    notes: "Rattles, high-contrast cards, soft textures.",
  },
  {
    activity: "Fresh air / window time",
    category: "play",
    durationRange: [15, 25],
    notes: "Indirect light near a window or short stroller stroll — avoid harsh sun.",
  },
  {
    activity: "Baby massage & bonding",
    category: "play",
    durationRange: [15, 25],
    notes: "Gentle massage with baby-safe oil; sing or hum.",
  },
  {
    activity: "Quiet cuddles",
    category: "rest",
    durationRange: [15, 25],
    notes: "Skin-to-skin or calm holding; watch for sleepy cues.",
  },
  {
    activity: "Evening bath",
    category: "hygiene",
    durationRange: [15, 20],
    notes: "Warm (not hot) water; gentle wash and dry.",
  },
  {
    activity: "Quiet wind-down & lullaby",
    category: "rest",
    durationRange: [15, 25],
    notes: "Dim lights, soft voice — cue that night sleep is coming.",
  },
];

/** WHO-aligned: exclusive milk under 6 months; no country/fridge meals. */
export function getAgeGroup(ageInMonths: number): FeedingAgeGroup {
  const m = Math.max(0, Math.floor(ageInMonths));
  if (m < 6) return "infant_0_6";
  if (m < 12) return "infant_6_12";
  if (m < 36) return "toddler";
  return "child";
}

export function isExclusiveInfantPhase(ageInMonths?: number): boolean {
  return ageInMonths != null && ageInMonths >= 0 && ageInMonths < 6;
}

export function shouldSkipCountryCulture(ageInMonths?: number): boolean {
  return isExclusiveInfantPhase(ageInMonths);
}

export function feedingAgeGroupLabel(group: FeedingAgeGroup): string {
  const labels: Record<FeedingAgeGroup, string> = {
    infant_0_6: "Infant (0–6 months)",
    infant_6_12: "Infant (6–12 months)",
    toddler: "Toddler (1–3 years)",
    child: "Child (4+ years)",
  };
  return labels[group];
}

export function mapFeedingGroupToAgeBand(group: FeedingAgeGroup): AgeBand {
  switch (group) {
    case "infant_0_6":
      return "newborn_0_6m";
    case "infant_6_12":
      return "infant_6_12m";
    case "toddler":
      return "toddler_1_3y";
    default:
      return "school_5_10y";
  }
}

export function isFeedingCategory(category: string): boolean {
  const c = category.toLowerCase();
  return c === "feeding" || c === "feeding_optional";
}

export function isOptionalNightFeed(item: RoutineScheduleItem): boolean {
  return (
    (item as { type?: string }).type === "feeding_optional" ||
    (item.category ?? "").toLowerCase() === "feeding_optional" ||
    /\bnight feeding\b/i.test(item.activity)
  );
}

export function isFeedingBlock(item: RoutineScheduleItem): boolean {
  if (isOptionalNightFeed(item)) return true;
  const cat = (item.category ?? "").toLowerCase();
  if (cat === "feeding") return true;
  return /\b(breastfeed|formula feed|feeding session|milk feed)\b/i.test(item.activity);
}

export function isSoftMealBlock(item: RoutineScheduleItem): boolean {
  return (
    (item.category ?? "").toLowerCase() === "meal" &&
    /\b(soft meal|puree|mash)\b/i.test(item.activity)
  );
}

export function isAdultMealBlock(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  if (cat !== "meal" && cat !== "tiffin") return false;
  if (isSoftMealBlock(item)) return false;
  if (isFeedingBlock(item)) return false;
  return ADULT_MEAL_RE.test(item.activity);
}

export function isAdultActivityPattern(item: RoutineScheduleItem): boolean {
  if (isAdultMealBlock(item)) return true;
  return ADULT_ACTIVITY_RE.test(item.activity);
}

export function resolveInfantMilkType(
  feedingType?: AgeFeedingOpts["feedingType"],
): InfantMilkType {
  if (feedingType === "formula") return "formula";
  return "breast_milk";
}

function feedingActivityLabel(milk: InfantMilkType, index: number): string {
  if (milk === "formula") {
    return index % 2 === 0 ? "Formula feeding" : "Formula bottle feed";
  }
  return index % 2 === 0 ? "Breastfeeding" : "Breastfeeding session";
}

/** Feeding interval in minutes — base for 2–3 hour range (jitter applied separately). */
export function feedingIntervalMins(ageInMonths: number): number {
  if (ageInMonths < 2) return 150;
  if (ageInMonths < 4) return 165;
  return 180;
}

function flexibleFeedIntervalMins(ageInMonths: number, seed: number): number {
  const base = feedingIntervalMins(ageInMonths);
  const jitter = (Math.abs(seed) % 31) - 15;
  return Math.max(120, Math.min(195, base + jitter));
}

function flexibleDuration(range: readonly [number, number], seed: number): number {
  const span = range[1] - range[0];
  return range[0] + (Math.abs(seed) % (span + 1));
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]!;
}

function stripInfantMealFields(
  item: RoutineScheduleItem,
): RoutineScheduleItem {
  const next = { ...item };
  delete next.dishes;
  delete next.meal;
  return next;
}

function makeFeedBlock(
  startMins: number,
  opts: AgeFeedingOpts,
  seed: number,
  optional = false,
): RoutineScheduleItem {
  const milk = resolveInfantMilkType(opts.feedingType);
  const duration = flexibleDuration([15, 25], seed + startMins);
  return {
    time: minsToTime24(startMins),
    activity: optional
      ? "Night feeding (if baby wakes)"
      : feedingActivityLabel(milk, seed),
    duration,
    category: optional ? "feeding_optional" : "feeding",
    type: optional ? "feeding_optional" : "feeding",
    feedingType: milk,
    status: "pending",
    notes: optional
      ? `${ON_DEMAND_FEEDING_NOTE} Offer if baby wakes overnight.`
      : ON_DEMAND_FEEDING_NOTE,
    culturalReason:
      "WHO: exclusive breast milk or infant formula only — no solids before 6 months",
    energyImpact: "midday recharge",
  };
}

function makeCareBlock(
  template: (typeof INFANT_CARE_BLOCKS)[number],
  startMins: number,
  seed: number,
): RoutineScheduleItem {
  return stripInfantMealFields({
    time: minsToTime24(startMins),
    activity: template.activity,
    duration: flexibleDuration(template.durationRange, seed),
    category: template.category,
    status: "pending",
    notes: template.notes,
    culturalReason: "Infant-safe activity for this age",
  });
}

/**
 * Medically realistic 0–6 month day: on-demand feeds (~2–3 h), flexible naps, optional night feeds.
 */
export function buildRealisticInfant0_6Routine(
  opts: AgeFeedingOpts,
): RoutineScheduleItem[] {
  const wakeMins = opts.wakeMins ?? 7 * 60;
  const sleepMins = opts.sleepMins ?? 21 * 60;
  const ageInMonths = opts.ageInMonths ?? 3;
  const seed = opts.seed ?? ageInMonths;

  const feedAnchors: number[] = [wakeMins];
  let t = wakeMins;
  while (t + 120 <= sleepMins - 35 && feedAnchors.length < 10) {
    const interval = flexibleFeedIntervalMins(ageInMonths, seed + feedAnchors.length);
    t += interval;
    if (t <= sleepMins - 30) feedAnchors.push(t);
  }
  while (feedAnchors.length < 7 && feedAnchors[feedAnchors.length - 1]! + 120 <= sleepMins - 30) {
    feedAnchors.push(feedAnchors[feedAnchors.length - 1]! + 120);
  }
  const lastAnchor = feedAnchors[feedAnchors.length - 1]!;
  if (lastAnchor < sleepMins - 25 && sleepMins - 25 - lastAnchor >= 90) {
    feedAnchors.push(sleepMins - 25);
  }

  const timeline: RoutineScheduleItem[] = [];
  let careIndex = 0;

  for (let fi = 0; fi < feedAnchors.length; fi++) {
    const feedAt = feedAnchors[fi]!;
    timeline.push(makeFeedBlock(feedAt, opts, seed + fi));

    if (fi >= feedAnchors.length - 1) break;

    const windowEnd = feedAnchors[fi + 1]!;
    let cursor = feedAt + flexibleDuration([15, 25], seed + fi) + GAP_MINS;

    while (cursor + 25 < windowEnd - 15) {
      if (careIndex % 3 === 2 && windowEnd - cursor >= 55) {
        const napDur = flexibleDuration([45, 120], seed + careIndex);
        timeline.push({
          time: minsToTime24(cursor),
          activity: fi < 3 ? "Morning nap" : "Afternoon nap",
          duration: napDur,
          category: "sleep",
          status: "pending",
          notes: "Nap length varies — follow sleepy cues (about 45–120 min).",
          culturalReason: "Infants need 14–17 hours total sleep per 24 hours",
        });
        cursor += napDur + GAP_MINS;
        careIndex++;
        continue;
      }

      const care = INFANT_CARE_BLOCKS[careIndex % INFANT_CARE_BLOCKS.length]!;
      careIndex++;
      if (/wind-down|bath/i.test(care.activity) && fi < feedAnchors.length - 2) {
        continue;
      }
      const dur = flexibleDuration(care.durationRange, seed + careIndex);
      if (cursor + dur > windowEnd - 10) break;
      timeline.push(makeCareBlock(care, cursor, seed + careIndex));
      cursor += dur + GAP_MINS;
    }
  }

  const windDown = INFANT_CARE_BLOCKS.find((b) => /wind-down/i.test(b.activity))!;
  const bath = INFANT_CARE_BLOCKS.find((b) => /bath/i.test(b.activity))!;
  let preSleep = sleepMins - 55;
  timeline.push(makeCareBlock(bath, preSleep, seed + 50));
  preSleep += flexibleDuration(bath.durationRange, seed + 50) + GAP_MINS;
  timeline.push(makeCareBlock(windDown, preSleep, seed + 51));

  timeline.push({
    time: minsToTime24(sleepMins),
    activity: "Night sleep",
    duration: 30,
    category: "sleep",
    status: "pending",
    notes: "Cool, dark, quiet room. Safe sleep surface (back to sleep).",
    culturalReason: "Primary night sleep block",
  });

  timeline.push(makeFeedBlock(sleepMins + 150, opts, seed + 200, true));
  timeline.push(makeFeedBlock(sleepMins + 330, opts, seed + 201, true));

  return timeline.sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));
}

/** @deprecated Use buildRealisticInfant0_6Routine */
export function buildInfant0_6FeedingTimeline(
  _nonMealItems: RoutineScheduleItem[],
  opts: AgeFeedingOpts,
): RoutineScheduleItem[] {
  return buildRealisticInfant0_6Routine(opts);
}

const SOFT_MEAL_6_12: readonly string[][] = [
  ["Mashed rice + dal", "Fruit puree"],
  ["Soft khichdi (no salt)", "Vegetable mash"],
  ["Banana mash", "Carrot puree"],
  ["Ragi porridge (thin)", "Apple puree"],
  ["Moong dal puree", "Sweet potato mash"],
];

const TODDLER_MEAL_OPTIONS: readonly string[][] = [
  ["Soft roti with dal", "Steamed vegetables"],
  ["Soft rice with vegetables", "Curd"],
  ["Scrambled egg (well cooked)", "Soft fruit pieces"],
  ["Soft idli with sambar", "Banana slices"],
  ["Vegetable khichdi (mild)", "Milk"],
  ["Soft paratha with curd", "Cucumber sticks"],
];

export type AgeFeedingMeta = {
  meal: string;
  dishes: string[];
  culturalReason: string;
  energyImpact: string;
};

export type InfantFeedingMeta = {
  type: RoutineBlockType;
  feedingType: InfantMilkType;
  culturalReason: string;
  energyImpact: string;
};

export function resolveAgeFeedingDishes(
  group: FeedingAgeGroup,
  slot: "feeding" | "soft_meal" | "toddler_meal",
  opts: { seed?: number; ageInMonths?: number; feedingType?: AgeFeedingOpts["feedingType"] } = {},
): AgeFeedingMeta | InfantFeedingMeta {
  if (group === "infant_0_6" && slot === "feeding") {
    return {
      type: "feeding",
      feedingType: resolveInfantMilkType(opts.feedingType),
      culturalReason:
        "Exclusive milk feeding — no solids before 6 months (WHO)",
      energyImpact: "midday recharge",
    };
  }

  const seed = opts.seed ?? 0;
  const months = opts.ageInMonths ?? 8;

  if (slot === "feeding") {
    const label = group === "infant_0_6" ? "Milk feeding" : "Milk feed";
    return {
      meal: label,
      dishes: [
        group === "infant_0_6"
          ? "Breast milk or infant formula only"
          : "Breast milk or formula (primary nutrition)",
      ],
      culturalReason:
        group === "infant_0_6"
          ? "Exclusive milk feeding — no solids before 6 months (WHO)"
          : "Milk remains primary nutrition while introducing soft complementary foods",
      energyImpact: "midday recharge",
    };
  }

  if (group === "infant_6_12" || slot === "soft_meal") {
    const row = pick(SOFT_MEAL_6_12, seed);
    const stage =
      months < 8 ? "smooth puree" : months < 10 ? "soft mash" : "soft finger foods";
    return {
      meal: "Soft meal",
      dishes: row,
      culturalReason: `Age-appropriate ${stage} — no hard solids, salt, or honey`,
      energyImpact: "post-meal light activity",
    };
  }

  const row = pick(TODDLER_MEAL_OPTIONS, seed).filter((d) => !HEAVY_OR_HARD_RE.test(d));
  return {
    meal: "Toddler meal",
    dishes: row.length >= 2 ? row : ["Soft rice with vegetables", "Curd"],
    culturalReason: "Smaller portions and simple textures for toddlers (1–3 years)",
    energyImpact: "post-meal light activity",
  };
}

export function sanitizeInfantCareActivities(
  items: RoutineScheduleItem[],
): RoutineScheduleItem[] {
  const out: RoutineScheduleItem[] = [];
  for (const it of items) {
    if (isAdultMealBlock(it) || isAdultActivityPattern(it)) continue;
    if ((it.category ?? "").toLowerCase() === "school") continue;

    let activity = it.activity;
    if (
      /outdoor|park|playground|stroll|evening walk/i.test(activity) &&
      !/fresh air/i.test(activity)
    ) {
      activity = "Fresh air / window time";
    }

    out.push(
      stripInfantMealFields({
        ...it,
        activity,
        notes: it.notes,
      }),
    );
  }
  return out;
}

/**
 * 6–12 months: milk feeds + soft meals (no breakfast/lunch/dinner).
 */
export function buildInfant6_12FeedingTimeline(
  nonMealItems: RoutineScheduleItem[],
  opts: AgeFeedingOpts,
): RoutineScheduleItem[] {
  const wakeMins = opts.wakeMins ?? 7 * 60;
  const sleepMins = opts.sleepMins ?? 21 * 60;
  const ageInMonths = opts.ageInMonths ?? 8;
  const seed = opts.seed ?? ageInMonths;
  const milk = resolveInfantMilkType(opts.feedingType);

  const base = sanitizeInfantCareActivities(
    nonMealItems.filter(
      (it) => !isAdultMealBlock(it) && !isFeedingBlock(it) && !isSoftMealBlock(it),
    ),
  );

  const slots: RoutineScheduleItem[] = [];
  const anchors = [
    wakeMins + 30,
    wakeMins + 150,
    wakeMins + 330,
    wakeMins + 480,
    wakeMins + 630,
    sleepMins - 90,
  ].filter((t) => t >= wakeMins && t + 25 <= sleepMins);

  let feedCount = 0;
  let softCount = 0;

  for (let i = 0; i < anchors.length; i++) {
    const t = anchors[i]!;
    const isFeed = i % 2 === 0;
    if (isFeed && feedCount < 3) {
      slots.push({
        time: minsToTime24(t),
        activity: feedingActivityLabel(milk, feedCount),
        duration: flexibleDuration([15, 25], seed + feedCount),
        category: "feeding",
        type: "feeding",
        feedingType: milk,
        status: "pending",
        notes: ON_DEMAND_FEEDING_NOTE,
        culturalReason:
          "Milk remains primary nutrition while introducing soft complementary foods",
        energyImpact: "midday recharge",
      });
      feedCount++;
    } else if (softCount < 3) {
      const meta = resolveAgeFeedingDishes("infant_6_12", "soft_meal", {
        seed: seed + softCount,
        ageInMonths,
      }) as AgeFeedingMeta;
      slots.push({
        time: minsToTime24(t),
        activity: "Soft meal",
        duration: flexibleDuration([20, 30], seed + softCount),
        category: "meal",
        status: "pending",
        meal: meta.meal,
        dishes: meta.dishes,
        notes: `Options: ${meta.dishes.join(" | ")} | ${ON_DEMAND_FEEDING_NOTE}`,
        culturalReason: meta.culturalReason,
        energyImpact: meta.energyImpact,
      });
      softCount++;
    }
  }

  return [...base, ...slots].sort(
    (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
  );
}

/**
 * Apply age-aware feeding flow — bypasses country meal integration when not `child`.
 */
export function applyAgeFeedingRoutineFlow(
  items: RoutineScheduleItem[],
  group: FeedingAgeGroup,
  opts: AgeFeedingOpts = {},
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const adjustments: string[] = [];
  if (group === "child") {
    return { items, adjustments };
  }

  if (group === "infant_0_6") {
    const result = buildRealisticInfant0_6Routine(opts);
    adjustments.push("applied realistic infant 0–6 on-demand feeding routine");
    return { items: enrichAgeFeedingMeals(result, group, opts), adjustments };
  }

  const stripped = items.filter((it) => {
    if (isAdultMealBlock(it) || isAdultActivityPattern(it)) {
      adjustments.push(`removed adult block "${it.activity}" for ${group}`);
      return false;
    }
    if ((it.category ?? "").toLowerCase() === "school") {
      adjustments.push(`removed school block "${it.activity}"`);
      return false;
    }
    return true;
  });

  let result: RoutineScheduleItem[];

  if (group === "infant_6_12") {
    result = buildInfant6_12FeedingTimeline(stripped, opts);
    adjustments.push("applied infant 6–12 feeding + soft meal timeline");
  } else {
    result = stripped
      .filter((it) => !/\bdrunch\b/i.test(it.activity))
      .map((it) => {
        if ((it.category ?? "").toLowerCase() === "meal") {
          return {
            ...it,
            duration: Math.min(it.duration ?? 30, 25),
          };
        }
        return it;
      });
    adjustments.push("toddler mode — capped meal portions, no country meal banks");
  }

  const sleepMins = opts.sleepMins ?? 21 * 60;
  const sleep = result.find((i) => /\blights out|night sleep\b/i.test(i.activity));
  if (sleep) sleep.time = minsToTime24(sleepMins);

  return {
    items: enrichAgeFeedingMeals(
      result.sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time)),
      group,
      opts,
    ),
    adjustments,
  };
}

export function enrichAgeFeedingMeals(
  items: RoutineScheduleItem[],
  group: FeedingAgeGroup,
  opts: AgeFeedingOpts = {},
): RoutineScheduleItem[] {
  if (group === "child") return items;

  const ageInMonths = opts.ageInMonths ?? 8;
  const seedBase = opts.seed ?? 1;
  const milk = resolveInfantMilkType(opts.feedingType);

  return items.map((it, i) => {
    if (group === "infant_0_6") {
      if (isFeedingBlock(it) || isOptionalNightFeed(it)) {
        const optional = isOptionalNightFeed(it);
        return stripInfantMealFields({
          ...it,
          type: optional ? "feeding_optional" : "feeding",
          category: optional ? "feeding_optional" : "feeding",
          feedingType: it.feedingType ?? milk,
          notes: it.notes ?? ON_DEMAND_FEEDING_NOTE,
          culturalReason:
            it.culturalReason ??
            "WHO: exclusive breast milk or infant formula only",
          energyImpact: it.energyImpact ?? "midday recharge",
        });
      }
      if (/outdoor|park|playground|stroll/i.test(it.activity)) {
        return stripInfantMealFields({
          ...it,
          activity: "Fresh air / window time",
        });
      }
      return stripInfantMealFields(it);
    }

    if (isFeedingBlock(it)) {
      const meta = resolveAgeFeedingDishes(
        group === "infant_6_12" ? "infant_6_12" : "infant_0_6",
        "feeding",
        { ageInMonths, feedingType: opts.feedingType },
      );
      if ("feedingType" in meta) {
        const m = meta as InfantFeedingMeta;
        return {
          ...it,
          type: isOptionalNightFeed(it) ? "feeding_optional" : "feeding",
          feedingType: m.feedingType,
          notes: it.notes ?? ON_DEMAND_FEEDING_NOTE,
          culturalReason: m.culturalReason,
          energyImpact: m.energyImpact,
        };
      }
      const legacy = meta as AgeFeedingMeta;
      return {
        ...it,
        type: "feeding",
        feedingType: milk,
        meal: legacy.meal,
        dishes: legacy.dishes,
        notes: it.notes ?? ON_DEMAND_FEEDING_NOTE,
        culturalReason: legacy.culturalReason,
        energyImpact: legacy.energyImpact,
      };
    }

    if (isSoftMealBlock(it)) {
      const meta = resolveAgeFeedingDishes("infant_6_12", "soft_meal", {
        seed: seedBase + i,
        ageInMonths,
      }) as AgeFeedingMeta;
      return {
        ...it,
        meal: meta.meal,
        dishes: meta.dishes,
        notes: `Options: ${meta.dishes.join(" | ")} | ${ON_DEMAND_FEEDING_NOTE}`,
        culturalReason: meta.culturalReason,
        energyImpact: meta.energyImpact,
      };
    }

    if (group === "toddler" && (it.category ?? "").toLowerCase() === "meal") {
      const meta = resolveAgeFeedingDishes("toddler", "toddler_meal", {
        seed: seedBase + i,
        ageInMonths,
      }) as AgeFeedingMeta;
      const dishes = meta.dishes.filter((d) => !HEAVY_OR_HARD_RE.test(d));
      return {
        ...it,
        activity: /\b(breakfast|lunch|dinner|snack)\b/i.test(it.activity)
          ? `Toddler ${it.activity.replace(/quick meal before school/i, "breakfast")}`
          : it.activity,
        meal: meta.meal,
        dishes,
        notes: `Small portions: ${dishes.join(" | ")}`,
        culturalReason: meta.culturalReason,
        energyImpact: meta.energyImpact,
      };
    }

    return it;
  });
}

export function validateAgeFeedingIntegration(
  items: RoutineScheduleItem[],
  group: FeedingAgeGroup,
): string[] {
  const warnings: string[] = [];
  if (group === "child") return warnings;

  const adultMeals = items.filter(isAdultMealBlock);
  const dayFeeds = items.filter(
    (i) => isFeedingBlock(i) && !isOptionalNightFeed(i),
  );
  const nightFeeds = items.filter(isOptionalNightFeed);
  const softMeals = items.filter(isSoftMealBlock);
  const adultPatterns = items.filter(isAdultActivityPattern);

  if (group === "infant_0_6") {
    if (adultMeals.length > 0) {
      warnings.push(
        `age-feeding: infant 0–6 must not have breakfast/lunch/dinner (found ${adultMeals.length})`,
      );
    }
    if (adultPatterns.length > 0) {
      warnings.push(
        `age-feeding: infant 0–6 must not include school/adult activities (found ${adultPatterns.length})`,
      );
    }
    if (dayFeeds.length < 6 || dayFeeds.length > 10) {
      warnings.push(
        `age-feeding: infant 0–6 expected 6–10 daytime feeds (found ${dayFeeds.length})`,
      );
    }
    if (nightFeeds.length < 1) {
      warnings.push("age-feeding: infant 0–6 should include optional night feeding");
    }
    if (softMeals.length > 0) {
      warnings.push("age-feeding: infant 0–6 must not have soft solid meals");
    }
    for (const f of items.filter(isFeedingBlock)) {
      if (f.dishes?.length) {
        warnings.push(
          `age-feeding: infant feeding "${f.activity}" must not use dishes field`,
        );
      }
      if (!f.feedingType) {
        warnings.push(`age-feeding: feeding block missing feedingType`);
      }
      if (!/on-demand/i.test(f.notes ?? "")) {
        warnings.push(`age-feeding: feeding "${f.activity}" missing on-demand note`);
      }
    }
    if (items.some((i) => /\boutdoor play\b/i.test(i.activity))) {
      warnings.push('age-feeding: use "Fresh air / window time" instead of outdoor play');
    }
  }

  if (group === "infant_6_12") {
    if (adultMeals.length > 0) {
      warnings.push(
        `age-feeding: 6–12 months must not have adult meal blocks (found ${adultMeals.length})`,
      );
    }
    if (dayFeeds.length < 2 || dayFeeds.length > 5) {
      warnings.push(
        `age-feeding: 6–12 months expected 2–4 milk feeds (found ${dayFeeds.length})`,
      );
    }
    if (softMeals.length < 2 || softMeals.length > 4) {
      warnings.push(
        `age-feeding: 6–12 months expected 2–3 soft meals (found ${softMeals.length})`,
      );
    }
    for (const m of [...dayFeeds, ...softMeals]) {
      const text = `${m.activity} ${(m.dishes ?? []).join(" ")}`;
      if (HEAVY_OR_HARD_RE.test(text)) {
        warnings.push(`age-feeding: hard/heavy food not allowed for 6–12 months: "${m.activity}"`);
      }
    }
  }

  if (group === "toddler") {
    for (const m of items.filter((i) => (i.category ?? "") === "meal")) {
      const text = `${m.activity} ${(m.dishes ?? []).join(" ")}`;
      if (HEAVY_OR_HARD_RE.test(text)) {
        warnings.push(`age-feeding: toddler meal should avoid fried/heavy: "${m.activity}"`);
      }
    }
  }

  return warnings;
}
