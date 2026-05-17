/**
 * Context Interpretation Layer — converts raw signals into behavioral state.
 *
 * Priority resolution order: Safety > Health > Development > Preference
 */
import type { WeatherOutdoor } from "@workspace/family-routine";
import type { EnvDataConfidence, EnvLevel } from "@workspace/environment";
import type {
  CountryLabelPack,
  CountryRoutineProfile,
  LaunchCountry,
} from "./routine-country-profile.js";
import {
  getCountryLabelPack,
  getCountryRoutineProfile,
  windowMidpoint,
} from "./routine-country-profile.js";
import type { AgeGroup } from "./routine-templates.js";

import {
  combineOutdoorAllowance,
  deriveAqiOutdoorPolicy,
  resolveAqiFromContext,
  type AQICategory,
  type AqiOutdoorPolicy,
  type ExposureMode,
} from "./routine-aqi.js";
import { resolveIsSchoolDay } from "./routine-meal-day-type.js";
import { normalizeCountryCode } from "./routine-country-profile.js";
import {
  assessEnvironment,
  type EnvironmentSeverity,
} from "./routine-environment-intelligence.js";
import {
  weatherPlanningFlagsFromMode,
  type DayPlanningMode,
} from "./routine-weather-planning.js";
import type { RoutineEnvironmentInput } from "./routine-aqi.js";

export type { DayPlanningMode };
export type { EnvironmentSeverity } from "./routine-environment-intelligence.js";
export type { ExposureMode } from "./routine-aqi.js";
export type DayType = "active" | "low-energy" | "indoor-heavy" | "outdoor-optimized";
export type ActivityBias = "cognitive" | "play" | "balanced";
export type EnvironmentConstraintLevel = "low" | "medium" | "high";
export type MealTimingProfile = "early-dinner" | "late-dinner";
export type EnergyLevel = "low" | "normal" | "high";

export type ContextPriority = "safety" | "health" | "development" | "preference";

export type ContextDecisionTrace = {
  priority: ContextPriority;
  signal: string;
  resolution: string;
};

/** Derived behavioral state — drives the decision engine. */
export type InterpretedBehavioralState = {
  dayType: DayType;
  activityBias: ActivityBias;
  environmentConstraintLevel: EnvironmentConstraintLevel;
  mealTimingProfile: MealTimingProfile;
  energyLevel: EnergyLevel;
  allowOutdoor: boolean;
  splitOutdoorPlay: boolean;
  reduceStudyBlocks: boolean;
  preferIndoorHighEnergy: boolean;
  studyDurationFactor: number;
  playDurationFactor: number;
  decisions: ContextDecisionTrace[];
  /** Active country profile driving localization. */
  country: LaunchCountry;
  countryProfile: CountryRoutineProfile;
  labels: CountryLabelPack;
  requireExtracurricularBlock: boolean;
  requireOutdoorBlock: boolean;
  requireIndependenceTasks: boolean;
  minStudyBlocks: number;
  /** UAE / hot climates — anchor active play in evening. */
  preferEveningActivity: boolean;
  /** UK rainy default — favor indoor creative over generic indoor. */
  preferIndoorCreative: boolean;
  /** Weather-first planning mode (pre-schedule). */
  dayPlanningMode: DayPlanningMode;
  /** Rain/snow — swap outdoor entirely, never shorten only. */
  replaceOutdoorNotShorten: boolean;
  /** Hot / UAE — block outdoor 12:00–17:30 (UAE: before 18:30). */
  blockAfternoonOutdoor: boolean;
  /** Hot — split/move outdoor to morning + evening. */
  repositionOutdoorToMorningEvening: boolean;
  /** Cold/windy — may shorten outdoor but keep it. */
  limitOutdoorShortenOnly: boolean;
  /** NZ windy — safer outdoor activity labels. */
  preferSaferOutdoorActivity: boolean;
  requireHydrationBreak: boolean;
  requireCozyIndoor: boolean;
  /** Resolved US AQI (0–500+) when provided. */
  aqi: number | null;
  aqiCategory: AQICategory | "unknown";
  maxOutdoorDurationFromAqi: number | null;
  outdoorBlockedByAqi: boolean;
  /** Tolerant regions — limited/controlled outdoor with advisories (e.g. IN, AE). */
  aqiMetroAdvisoryMode: boolean;
  /** Global EQIE exposure tier after cultural adjustment. */
  aqiExposureMode: ExposureMode;
  aqiPolicy: AqiOutdoorPolicy;
  requireAirSafeIndoorBlocks: boolean;
  environment?: RoutineEnvironmentInput;
  /** Unified AQI + temperature + weather severity. */
  environmentSeverity: EnvironmentSeverity;
  environmentDataConfidence?: EnvDataConfidence;
  /** School-day meal flow (weekday + has school). */
  isSchoolDay: boolean;
};

export type PreviousDayContext = {
  sleepQuality?: "good" | "poor" | "average";
  moodScore?: "happy" | "tired" | "cranky" | "normal";
  activityCompletion?: number;
};

export type RoutineRawContext = {
  weatherOutdoor: WeatherOutdoor;
  region?: string;
  country?: string | LaunchCountry;
  countryProfile?: CountryRoutineProfile;
  isWeekendDay?: boolean;
  hasSchool?: boolean;
  mood?: string;
  previousDayContext?: PreviousDayContext;
  environmentalRiskScore?: number;
  outdoorSuitability?: "yes" | "no" | "limited";
  temperatureC?: number | null;
  hydrationNeedLevel?: EnvLevel;
  sensoryStressLevel?: EnvLevel;
  cognitiveComfortLevel?: EnvLevel;
  /** EQIE environment bundle (temperature, condition, AQI). */
  environment?: RoutineEnvironmentInput;
  /** US AQI — also readable from `environment.AQI`. */
  aqi?: number | null;
  /** Environmental data confidence from EQIE pipeline. */
  environmentDataConfidence?: EnvDataConfidence;
  /** Calendar date for school-day detection (defaults to today). */
  referenceDate?: Date;
};

export type ChildProfileForRoutine = {
  ageGroup: AgeGroup;
  /** Total age in months — drives infant/toddler feeding integration. */
  ageInMonths?: number;
  feedingType?: "breastfeeding" | "formula" | "mixed";
  /** Optional explicit energy override from parent / wearable signals. */
  declaredEnergy?: EnergyLevel;
};

const PRIORITY_ORDER: ContextPriority[] = [
  "safety",
  "health",
  "development",
  "preference",
];

function trace(
  decisions: ContextDecisionTrace[],
  priority: ContextPriority,
  signal: string,
  resolution: string,
): void {
  decisions.push({ priority, signal, resolution });
}

function inferEnergyFromProfile(
  child: ChildProfileForRoutine,
  ctx: RoutineRawContext,
): EnergyLevel {
  if (child.declaredEnergy) return child.declaredEnergy;

  const mood = (ctx.mood ?? "").toLowerCase();
  if (mood.includes("hyper") || mood.includes("energetic") || mood.includes("active")) {
    return "high";
  }
  if (mood.includes("tired") || mood.includes("low") || mood.includes("sleepy")) {
    return "low";
  }

  const prev = ctx.previousDayContext;
  if (prev?.moodScore === "cranky" || prev?.moodScore === "tired") return "low";
  if (prev?.sleepQuality === "poor") return "low";
  if (prev?.sleepQuality === "good" && prev?.moodScore === "happy") return "high";

  return "normal";
}

function isHotDay(ctx: RoutineRawContext): boolean {
  return ctx.temperatureC != null && ctx.temperatureC >= 32;
}

function isRainyOrIndoorOnly(ctx: RoutineRawContext): boolean {
  if (ctx.weatherOutdoor === "no") return true;
  if (ctx.outdoorSuitability === "no") return true;
  return false;
}

/**
 * Resolves conflicting signals using Safety > Health > Development > Preference.
 */
export function resolveContextPriorities(
  ctx: RoutineRawContext,
  child: ChildProfileForRoutine,
  decisions: ContextDecisionTrace[],
): Pick<
  InterpretedBehavioralState,
  | "allowOutdoor"
  | "preferIndoorHighEnergy"
  | "environmentConstraintLevel"
  | "energyLevel"
  | "activityBias"
  | "reduceStudyBlocks"
> & {
  aqiValue: number | null;
  aqiPolicy: AqiOutdoorPolicy;
} {
  const energyLevel = inferEnergyFromProfile(child, ctx);

  // Safety — environment caps outdoor exposure
  let allowOutdoor = ctx.weatherOutdoor !== "no" && ctx.outdoorSuitability !== "no";
  let environmentConstraintLevel: EnvironmentConstraintLevel = "low";

  const aqiValue = resolveAqiFromContext(ctx);
  const countryForAqi = normalizeCountryCode(
    ctx.country ?? ctx.countryProfile?.country ?? "IN",
  );
  const aqiPolicy = deriveAqiOutdoorPolicy(aqiValue, countryForAqi);

  if (aqiValue != null) {
    if (!aqiPolicy.allowOutdoor) {
      allowOutdoor = false;
      environmentConstraintLevel = "high";
      trace(
        decisions,
        "safety",
        `AQI ${aqiValue} (${aqiPolicy.category})`,
        "outdoor restricted due to high AQI — indoor only",
      );
    } else if (
      aqiPolicy.exposureMode === "controlled" ||
      aqiPolicy.exposureMode === "limited"
    ) {
      environmentConstraintLevel = "medium";
      trace(
        decisions,
        "safety",
        `AQI ${aqiValue} (${aqiPolicy.category})`,
        `exposure=${aqiPolicy.exposureMode} — outdoor ~${aqiPolicy.maxOutdoorDurationMins ?? "capped"} min with advisories`,
      );
    } else if (aqiPolicy.maxOutdoorDurationMins != null) {
      if (environmentConstraintLevel === "low") {
        environmentConstraintLevel = "medium";
      }
      trace(
        decisions,
        "safety",
        `AQI ${aqiValue} (${aqiPolicy.category})`,
        `outdoor limited to ~${aqiPolicy.maxOutdoorDurationMins} minutes`,
      );
    }
  }

  if (isRainyOrIndoorOnly(ctx)) {
    allowOutdoor = false;
    environmentConstraintLevel = "high";
    trace(
      decisions,
      "safety",
      "rainy/indoor-only weather",
      "outdoor activities removed; indoor alternatives required",
    );
  } else if (ctx.weatherOutdoor === "limited" || ctx.outdoorSuitability === "limited") {
    environmentConstraintLevel = "medium";
    trace(
      decisions,
      "safety",
      "limited outdoor conditions",
      "outdoor kept with shorter duration or wind-safe activity type",
    );
  }

  if (ctx.temperatureC != null && ctx.temperatureC < 8) {
    environmentConstraintLevel =
      environmentConstraintLevel === "high" ? "high" : "medium";
    trace(
      decisions,
      "safety",
      `cold temperature ${ctx.temperatureC}°C`,
      "outdoor shortened; favor indoor and cozy activities",
    );
  }

  if ((ctx.environmentalRiskScore ?? 0) >= 70) {
    allowOutdoor = false;
    environmentConstraintLevel = "high";
    trace(
      decisions,
      "safety",
      `environmental risk ${ctx.environmentalRiskScore}`,
      "high environmental risk — indoor-only schedule",
    );
  }

  if (isHotDay(ctx)) {
    allowOutdoor = true;
    environmentConstraintLevel =
      environmentConstraintLevel === "high" ? "high" : "medium";
    trace(
      decisions,
      "safety",
      `high temperature ${ctx.temperatureC}°C`,
      "no afternoon outdoor — reposition to morning/evening",
    );
  }

  // Health — hydration, sensory, sleep
  let preferIndoorHighEnergy = false;
  if (
    ctx.hydrationNeedLevel === "high" ||
    ctx.hydrationNeedLevel === "extreme"
  ) {
    trace(
      decisions,
      "health",
      `hydration need ${ctx.hydrationNeedLevel}`,
      "extra hydration reminders in meal notes",
    );
  }

  if (
    ctx.sensoryStressLevel === "high" ||
    ctx.sensoryStressLevel === "extreme" ||
    ctx.previousDayContext?.sleepQuality === "poor"
  ) {
    if (energyLevel === "high" && !allowOutdoor) {
      preferIndoorHighEnergy = true;
      trace(
        decisions,
        "health",
        "sensory stress + high child energy",
        "indoor high-energy activities (movement games, obstacle course)",
      );
    } else {
      trace(
        decisions,
        "health",
        "sensory stress or poor sleep",
        "reduced stimulation and shorter blocks",
      );
    }
  }

  // Conflict: rainy + high energy → indoor high-energy (not generic indoor)
  if (!allowOutdoor && energyLevel === "high") {
    preferIndoorHighEnergy = true;
    trace(
      decisions,
      "preference",
      "high energy child + indoor constraint",
      "indoor high-energy activities instead of calm indoor defaults",
    );
  }

  // Development — school day cognitive bias
  let activityBias: ActivityBias = "balanced";
  let reduceStudyBlocks = false;

  if (ctx.hasSchool && !ctx.isWeekendDay) {
    activityBias = "cognitive";
    trace(
      decisions,
      "development",
      "school day",
      "cognitive bias — learning blocks anchored around school",
    );
  }

  if (ctx.cognitiveComfortLevel === "low" || ctx.cognitiveComfortLevel === "none") {
    activityBias = "cognitive";
    trace(
      decisions,
      "development",
      "low cognitive comfort",
      "learning moved earlier in the day",
    );
  }

  // Preference — weekend, mood
  if (ctx.isWeekendDay) {
    reduceStudyBlocks = true;
    activityBias = activityBias === "cognitive" ? "balanced" : "play";
    trace(
      decisions,
      "preference",
      "weekend",
      "study blocks reduced; extra play and family time",
    );
  }

  if (energyLevel === "high" && allowOutdoor) {
    activityBias = "play";
    trace(decisions, "preference", "high energy", "play-biased activity mix");
  }

  if (energyLevel === "low") {
    activityBias = "balanced";
    trace(decisions, "preference", "low energy", "lighter schedule with more rest");
  }

  // Ensure priority order is reflected in final energy when health overrides preference
  if (
    ctx.previousDayContext?.activityCompletion != null &&
    ctx.previousDayContext.activityCompletion < 50
  ) {
    trace(
      decisions,
      "health",
      `low completion ${ctx.previousDayContext.activityCompletion}%`,
      "trimmed schedule density",
    );
  }

  allowOutdoor = combineOutdoorAllowance(allowOutdoor, aqiPolicy);

  if (aqiPolicy.forceIndoorDay && aqiValue != null) {
    preferIndoorHighEnergy =
      preferIndoorHighEnergy || energyLevel === "high";
  }

  void PRIORITY_ORDER;

  return {
    allowOutdoor,
    preferIndoorHighEnergy,
    environmentConstraintLevel,
    energyLevel,
    activityBias,
    reduceStudyBlocks,
    aqiValue,
    aqiPolicy,
  };
}

/**
 * Converts raw context + child profile into behavioral decisions.
 */
function applyCountryToBehavior(
  context: RoutineRawContext,
  resolved: ReturnType<typeof resolveContextPriorities>,
  decisions: ContextDecisionTrace[],
): Pick<
  InterpretedBehavioralState,
  | "country"
  | "countryProfile"
  | "labels"
  | "requireExtracurricularBlock"
  | "requireOutdoorBlock"
  | "requireIndependenceTasks"
  | "minStudyBlocks"
  | "preferEveningActivity"
  | "preferIndoorCreative"
  | "activityBias"
  | "allowOutdoor"
  | "reduceStudyBlocks"
> {
  const profile =
    context.countryProfile ?? getCountryRoutineProfile(context.country ?? "IN");

  let activityBias = resolved.activityBias;
  let allowOutdoor = resolved.allowOutdoor;
  let reduceStudyBlocks = resolved.reduceStudyBlocks;

  const requireExtracurricularBlock = profile.extracurricularCulture === "high";
  const requireOutdoorBlock =
    profile.outdoorPreference === "high" && allowOutdoor;
  const requireIndependenceTasks = profile.independenceLevel === "high";
  let minStudyBlocks = 1;
  if (profile.academicIntensity === "high") minStudyBlocks = 2;
  else if (profile.academicIntensity === "low") minStudyBlocks = 0;

  let preferEveningActivity = profile.country === "AE";
  let preferIndoorCreative = false;

  if (profile.academicIntensity === "high" && !context.isWeekendDay) {
    activityBias = "cognitive";
    trace(
      decisions,
      "development",
      `${profile.country} academic culture`,
      "increased study emphasis for country norms",
    );
  }

  if (profile.outdoorPreference === "high" && allowOutdoor) {
    activityBias = activityBias === "cognitive" ? "balanced" : "play";
    trace(
      decisions,
      "preference",
      `${profile.country} outdoor lifestyle`,
      "outdoor-forward afternoon structure",
    );
  }

  if (profile.country === "AE" || isHotDay(context)) {
    preferEveningActivity = true;
    if (isHotDay(context)) {
      trace(
        decisions,
        "safety",
        "UAE heat + country profile",
        "shift active play to evening window",
      );
    }
  }

  if (
    (profile.country === "UK" || profile.country === "US") &&
    isRainyOrIndoorOnly(context)
  ) {
    preferIndoorCreative = true;
    trace(
      decisions,
      "preference",
      "rainy UK/US pattern",
      "indoor creative play instead of generic indoor",
    );
  }

  if (
    context.temperatureC != null &&
    context.temperatureC <= 2 &&
    isRainyOrIndoorOnly(context)
  ) {
    preferIndoorCreative = true;
    trace(
      decisions,
      "preference",
      "freezing/snow conditions",
      "cozy indoor creative and calm play",
    );
  }

  if (profile.country === "AU" || profile.country === "NZ") {
    if (allowOutdoor && context.weatherOutdoor === "yes") {
      allowOutdoor = true;
      trace(
        decisions,
        "preference",
        "AU/NZ outdoor culture",
        "maximize outdoor blocks when weather permits",
      );
    }
  }

  if (profile.independenceLevel === "low") {
    trace(
      decisions,
      "preference",
      `${profile.country} parent-led culture`,
      "fewer self-managed tasks; more family-guided blocks",
    );
  }

  if (profile.extracurricularCulture === "high" && context.hasSchool) {
    trace(
      decisions,
      "development",
      `${profile.country} extracurricular culture`,
      "structured after-school activity expected",
    );
  }

  return {
    country: profile.country,
    countryProfile: profile,
    labels: getCountryLabelPack(profile.country),
    requireExtracurricularBlock,
    requireOutdoorBlock,
    requireIndependenceTasks,
    minStudyBlocks,
    preferEveningActivity,
    preferIndoorCreative,
    activityBias,
    allowOutdoor,
    reduceStudyBlocks,
  };
}

export function deriveBehavioralState(
  context: RoutineRawContext,
  childProfile: ChildProfileForRoutine,
): InterpretedBehavioralState {
  const enriched: RoutineRawContext = {
    ...context,
    country: context.country ?? context.countryProfile?.country ?? "IN",
    countryProfile:
      context.countryProfile ??
      getCountryRoutineProfile(context.country ?? "IN"),
  };
  const decisions: ContextDecisionTrace[] = [];
  const resolved = resolveContextPriorities(enriched, childProfile, decisions);
  const countryFx = applyCountryToBehavior(enriched, resolved, decisions);

  let dayType: DayType = "active";
  if (resolved.energyLevel === "low" || enriched.previousDayContext?.sleepQuality === "poor") {
    dayType = "low-energy";
  } else if (!countryFx.allowOutdoor) {
    dayType = "indoor-heavy";
  } else if (
    countryFx.allowOutdoor &&
    resolved.energyLevel === "high" &&
    !isHotDay(context)
  ) {
    dayType = "outdoor-optimized";
  } else if (countryFx.countryProfile.outdoorPreference === "high" && countryFx.allowOutdoor) {
    dayType = "outdoor-optimized";
  } else if (isHotDay(context)) {
    dayType = "active";
  }

  const aqiValue = resolved.aqiValue;
  const aqiPolicy = resolved.aqiPolicy;

  const envAssessment = assessEnvironment(enriched, countryFx.country);
  let dayPlanningMode = envAssessment.dayPlanningMode;
  trace(
    decisions,
    "safety",
    envAssessment.signals.join("; "),
    `environment severity ${envAssessment.severity} → ${dayPlanningMode}`,
  );
  if (aqiPolicy.forceIndoorDay && dayPlanningMode !== "indoor_day") {
    dayPlanningMode = "indoor_day";
    trace(
      decisions,
      "safety",
      `AQI ${aqiValue} forces indoor_day planning`,
      "outdoor disabled regardless of fair weather",
    );
  }

  const weatherFlags = weatherPlanningFlagsFromMode(
    dayPlanningMode,
    enriched,
    countryFx.country,
  );

  const allowOutdoorFinal = combineOutdoorAllowance(countryFx.allowOutdoor, aqiPolicy);

  trace(
    decisions,
    "safety",
    `dayPlanningMode=${dayPlanningMode}`,
    weatherFlags.repositionOutdoorToMorningEvening
      ? "weather-first: morning/evening outdoor windows"
      : weatherFlags.replaceOutdoorNotShorten
        ? "weather-first: indoor day structure"
        : "standard outdoor planning",
  );

  const splitOutdoorPlay =
    weatherFlags.repositionOutdoorToMorningEvening && allowOutdoorFinal;

  let mealTimingProfile: MealTimingProfile = "late-dinner";
  const dinnerMid = windowMidpoint(countryFx.countryProfile.dinnerWindow);
  if (dinnerMid <= 19 * 60 + 30) {
    mealTimingProfile = "early-dinner";
    trace(
      decisions,
      "preference",
      `${countryFx.country} dinner norms`,
      "early-dinner profile from country window",
    );
  } else {
    mealTimingProfile = "late-dinner";
    trace(
      decisions,
      "preference",
      `${countryFx.country} dinner norms`,
      "late-dinner profile from country window",
    );
  }
  if (enriched.isWeekendDay && countryFx.country !== "IN" && countryFx.country !== "AE") {
    mealTimingProfile = "late-dinner";
    trace(decisions, "preference", "weekend", "relaxed weekend dinner timing");
  }

  const studyDurationFactor = countryFx.reduceStudyBlocks ? 0.75 : 1;
  const playDurationFactor =
    resolved.preferIndoorHighEnergy && !allowOutdoorFinal ? 1.15 : 1;

  const requireOutdoorBlockFinal =
    countryFx.requireOutdoorBlock && allowOutdoorFinal;

  return {
    dayType: !allowOutdoorFinal ? "indoor-heavy" : dayType,
    activityBias: countryFx.activityBias,
    environmentConstraintLevel: resolved.environmentConstraintLevel,
    mealTimingProfile,
    energyLevel: resolved.energyLevel,
    allowOutdoor: allowOutdoorFinal,
    splitOutdoorPlay,
    reduceStudyBlocks: countryFx.reduceStudyBlocks,
    preferIndoorHighEnergy: resolved.preferIndoorHighEnergy,
    studyDurationFactor,
    playDurationFactor,
    decisions,
    country: countryFx.country,
    countryProfile: countryFx.countryProfile,
    labels: countryFx.labels,
    requireExtracurricularBlock: countryFx.requireExtracurricularBlock,
    requireOutdoorBlock: requireOutdoorBlockFinal,
    requireIndependenceTasks: countryFx.requireIndependenceTasks,
    minStudyBlocks: countryFx.minStudyBlocks,
    preferEveningActivity: countryFx.preferEveningActivity,
    preferIndoorCreative: countryFx.preferIndoorCreative,
    dayPlanningMode: weatherFlags.dayPlanningMode,
    replaceOutdoorNotShorten:
      weatherFlags.replaceOutdoorNotShorten || aqiPolicy.forceIndoorDay,
    blockAfternoonOutdoor: weatherFlags.blockAfternoonOutdoor,
    repositionOutdoorToMorningEvening:
      weatherFlags.repositionOutdoorToMorningEvening && allowOutdoorFinal,
    limitOutdoorShortenOnly: weatherFlags.limitOutdoorShortenOnly,
    preferSaferOutdoorActivity: weatherFlags.preferSaferOutdoorActivity,
    requireHydrationBreak:
      weatherFlags.requireHydrationBreak || aqiPolicy.requireExtraHydration,
    requireCozyIndoor: weatherFlags.requireCozyIndoor,
    aqi: aqiValue,
    aqiCategory: aqiPolicy.category,
    maxOutdoorDurationFromAqi: aqiPolicy.maxOutdoorDurationMins,
    outdoorBlockedByAqi: aqiValue != null && !aqiPolicy.allowOutdoor,
    aqiMetroAdvisoryMode:
      aqiPolicy.allowOutdoor &&
      (aqiPolicy.exposureMode === "controlled" ||
        aqiPolicy.exposureMode === "limited"),
    aqiExposureMode: aqiPolicy.exposureMode,
    aqiPolicy,
    requireAirSafeIndoorBlocks: aqiPolicy.requireAirSafeBlocks,
    environment: enriched.environment,
    environmentSeverity: envAssessment.severity,
    environmentDataConfidence: enriched.environmentDataConfidence,
    isSchoolDay: resolveIsSchoolDay({
      hasSchool: enriched.hasSchool,
      isWeekendDay: enriched.isWeekendDay,
      date: enriched.referenceDate,
    }),
  };
}

/** Maps behavioral state to dynamic meal windows (clock minutes). */
export function mealWindowsForState(
  state: InterpretedBehavioralState,
): {
  breakfast: { start: number; end: number };
  lunch: { start: number; end: number };
  dinner: { start: number; end: number };
} {
  const profile = state.countryProfile;
  if (profile) {
    const [dStart, dEnd] = profile.dinnerWindow;
    return {
      breakfast: { start: 6 * 60, end: 10 * 60 + 30 },
      lunch: { start: 12 * 60, end: 15 * 60 + 30 },
      dinner: { start: dStart, end: dEnd },
    };
  }
  if (state.mealTimingProfile === "early-dinner") {
    return {
      breakfast: { start: 6 * 60, end: 10 * 60 },
      lunch: { start: 12 * 60, end: 15 * 60 },
      dinner: { start: 18 * 60, end: 20 * 60 + 30 },
    };
  }
  return {
    breakfast: { start: 6 * 60, end: 10 * 60 + 30 },
    lunch: { start: 12 * 60, end: 15 * 60 + 30 },
    dinner: { start: 19 * 60, end: 21 * 60 + 30 },
  };
}
