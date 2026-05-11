// ─────────────────────────────────────────────────────────────────────────
// Environmental enrichments — applied AFTER weather + energy curve so the
// existing pipeline keeps full authority over scheduling. This layer only:
//
//   1) Hydration scheduling — inserts "Water break" reminder items at the
//      per-age/season/weather cadence from `hydrationProfiles.json`.
//   2) Seasonal nutrition biasing — appends a seasonal/regional dish hint
//      to meal items' `notes` from `seasonalNutritionProfiles.json`.
//   3) UV sun-safety reminders — annotates surviving outdoor blocks with
//      sunscreen / hat / safe-window guidance from `UVExposureRules.json`.
//   4) Activity library swap-ins — when an outdoor block was already swapped
//      to indoor by weather adjustment, appends a concrete suggestion from
//      `environmentalActivityLibrary.json` matched to the day's condition.
//
// Pure & deterministic. Returns a NEW item array; never mutates input.
// ─────────────────────────────────────────────────────────────────────────

import { datasets } from "./datasets.js";
import type {
  EnvAgeGroup,
  EnvironmentalContext,
  Season,
  WeatherCondition,
  PredictedWeatherShift,
} from "./types.js";

// Item shape — intentionally a structural subset of the route's RoutineItem
// so we don't take a circular dependency on api-server/family-routine.
export interface EnrichableItem {
  time: string;       // "HH:MM" 24h
  activity: string;
  duration: number;   // minutes
  category: string;
  notes?: string;
  // We carry these through untouched but accept anything else opaquely.
  [extra: string]: unknown;
}

interface HydrationProfilesShape {
  ageBaselines: Record<EnvAgeGroup, {
    baselineHydrationMl: number;
    hydrationReminderFrequency: number;
  }>;
  seasonalProfiles: Record<Season, {
    hotWeatherMultiplier: number;
    activityHydrationBoost: number;
  }>;
  weatherAdjustments: Record<string, {
    extraMultiplier: number;
    reminderEveryMinutes: number;
  }>;
}

interface SeasonalNutritionShape {
  seasons: Record<Season, {
    hydrationFoods: string[];
    coolingFoods: string[];
    warmingFoods: string[];
    immunityFoods: string[];
    seasonalSnackSuggestions: string[];
    recommendedMealDensity: string;
  }>;
  regionalVariations: Record<string, Partial<Record<Season, string[]>>>;
}

interface UVRulesShape {
  buckets: Record<string, {
    perAge: Record<EnvAgeGroup, {
      maxSafeExposureMinutes: number;
      sunscreenRecommendation: string;
      clothingRecommendation: string;
      shadeRequirement: string;
      recommendedActivityWindow: string;
    }>;
  }>;
}

interface ActivityLibraryShape {
  categories: Record<string, Array<{
    name: string;
    ageSuitability: EnvAgeGroup[];
    weatherCompatibility: string[];
    sensoryProfile: string;
  }>>;
}

interface CircadianShape {
  perAge: Record<EnvAgeGroup, {
    melatoninSupportWindow: { startBeforeBedtimeMin: number; endAtBedtime: boolean };
    optimalFocusWindows: Array<{ label: string; offsetFromWakeMin: number; durationMin: number }>;
    eveningWindDownAdjustment: { earlyBedtimeMinIfShortDaylight: number };
    seasonalWakeShift: { winterEarlierMin: number; summerLaterMin: number };
    darkWeatherCalmingAdjustment: string;
    sleepPreparationSuggestions: string[];
  }>;
  globals: {
    shortDaylightThresholdMin: number;
    longDaylightThresholdMin: number;
    overcastDimCloudCoverPct: number;
  };
}

interface WeatherEnergyShape {
  conditions: Record<string, {
    cognitiveEnergyModifier: number;
    physicalEnergyModifier: number;
    moodImpact: string;
    focusDurationAdjustment: number;
    sensoryStressRisk: string;
    emotionalRegulationNeed: string;
    recommendedActivityTypes: string[];
    recommendedLearningIntensity: "low" | "moderate" | "high";
    recommendedBreakFrequency: number;
  }>;
}

interface StressProfilesShape {
  factors: Record<string, {
    stressScore: number;
    emotionalRisk: string;
    meltdownRisk: string;
    calmingActivitySuggestions: string[];
    stimulationReductionLevel: string;
    caregiverSupportRecommendation: string;
    recoveryActivitySuggestions: string[];
  }>;
}

interface PredictiveProfilesShape {
  conditions: Record<string, {
    preemptiveScheduleAdjustment: string;
    activityReschedulingPriority: number;
    fallbackRoutineActivation: string;
    hydrationAdjustment: number;
    emotionalPreparationRecommendations: string[];
    caregiverPreparationSuggestions: string[];
  }>;
}

interface EmotionalProfilesShape {
  conditions: Record<string, {
    likelyMoodPatterns: string[];
    stimulationNeeds: string;
    bondingActivitySuggestions: string[];
    calmingActivities: string[];
    confidenceBuildingActivities: string[];
    creativitySuggestions: string[];
    emotionalSupportLevel: "low" | "moderate" | "high";
  }>;
}

const hydration = datasets.hydrationProfiles as unknown as HydrationProfilesShape;
const nutrition = datasets.seasonalNutritionProfiles as unknown as SeasonalNutritionShape;
const uvRules = datasets.UVExposureRules as unknown as UVRulesShape;
const activityLibrary = datasets.environmentalActivityLibrary as unknown as ActivityLibraryShape;
const circadian = datasets.circadianProfiles as unknown as CircadianShape;
const weatherEnergy = datasets.weatherEnergyProfiles as unknown as WeatherEnergyShape;
const stressProfiles = datasets.environmentalStressProfiles as unknown as StressProfilesShape;
const predictive = datasets.predictiveWeatherProfiles as unknown as PredictiveProfilesShape;
const emotional = datasets.emotionalWeatherProfiles as unknown as EmotionalProfilesShape;

// ─── Time helpers ────────────────────────────────────────────────────────
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

// ─── Outdoor / meal detection (mirrors family-routine's heuristics) ──────
const OUTDOOR_CATEGORIES = new Set(["outdoor", "outdoor_play"]);
const OUTDOOR_RE = /\b(outdoor|park|cycling|cycle ride|bike ride|walk|nature|garden|playground|swim|run|jog|football|cricket|tennis|skating|fresh air)\b/i;
function isOutdoor(item: EnrichableItem): boolean {
  if (OUTDOOR_CATEGORIES.has(item.category.toLowerCase())) return true;
  return OUTDOOR_RE.test(item.activity);
}

const MEAL_CATEGORIES = new Set(["meal", "meals", "breakfast", "lunch", "dinner", "snack", "tiffin"]);
const MEAL_RE = /\b(breakfast|lunch|dinner|snack|tiffin|meal)\b/i;
function isMeal(item: EnrichableItem): boolean {
  if (MEAL_CATEGORIES.has(item.category.toLowerCase())) return true;
  return MEAL_RE.test(item.activity);
}

const STUDY_CATEGORIES = new Set(["learning", "study", "homework", "academic", "school"]);
const STUDY_RE = /\b(study|homework|learn|reading|practice|spelling|math|science|olympiad|focus)\b/i;
function isStudy(item: EnrichableItem): boolean {
  if (STUDY_CATEGORIES.has(item.category.toLowerCase())) return true;
  return STUDY_RE.test(item.activity);
}

const WINDDOWN_CATEGORIES = new Set(["wind-down", "winddown", "wind_down", "sleep", "bedtime"]);
const WINDDOWN_RE = /\b(wind.?down|bedtime|sleep|lullaby|cuddle)\b/i;
function isWindDown(item: EnrichableItem): boolean {
  if (WINDDOWN_CATEGORIES.has(item.category.toLowerCase())) return true;
  return WINDDOWN_RE.test(item.activity);
}

const BONDING_CATEGORIES = new Set(["bonding", "family", "wind-down"]);
const BONDING_RE = /\b(story|cuddle|bonding|together|family|read)\b/i;
function isBonding(item: EnrichableItem): boolean {
  if (BONDING_CATEGORIES.has(item.category.toLowerCase())) return true;
  return BONDING_RE.test(item.activity);
}

const ACTIVE_CATEGORIES = new Set(["play", "outdoor", "outdoor_play", "exercise", "sport"]);
function isActivePlay(item: EnrichableItem): boolean {
  if (ACTIVE_CATEGORIES.has(item.category.toLowerCase())) return true;
  return false;
}

// Items that were already swapped indoors by `applyWeatherAdjustment` —
// detect by the swap activity names that family-routine emits.
const INDOOR_SWAP_RE = /^(Indoor (Free Play|Movement Break|Active Game|Sensory Play|Activity)|Living-Room Sports|Plant & Nature Craft)$/;
function isIndoorSwap(item: EnrichableItem): boolean {
  return INDOOR_SWAP_RE.test(item.activity);
}

// ─── 1. Hydration reminder insertion ─────────────────────────────────────
function buildHydrationReminders(
  items: EnrichableItem[],
  ctx: EnvironmentalContext,
): EnrichableItem[] {
  if (items.length === 0) return [];
  const ageBase = hydration.ageBaselines[ctx.ageGroup];
  const seasonProf = hydration.seasonalProfiles[ctx.season];
  const weatherAdj = hydration.weatherAdjustments[ctx.weatherCondition];
  if (!ageBase || !seasonProf) return [];

  // Reminder cadence: take the tighter of the age default and the
  // weather override, then bump tighter for high hydration need.
  let everyMin = ageBase.hydrationReminderFrequency;
  if (weatherAdj?.reminderEveryMinutes && weatherAdj.reminderEveryMinutes < everyMin) {
    everyMin = weatherAdj.reminderEveryMinutes;
  }
  if (ctx.hydrationNeedLevel === "high") everyMin = Math.max(45, Math.round(everyMin * 0.85));
  if (ctx.hydrationNeedLevel === "extreme") everyMin = Math.max(30, Math.round(everyMin * 0.7));

  const totalMl = Math.round(
    ageBase.baselineHydrationMl *
      seasonProf.hotWeatherMultiplier *
      (weatherAdj?.extraMultiplier ?? 1.0),
  );

  // Anchor reminders to the active part of the day: from the first non-sleep
  // item to the last non-sleep item.
  const active = items.filter((i) => i.category.toLowerCase() !== "sleep");
  if (active.length === 0) return [];
  const startMin = timeToMins(active[0]!.time) + 30;
  const endMin = timeToMins(active[active.length - 1]!.time) - 60;
  if (endMin <= startMin) return [];

  // Suggested drink string adapts to season — keeps it parent-friendly.
  const drinkHint =
    ctx.season === "summer" || ctx.weatherCondition === "heatwave"
      ? "water + a sip of nimbu paani / coconut water / ORS"
      : ctx.season === "winter"
      ? "warm water or warm milk"
      : ctx.season === "monsoon"
      ? "boiled-then-cooled water or warm soup"
      : "a glass of water";

  const reminders: EnrichableItem[] = [];
  for (let t = startMin; t <= endMin; t += everyMin) {
    reminders.push({
      time: minsToTime(t),
      activity: "Water Break",
      duration: 5,
      category: "hydration",
      notes: `Quick hydration check — offer ${drinkHint}. Daily target today: ~${totalMl} ml (adjusted for ${ctx.season} + ${ctx.weatherCondition}).`,
    });
  }
  return reminders;
}

// Merges reminders into the schedule in chronological order.
function mergeChronological(
  items: EnrichableItem[],
  inserts: EnrichableItem[],
): EnrichableItem[] {
  if (inserts.length === 0) return items;
  const all = [...items, ...inserts];
  all.sort((a, b) => timeToMins(a.time) - timeToMins(b.time));
  return all;
}

// ─── 2. Seasonal nutrition biasing ───────────────────────────────────────
function buildSeasonalSuggestion(
  ctx: EnvironmentalContext,
  region: string | null | undefined,
): string | null {
  const sp = nutrition.seasons[ctx.season];
  if (!sp) return null;
  const regional = region ? nutrition.regionalVariations[region]?.[ctx.season] : undefined;
  const pool: string[] = [];
  if (regional && regional.length > 0) pool.push(...regional);
  // Always include 1-2 cross-cutting seasonal hints for parents who don't fit
  // a regional bucket.
  if (ctx.season === "summer" || ctx.weatherCondition === "heatwave") {
    pool.push(...sp.coolingFoods.slice(0, 2), ...sp.hydrationFoods.slice(0, 1));
  } else if (ctx.season === "winter" || ctx.weatherCondition === "cold") {
    pool.push(...sp.warmingFoods.slice(0, 2), ...sp.immunityFoods.slice(0, 1));
  } else if (ctx.season === "monsoon") {
    pool.push(...sp.immunityFoods.slice(0, 2));
  } else {
    pool.push(...sp.seasonalSnackSuggestions.slice(0, 2));
  }
  // De-duplicate while preserving order; cap at 3.
  const seen = new Set<string>();
  const picks = pool.filter((p) => (seen.has(p) ? false : (seen.add(p), true))).slice(0, 3);
  if (picks.length === 0) return null;
  return `Seasonal pick (${ctx.season}): ${picks.join(", ")}.`;
}

function annotateMeals(
  items: EnrichableItem[],
  ctx: EnvironmentalContext,
  region: string | null | undefined,
): { items: EnrichableItem[]; touched: number } {
  const suggestion = buildSeasonalSuggestion(ctx, region);
  if (!suggestion) return { items, touched: 0 };
  let touched = 0;
  const next = items.map((it) => {
    if (!isMeal(it)) return it;
    touched++;
    const existing = it.notes?.trim();
    return { ...it, notes: existing ? `${existing} · ${suggestion}` : suggestion };
  });
  return { items: next, touched };
}

// ─── 3. UV sun-safety annotations on surviving outdoor blocks ────────────
function annotateUv(
  items: EnrichableItem[],
  ctx: EnvironmentalContext,
): { items: EnrichableItem[]; touched: number } {
  if (ctx.uvBucket === "low") return { items, touched: 0 };
  const bucket = uvRules.buckets[ctx.uvBucket];
  const ageRule = bucket?.perAge[ctx.ageGroup];
  if (!ageRule) return { items, touched: 0 };

  let touched = 0;
  const cap = ageRule.maxSafeExposureMinutes;
  const next = items.map((it) => {
    if (!isOutdoor(it)) return it;
    touched++;
    let duration = it.duration;
    let safetyNote: string;
    if (cap === 0) {
      // Should already have been swapped indoors by mapToWeatherOutdoor;
      // belt-and-braces: cap to 10 min and warn.
      duration = Math.min(duration, 10);
      safetyNote = `UV is ${ctx.uvBucket.replace("_", " ")} (index ${ctx.snapshot.uvIndexMax ?? "high"}) — keep this indoors if possible; outside max 10 min in shade only.`;
    } else if (duration > cap) {
      duration = cap;
      safetyNote = `UV is ${ctx.uvBucket.replace("_", " ")} — capped to ${cap} min. Wear ${ageRule.clothingRecommendation.replace(/_/g, " ")}, apply ${ageRule.sunscreenRecommendation.replace(/_/g, " ")}, prefer ${ageRule.recommendedActivityWindow.replace(/_/g, " ")}.`;
    } else {
      safetyNote = `UV is ${ctx.uvBucket.replace("_", " ")} — wear ${ageRule.clothingRecommendation.replace(/_/g, " ")} and apply ${ageRule.sunscreenRecommendation.replace(/_/g, " ")}.`;
    }
    const existing = it.notes?.trim();
    return {
      ...it,
      duration,
      notes: existing ? `${existing} · ${safetyNote}` : safetyNote,
    };
  });
  return { items: next, touched };
}

// ─── 4. Indoor swap suggestion enrichment ────────────────────────────────
// Maps a WeatherCondition + AQI bucket to the activity-library category
// that's best suited as a backup pool.
function pickActivityCategory(ctx: EnvironmentalContext): string | null {
  if (ctx.aqiBucket === "unhealthy" || ctx.aqiBucket === "very_unhealthy" || ctx.aqiBucket === "hazardous") {
    return "low_AQI_activities";
  }
  if (ctx.weatherCondition === "stormy") return "storm_safe_activities";
  if (ctx.weatherCondition === "heatwave" || ctx.weatherCondition === "humid") return "indoor_low_energy";
  if (ctx.weatherCondition === "rainy") return "indoor_creative";
  if (ctx.sensoryStressLevel === "high" || ctx.sensoryStressLevel === "extreme") return "sensory_regulation";
  return null;
}

function pickAgeAppropriate(category: string, ageGroup: EnvAgeGroup): string | null {
  const pool = activityLibrary.categories[category];
  if (!pool || pool.length === 0) return null;
  const matches = pool.filter((a) => a.ageSuitability.includes(ageGroup));
  const final = matches.length > 0 ? matches : pool;
  // Deterministic pick: stable choice (first match) so the same conditions
  // produce the same suggestion, simplifying tests + parent expectations.
  return final[0]?.name ?? null;
}

const cond = (w: WeatherCondition): string => w; // type-narrowing helper

function annotateIndoorSwaps(
  items: EnrichableItem[],
  ctx: EnvironmentalContext,
): { items: EnrichableItem[]; touched: number } {
  const cat = pickActivityCategory(ctx);
  if (!cat) return { items, touched: 0 };
  const suggestion = pickAgeAppropriate(cat, ctx.ageGroup);
  if (!suggestion) return { items, touched: 0 };

  let touched = 0;
  const tail = `Try: ${suggestion} (matched to today's ${cond(ctx.weatherCondition)} conditions).`;
  const next = items.map((it) => {
    if (!isIndoorSwap(it)) return it;
    touched++;
    const existing = it.notes?.trim();
    return { ...it, notes: existing ? `${existing} · ${tail}` : tail };
  });
  return { items: next, touched };
}

// ─── 5. Circadian — focus windows + melatonin support ───────────────────
function annotateCircadian(
  items: EnrichableItem[],
  ctx: EnvironmentalContext,
): { items: EnrichableItem[]; touched: number } {
  const profile = circadian.perAge[ctx.ageGroup];
  if (!profile) return { items, touched: 0 };

  const active = items.filter((i) => i.category.toLowerCase() !== "sleep");
  const wakeMin = active.length > 0 ? timeToMins(active[0]!.time) : null;
  const sleepItem = items.find((i) => i.category.toLowerCase() === "sleep");
  const bedtimeMin = sleepItem ? timeToMins(sleepItem.time) : null;

  let touched = 0;
  const focusWindows = wakeMin === null
    ? []
    : profile.optimalFocusWindows.map((w) => ({
        label: w.label,
        startMin: wakeMin + w.offsetFromWakeMin,
        endMin: wakeMin + w.offsetFromWakeMin + w.durationMin,
      }));

  const melatoninStartMin = bedtimeMin !== null
    ? bedtimeMin - profile.melatoninSupportWindow.startBeforeBedtimeMin
    : null;

  const next = items.map((it) => {
    const itMin = timeToMins(it.time);

    // Study blocks inside an optimal focus window — affirm the timing.
    if (isStudy(it)) {
      const inWindow = focusWindows.find((w) => itMin >= w.startMin && itMin <= w.endMin);
      if (inWindow) {
        touched++;
        const tip = `In ${ctx.ageGroup.split("_")[0]}'s peak focus window (${inWindow.label.replace(/_/g, " ")}) — protect this slot from interruptions.`;
        return { ...it, notes: it.notes ? `${it.notes} · ${tip}` : tip };
      }
    }

    // Wind-down items inside the melatonin support window — add a sleep prep tip.
    if (isWindDown(it) && melatoninStartMin !== null && itMin >= melatoninStartMin && itMin <= (bedtimeMin ?? itMin)) {
      touched++;
      const prep = profile.sleepPreparationSuggestions[0] ?? "dim lights, soft voice";
      const dark = ctx.circadianLightProfile === "early_dark" || ctx.circadianLightProfile === "overcast_dim"
        ? ` Today is dimmer than usual — try ${profile.darkWeatherCalmingAdjustment.replace(/_/g, " ")}.`
        : "";
      const tip = `Melatonin window — ${prep}.${dark}`;
      return { ...it, notes: it.notes ? `${it.notes} · ${tip}` : tip };
    }

    return it;
  });

  return { items: next, touched };
}

// ─── 6. Weather-energy — break frequency + intensity guidance ────────────
function annotateWeatherEnergy(
  items: EnrichableItem[],
  ctx: EnvironmentalContext,
): { items: EnrichableItem[]; touched: number } {
  const profile = weatherEnergy.conditions[ctx.weatherCondition];
  if (!profile) return { items, touched: 0 };

  const draining = profile.cognitiveEnergyModifier < 0.9 || profile.physicalEnergyModifier < 0.85;
  const energising = profile.cognitiveEnergyModifier > 1.05;
  if (!draining && !energising) return { items, touched: 0 };

  let touched = 0;
  const next = items.map((it) => {
    if (isStudy(it)) {
      touched++;
      const focusDelta = profile.focusDurationAdjustment;
      const intensity = profile.recommendedLearningIntensity;
      const breakEvery = profile.recommendedBreakFrequency;
      const tip = draining
        ? `Today's ${ctx.weatherCondition} drains focus — keep this ${intensity} intensity, take a short break every ${breakEvery} min${focusDelta < 0 ? `, trim by ${Math.abs(focusDelta)} min if attention slips` : ""}.`
        : `Today's ${ctx.weatherCondition} boosts focus — safe to push intensity to ${intensity}; break every ${breakEvery} min.`;
      return { ...it, notes: it.notes ? `${it.notes} · ${tip}` : tip };
    }
    if (isActivePlay(it) && draining) {
      touched++;
      const physMod = Math.round(profile.physicalEnergyModifier * 100);
      const tip = `Physical energy is ~${physMod}% of normal in ${ctx.weatherCondition} — keep play gentler and add a water break midway.`;
      return { ...it, notes: it.notes ? `${it.notes} · ${tip}` : tip };
    }
    return it;
  });
  return { items: next, touched };
}

// ─── 7. Stress profiles — calming swap on wind-down/bonding ──────────────
function pickStressFactor(ctx: EnvironmentalContext): string | null {
  if (ctx.weatherCondition === "stormy") return "storm_stress";
  if (ctx.weatherCondition === "heatwave") return "heat_stress";
  if (ctx.weatherCondition === "humid") return "humidity_stress";
  if (ctx.sensoryStressLevel === "high" || ctx.sensoryStressLevel === "extreme") return "sensory_overload";
  if (ctx.environmentalFatigueRisk === "high" || ctx.environmentalFatigueRisk === "extreme") return "atmospheric_fatigue";
  if (ctx.circadianLightProfile === "early_dark" || ctx.circadianLightProfile === "overcast_dim") {
    return "low_light_mood_suppression";
  }
  return null;
}

function annotateStress(
  items: EnrichableItem[],
  ctx: EnvironmentalContext,
): { items: EnrichableItem[]; touched: number } {
  const factorKey = pickStressFactor(ctx);
  if (!factorKey) return { items, touched: 0 };
  const factor = stressProfiles.factors[factorKey];
  if (!factor) return { items, touched: 0 };

  const calming = factor.calmingActivitySuggestions[0];
  if (!calming) return { items, touched: 0 };

  let touched = 0;
  let applied = false;
  const tip = `Stress signal (${factorKey.replace(/_/g, " ")}) — try: ${calming}. ${factor.caregiverSupportRecommendation}.`;
  const next = items.map((it) => {
    if (!applied && (isWindDown(it) || isBonding(it))) {
      applied = true;
      touched++;
      return { ...it, notes: it.notes ? `${it.notes} · ${tip}` : tip };
    }
    return it;
  });
  return { items: next, touched };
}

// ─── 8. Predictive weather — caregiver heads-up adaptation ───────────────
function buildPredictiveAdaptation(shift: PredictedWeatherShift | undefined): string | null {
  if (!shift || shift.kind === "stable") return null;
  const profile = predictive.conditions[shift.kind];
  if (!profile) return null;
  const prep = profile.caregiverPreparationSuggestions[0];
  const adjust = profile.preemptiveScheduleAdjustment.replace(/_/g, " ");
  const eta = shift.etaHours > 0 ? ` in ~${shift.etaHours}h` : " soon";
  const prepStr = prep ? ` — ${prep}` : "";
  return `Heads-up: ${shift.label}${eta}. Plan: ${adjust}${prepStr}.`;
}

// ─── 9. Emotional weather — mood-aware annotations ───────────────────────
function annotateEmotional(
  items: EnrichableItem[],
  ctx: EnvironmentalContext,
): { items: EnrichableItem[]; touched: number } {
  let key: string = ctx.weatherCondition;
  if (ctx.weatherCondition === "cloudy" && ctx.circadianLightProfile === "overcast_dim") {
    key = "dark_cloudy";
  }
  const profile = emotional.conditions[key];
  if (!profile) return { items, touched: 0 };
  const bondingPick = profile.bondingActivitySuggestions[0];
  const calmingPick = profile.calmingActivities[0];
  if (!bondingPick && !calmingPick) return { items, touched: 0 };

  let touched = 0;
  let bondingApplied = false;
  const next = items.map((it) => {
    if (!bondingApplied && isBonding(it) && bondingPick) {
      bondingApplied = true;
      touched++;
      const moods = profile.likelyMoodPatterns.slice(0, 2).join(" / ");
      const tip = `Mood today (${moods}) — try: ${bondingPick}.`;
      return { ...it, notes: it.notes ? `${it.notes} · ${tip}` : tip };
    }
    if (isWindDown(it) && calmingPick && profile.emotionalSupportLevel === "high") {
      touched++;
      const tip = `Emotional support today is high — calming idea: ${calmingPick}.`;
      return { ...it, notes: it.notes ? `${it.notes} · ${tip}` : tip };
    }
    return it;
  });
  return { items: next, touched };
}

// ─── Public API ──────────────────────────────────────────────────────────
export interface EnrichmentResult {
  items: EnrichableItem[];
  extraAdaptations: string[];
}

export function applyEnvironmentalEnrichments<T extends EnrichableItem>(
  rawItems: T[],
  ctx: EnvironmentalContext | null | undefined,
  opts: { region?: string | null } = {},
): { items: T[]; extraAdaptations: string[] } {
  if (!ctx) return { items: rawItems, extraAdaptations: [] };

  let items: EnrichableItem[] = rawItems.map((it) => ({ ...it }));
  const extras: string[] = [];

  // 2. Seasonal nutrition annotations
  const meal = annotateMeals(items, ctx, opts.region);
  items = meal.items;
  if (meal.touched > 0) extras.push(`Meal notes adapted to the ${ctx.season} season.`);

  // 3. UV annotations + duration capping for surviving outdoor blocks
  const uv = annotateUv(items, ctx);
  items = uv.items;
  if (uv.touched > 0 && (ctx.uvBucket === "very_high" || ctx.uvBucket === "extreme")) {
    extras.push(`Outdoor block durations capped for UV safety.`);
  }

  // 4. Indoor swap suggestions
  const swap = annotateIndoorSwaps(items, ctx);
  items = swap.items;
  if (swap.touched > 0) extras.push(`Indoor swaps tailored to today's ${ctx.weatherCondition} conditions.`);

  // 5. Circadian focus + melatonin window
  const cc = annotateCircadian(items, ctx);
  items = cc.items;
  if (cc.touched > 0) extras.push(`Schedule aligned with the child's circadian focus and sleep windows.`);

  // 6. Weather-energy guidance on study + active blocks
  const we = annotateWeatherEnergy(items, ctx);
  items = we.items;
  if (we.touched > 0) extras.push(`Activity intensity tuned to today's ${ctx.weatherCondition} energy profile.`);

  // 7. Stress-factor calming hint on the first wind-down/bonding block
  const st = annotateStress(items, ctx);
  items = st.items;
  if (st.touched > 0) extras.push(`Calming guidance added for today's stress signals.`);

  // 9. Emotional weather — mood-aware bonding + calming hints
  const em = annotateEmotional(items, ctx);
  items = em.items;
  if (em.touched > 0) extras.push(`Bonding suggestions matched to today's likely mood.`);

  // 8. Predictive weather — single caregiver heads-up adaptation
  const heads = buildPredictiveAdaptation(ctx.predictedWeatherShift);
  if (heads) extras.push(heads);

  // 1. Hydration reminders (inserted last so they don't get UV-annotated etc.)
  const reminders = buildHydrationReminders(items, ctx);
  if (reminders.length > 0) {
    items = mergeChronological(items, reminders);
    extras.push(`Added ${reminders.length} hydration reminder${reminders.length === 1 ? "" : "s"} for today's conditions.`);
  }

  return { items: items as T[], extraAdaptations: extras };
}
