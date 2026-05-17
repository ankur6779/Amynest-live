/**
 * Global EQIE AQI model — exposure modes, cultural modifiers, advisories.
 */
import type { LaunchCountry } from "./routine-country-profile.js";
import { normalizeCountryCode } from "./routine-country-profile.js";
import type { RoutineRawContext } from "./routine-context-engine.js";
import type { RoutineScheduleItem, RoutineActivityAdvisory } from "./routine-scheduler.js";
import { minsToTime24, parseTimeToMins } from "./routine-scheduler.js";

/** Global AQI health bands (US EPA–aligned). */
export type AQICategory =
  | "good"
  | "moderate"
  | "sensitive"
  | "unhealthy"
  | "severe";

export type ExposureMode =
  | "normal"
  | "reduced"
  | "limited"
  | "controlled"
  | "indoor_only";

export type AdvisoryLevel = "info" | "warning" | "critical";

export type RoutineAqiAdvisory = RoutineActivityAdvisory;

export type RoutineEnvironmentInput = {
  temperature?: number | null;
  condition?: string;
  AQI?: number | null;
};

const EXPOSURE_ORDER: readonly ExposureMode[] = [
  "normal",
  "reduced",
  "limited",
  "controlled",
  "indoor_only",
];

export const AQI_OUTDOOR_RESTRICTED_REASON =
  "Air quality calls for more indoor time today.";

/** Shown on blocks when environmental data confidence is low (full fallback). */
export const FALLBACK_ENV_REASON =
  "Limited environmental data — conservative routine applied";

/** Strict outdoor cap from AQI (minutes); null = use exposure-mode default only. */
export function maxOutdoorMinutesFromAqi(aqi: number): number | null {
  if (aqi > 300) return 0;
  if (aqi >= 200) return 15;
  if (aqi >= 150) return 20;
  return null;
}

/** User-facing severity for advisories — AQI ≥ 150 is unhealthy. */
export function aqiSeverityLabelForMessaging(aqi: number): "good" | "moderate" | "unhealthy" | "severe" {
  if (aqi <= 100) return aqi <= 50 ? "good" : "moderate";
  if (aqi < 300) return "unhealthy";
  return "severe";
}

export function aqiAdjustmentReason(detail?: string): string {
  if (!detail) return AQI_OUTDOOR_RESTRICTED_REASON;
  const friendly: Record<string, string> = {
    "scheduled for poor air quality": "Indoor play keeps lungs safer when air quality is challenging.",
    "indoor cognitive play": "Calm indoor games suit moderate air quality days.",
    "breathing-safe rest block": "Quiet indoor time supports breathing on smoky days.",
    "hydration during high AQI": "Extra fluids help on hot or hazy days.",
    "air-safe indoor blocks scheduled": "Indoor play scheduled while outdoor air is not ideal.",
    "light outdoor walk": "Brief outdoor time with protection and light movement only.",
  };
  const key = detail.toLowerCase();
  for (const k of Object.keys(friendly)) {
    if (key.includes(k)) return friendly[k]!;
  }
  return `${AQI_OUTDOOR_RESTRICTED_REASON} ${detail}`;
}

export function resolveAqiFromContext(ctx: RoutineRawContext): number | null {
  const fromEnv = ctx.environment?.AQI;
  if (fromEnv != null && Number.isFinite(fromEnv)) return fromEnv;
  if (ctx.aqi != null && Number.isFinite(ctx.aqi)) return ctx.aqi;
  return null;
}

export function getAQICategory(aqi: number): AQICategory {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 200) return "sensitive";
  if (aqi <= 300) return "unhealthy";
  return "severe";
}

/** Base exposure mode from AQI (before cultural adjustment). */
export function baseExposureModeFromAqi(aqi: number): ExposureMode {
  const cat = getAQICategory(aqi);
  switch (cat) {
    case "good":
      return "normal";
    case "moderate":
      return "reduced";
    case "sensitive":
      return "limited";
    case "unhealthy":
      return "controlled";
    case "severe":
      return "indoor_only";
  }
}

export type AqiCultureProfile = "strict" | "tolerant" | "outdoor_preferred";

export function aqiCultureProfile(country: LaunchCountry | string): AqiCultureProfile {
  const c = normalizeCountryCode(country);
  if (c === "IN" || c === "AE") return "tolerant";
  if (c === "AU" || c === "NZ") return "outdoor_preferred";
  return "strict";
}

function shiftExposure(mode: ExposureMode, delta: number): ExposureMode {
  const idx = EXPOSURE_ORDER.indexOf(mode);
  const next = Math.max(0, Math.min(EXPOSURE_ORDER.length - 1, idx + delta));
  return EXPOSURE_ORDER[next]!;
}

/** Apply country cultural modifier to base exposure mode. */
export function applyCulturalExposureModifier(
  baseMode: ExposureMode,
  country: LaunchCountry | string,
): ExposureMode {
  const profile = aqiCultureProfile(country);
  if (profile === "strict") return shiftExposure(baseMode, 1);
  if (profile === "tolerant") return shiftExposure(baseMode, -1);
  return baseMode;
}

/**
 * Resolved exposure tier — AQI 150–200 is always `limited` (strict band).
 */
export function resolveExposureModeForAqi(
  aqi: number,
  country: LaunchCountry | string,
): ExposureMode {
  if (aqi >= 150 && aqi <= 200) return "limited";
  const baseMode = baseExposureModeFromAqi(aqi);
  return applyCulturalExposureModifier(baseMode, country);
}

function applyAqiDurationCap(policy: AqiOutdoorPolicy, aqi: number): AqiOutdoorPolicy {
  const cap = maxOutdoorMinutesFromAqi(aqi);
  if (cap == null) return policy;
  if (policy.maxOutdoorDurationMins == null) {
    return { ...policy, maxOutdoorDurationMins: cap };
  }
  return {
    ...policy,
    maxOutdoorDurationMins: Math.min(policy.maxOutdoorDurationMins, cap),
  };
}

/** Stricter of two exposure modes (weather ∩ AQI). */
export function mergeExposureModes(a: ExposureMode, b: ExposureMode): ExposureMode {
  const ia = EXPOSURE_ORDER.indexOf(a);
  const ib = EXPOSURE_ORDER.indexOf(b);
  return EXPOSURE_ORDER[Math.max(ia, ib)]!;
}

/** Map weather day planning to equivalent exposure restriction. */
export function exposureModeFromWeatherBlock(
  opts: {
    forceIndoorDay?: boolean;
    limitedOutdoor?: boolean;
  },
): ExposureMode {
  if (opts.forceIndoorDay) return "indoor_only";
  if (opts.limitedOutdoor) return "limited";
  return "normal";
}

export type AqiOutdoorPolicy = {
  category: AQICategory | "unknown";
  baseExposureMode: ExposureMode;
  exposureMode: ExposureMode;
  allowOutdoor: boolean;
  forceIndoorDay: boolean;
  maxOutdoorDurationMins: number | null;
  requireAirSafeBlocks: boolean;
  requireExtraHydration: boolean;
  lowIntensityOnly: boolean;
  preferMorningOutdoor: boolean;
  avoidEveningPeakPollution: boolean;
  optionalOutdoor: boolean;
  /** AU/NZ — keep outdoor blocks with shorter duration at same exposure tier. */
  maintainOutdoorPreference: boolean;
  requireAdvisory: boolean;
};

function policyFromExposureMode(
  baseMode: ExposureMode,
  exposureMode: ExposureMode,
  category: AQICategory,
  country: LaunchCountry | string,
): AqiOutdoorPolicy {
  const culture = aqiCultureProfile(country);
  const maintainOutdoorPreference = culture === "outdoor_preferred";

  const base: AqiOutdoorPolicy = {
    category,
    baseExposureMode: baseMode,
    exposureMode,
    allowOutdoor: true,
    forceIndoorDay: false,
    maxOutdoorDurationMins: null,
    requireAirSafeBlocks: false,
    requireExtraHydration: false,
    lowIntensityOnly: false,
    preferMorningOutdoor: false,
    avoidEveningPeakPollution: false,
    optionalOutdoor: false,
    maintainOutdoorPreference,
    requireAdvisory: false,
  };

  switch (exposureMode) {
    case "normal":
      return base;
    case "reduced":
      return {
        ...base,
        maxOutdoorDurationMins: maintainOutdoorPreference ? 40 : 45,
        requireExtraHydration: true,
        requireAdvisory: true,
      };
    case "limited":
      return {
        ...base,
        maxOutdoorDurationMins: maintainOutdoorPreference ? 35 : 30,
        requireExtraHydration: true,
        requireAdvisory: true,
        lowIntensityOnly: culture === "tolerant",
        preferMorningOutdoor: culture === "tolerant",
        avoidEveningPeakPollution: culture === "tolerant",
      };
    case "controlled":
      return {
        ...base,
        maxOutdoorDurationMins: culture === "tolerant" ? 20 : 18,
        requireAirSafeBlocks: true,
        requireExtraHydration: true,
        requireAdvisory: true,
        lowIntensityOnly: true,
        preferMorningOutdoor: true,
        avoidEveningPeakPollution: true,
        optionalOutdoor: category === "severe" && culture === "tolerant",
      };
    case "indoor_only":
      return {
        ...base,
        allowOutdoor: false,
        forceIndoorDay: true,
        maxOutdoorDurationMins: 0,
        requireAirSafeBlocks: true,
        requireExtraHydration: true,
        requireAdvisory: true,
        lowIntensityOnly: true,
      };
  }
}

export function deriveAqiOutdoorPolicy(
  aqi: number | null | undefined,
  country: LaunchCountry | string = "IN",
): AqiOutdoorPolicy {
  const unknown: AqiOutdoorPolicy = {
    category: "unknown",
    baseExposureMode: "normal",
    exposureMode: "normal",
    allowOutdoor: true,
    forceIndoorDay: false,
    maxOutdoorDurationMins: null,
    requireAirSafeBlocks: false,
    requireExtraHydration: false,
    lowIntensityOnly: false,
    preferMorningOutdoor: false,
    avoidEveningPeakPollution: false,
    optionalOutdoor: false,
    maintainOutdoorPreference: aqiCultureProfile(country) === "outdoor_preferred",
    requireAdvisory: false,
  };

  if (aqi == null || !Number.isFinite(aqi)) return unknown;

  const category = getAQICategory(aqi);
  const baseMode = baseExposureModeFromAqi(aqi);
  const exposureMode = resolveExposureModeForAqi(aqi, country);
  return applyAqiDurationCap(
    policyFromExposureMode(baseMode, exposureMode, category, country),
    aqi,
  );
}

/** @deprecated Use `exposureMode` on policy — tolerant controlled/limited outdoor. */
export function usesMetroAqiPolicy(country: LaunchCountry | string | undefined): boolean {
  return aqiCultureProfile(country ?? "IN") === "tolerant";
}

export function isAdvisoryExposureMode(mode: ExposureMode): boolean {
  return mode !== "normal";
}

export function buildGlobalAqiAdvisory(
  aqi: number,
  exposureMode: ExposureMode,
  country?: LaunchCountry | string,
): RoutineAqiAdvisory {
  const culture = aqiCultureProfile(country ?? "IN");
  const actions: string[] = [];

  if (aqi > 100) {
    actions.push("Check local air quality updates during the day.");
  }
  if (exposureMode !== "normal") {
    actions.push("Offer water before and after outdoor time.");
  }
  if (exposureMode === "reduced" || exposureMode === "limited") {
    actions.push("Keep outdoor sessions shorter than usual.");
    if (culture === "outdoor_preferred") {
      actions.push("Choose sheltered outdoor spots; wind-safe play is fine.");
    }
  }
  if (exposureMode === "limited" || exposureMode === "controlled") {
    actions.push("Avoid heavy running or sports outdoors.");
    actions.push("Prefer light walking or calm play.");
  }
  if (exposureMode === "controlled" || exposureMode === "indoor_only") {
    actions.push("Consider a mask if going outside.");
    actions.push("Use air purifier indoors if available; keep windows closed when hazy.");
  }
  if (exposureMode === "controlled" && culture === "tolerant") {
    actions.push("Prefer morning outdoor time; avoid evening rush-hour pollution.");
  }
  if (exposureMode === "indoor_only") {
    actions.push("Prefer indoor play and rest today.");
    actions.push("Limit time outside to essential trips only.");
  }

  const severity = aqiSeverityLabelForMessaging(aqi);
  let level: AdvisoryLevel = "info";
  let message = "Air quality is good — normal outdoor time is fine.";

  if (severity === "unhealthy") {
    level = "warning";
    message =
      exposureMode === "indoor_only"
        ? "Air quality is unhealthy — stay indoors when possible."
        : "Air quality is unhealthy — limit outdoor time and use protection.";
  } else if (exposureMode === "reduced") {
    level = "info";
    message = "Air quality is moderate — slightly shorter outdoor time is sensible.";
  } else if (exposureMode === "limited") {
    level = "warning";
    message = "Air quality may affect sensitive children — light outdoor activity only.";
  } else if (exposureMode === "controlled") {
    level = "warning";
    message =
      culture === "tolerant"
        ? "Air quality is poor — brief, protected outdoor time is possible with precautions."
        : "Air quality is poor — limit outdoor time and use protection.";
  } else if (exposureMode === "indoor_only") {
    level = "critical";
    message =
      culture === "tolerant" && aqi <= 350
        ? "Air quality is very poor — stay indoors when possible; only essential brief outdoor time."
        : "Air quality is very poor — indoor activities are safest today.";
  }

  return { level, message, actions };
}

export function buildAqiAdvisory(
  aqi: number,
  country?: LaunchCountry | string,
  exposureMode?: ExposureMode,
): RoutineAqiAdvisory {
  const mode =
    exposureMode ?? resolveExposureModeForAqi(aqi, country ?? "IN");
  return buildGlobalAqiAdvisory(aqi, mode, country);
}

export function combineOutdoorAllowance(
  weatherAllowsOutdoor: boolean,
  aqiPolicy: AqiOutdoorPolicy,
): boolean {
  if (!weatherAllowsOutdoor) return false;
  if (!aqiPolicy.allowOutdoor) return false;
  return true;
}

const OUTDOOR_RE =
  /\b(outdoor|park|playground|backyard|beach|cricket|walk|nature|garden|soccer|football|sports)\b/i;

const HEAVY_OUTDOOR_RE =
  /\b(soccer|cricket|sports practice|football club|training|sports|obstacle|run|jog)\b/i;

export const EVENING_POLLUTION_PEAK: readonly [number, number] = [17 * 60, 20 * 60];

export function isEveningPollutionPeak(clockMins: number): boolean {
  const [start, end] = EVENING_POLLUTION_PEAK;
  return clockMins >= start && clockMins < end;
}

export function isOutdoorActivityItem(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  if (cat === "outdoor" || cat === "outdoor_play") return true;
  return OUTDOOR_RE.test(item.activity);
}

export function isHeavyOutdoorActivity(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  if (cat === "exercise" && HEAVY_OUTDOOR_RE.test(item.activity)) return true;
  return HEAVY_OUTDOOR_RE.test(item.activity) && isOutdoorActivityItem(item);
}

export function lightOutdoorWalkLabel(): string {
  return "Light outdoor walk (limited)";
}

function advisoryNotes(advisory: RoutineAqiAdvisory): string {
  return [advisory.message, ...advisory.actions].filter(Boolean).join(" ");
}

export function attachAqiAdvisory(
  item: RoutineScheduleItem,
  aqi: number,
  country?: LaunchCountry | string,
  exposureMode?: ExposureMode,
): RoutineScheduleItem {
  const policy = deriveAqiOutdoorPolicy(aqi, country ?? "IN");
  const mode = exposureMode ?? policy.exposureMode;
  const advisory = buildGlobalAqiAdvisory(aqi, mode, country);
  return {
    ...item,
    advisory,
    notes: [item.notes, advisoryNotes(advisory)].filter(Boolean).join(" "),
  };
}

/** Apply exposure-mode activity rules (global; replaces metro-only path). */
export function applyExposureModeAdaptations<T extends RoutineScheduleItem>(
  items: T[],
  opts: {
    aqi: number | null;
    country: LaunchCountry | string;
    policy: AqiOutdoorPolicy;
    schoolEndMins?: number;
    wakeMins?: number;
    environmentDataConfidence?: "high" | "medium" | "low";
  },
): T[] {
  if (opts.policy.exposureMode === "normal" || opts.aqi == null) {
    return items;
  }

  return applyMetroAqiActivityAdaptations(items, opts);
}

/** @deprecated Alias — global exposure adaptations. */
export function applyMetroAqiActivityAdaptations<T extends RoutineScheduleItem>(
  items: T[],
  opts: {
    aqi: number | null;
    country: LaunchCountry | string;
    policy: AqiOutdoorPolicy;
    schoolEndMins?: number;
    wakeMins?: number;
    environmentDataConfidence?: "high" | "medium" | "low";
  },
): T[] {
  const needsAdaptation =
    opts.policy.exposureMode !== "normal" && opts.policy.exposureMode !== "indoor_only";

  if (opts.policy.exposureMode === "indoor_only") {
    return items;
  }

  if (!needsAdaptation && !opts.policy.requireAirSafeBlocks) {
    return items.map((item) => {
      if (!opts.policy.requireAdvisory || opts.aqi == null) return item;
      if (!isOutdoorActivityItem(item) && !/\blight outdoor walk\b/i.test(item.activity)) {
        return item;
      }
      return attachAqiAdvisory(item, opts.aqi, opts.country, opts.policy.exposureMode) as T;
    });
  }

  const aqi = opts.aqi!;
  const schoolEnd = opts.schoolEndMins ?? 15 * 60;
  const wakeMins = opts.wakeMins ?? 7 * 60;
  let hasLimitedOutdoor = false;

  const adapted = items.map((item) => {
    let next = { ...item };

    if (opts.policy.lowIntensityOnly && isHeavyOutdoorActivity(next)) {
      next = {
        ...next,
        activity: lightOutdoorWalkLabel(),
        category: "outdoor",
        duration: Math.min(
          next.duration ?? 30,
          opts.policy.maxOutdoorDurationMins ?? 20,
        ),
        notes: [
          next.notes,
          "Heavy outdoor sports replaced with light movement for air quality.",
        ]
          .filter(Boolean)
          .join(" "),
      };
    }

    if (
      opts.policy.avoidEveningPeakPollution &&
      opts.environmentDataConfidence !== "low" &&
      isOutdoorActivityItem(next) &&
      isEveningPollutionPeak(parseTimeToMins(next.time))
    ) {
      const morningSlot = opts.policy.preferMorningOutdoor
        ? Math.max(wakeMins + 30, 7 * 60 + 30)
        : schoolEnd + 20;
      next = {
        ...next,
        time: minsToTime24(morningSlot),
        notes: [
          next.notes,
          "Moved earlier to avoid evening peak pollution and traffic.",
        ]
          .filter(Boolean)
          .join(" "),
      };
    }

    if (isOutdoorActivityItem(next) || /\blight outdoor walk\b/i.test(next.activity)) {
      hasLimitedOutdoor = true;
      if (opts.policy.maxOutdoorDurationMins != null) {
        const cap = opts.policy.maxOutdoorDurationMins;
        next.duration = Math.min(next.duration ?? cap, cap);
      }
      next = attachAqiAdvisory(next, aqi, opts.country, opts.policy.exposureMode) as T;
    }

    return next;
  });

  if (hasLimitedOutdoor || opts.policy.optionalOutdoor) {
    return adapted;
  }

  if (
    !hasLimitedOutdoor &&
    opts.policy.allowOutdoor &&
    (opts.policy.exposureMode === "controlled" || opts.policy.exposureMode === "limited")
  ) {
    const cap = opts.policy.maxOutdoorDurationMins ?? 20;
    const injectDur =
      opts.environmentDataConfidence === "low"
        ? Math.min(15, Math.max(10, cap))
        : cap;
    const walk: T = {
      time: minsToTime24(
        opts.policy.preferMorningOutdoor ? wakeMins + 45 : schoolEnd + 20,
      ),
      activity: lightOutdoorWalkLabel(),
      duration: injectDur,
      category: "outdoor",
      notes: "Brief protected outdoor — lower pollution than evening rush.",
      status: "pending",
    } as T;
    return [...adapted, attachAqiAdvisory(walk, aqi, opts.country, opts.policy.exposureMode) as T].sort(
      (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
    );
  }

  return adapted;
}

export function validateAqiOutdoorRules(
  items: RoutineScheduleItem[],
  aqi: number | null | undefined,
  country?: LaunchCountry | string,
): string[] {
  const warnings: string[] = [];
  if (aqi == null || !Number.isFinite(aqi)) return warnings;

  const policy = deriveAqiOutdoorPolicy(aqi, country ?? "IN");

  if (policy.exposureMode === "indoor_only") {
    for (const it of items) {
      if (isOutdoorActivityItem(it) && !/\bindoor\b/i.test(it.activity)) {
        warnings.push(
          `aqi-validation: outdoor "${it.activity}" when exposure=indoor_only (AQI=${aqi})`,
        );
      }
    }
  }

  if (aqi > 100) {
    const outdoorLike = items.filter(
      (it) =>
        isOutdoorActivityItem(it) ||
        /\blight outdoor walk\b/i.test(it.activity) ||
        (it.category === "outdoor"),
    );
    for (const it of outdoorLike) {
      if (!it.advisory?.level || !it.advisory?.message) {
        warnings.push(
          `aqi-validation: "${it.activity}" missing advisory when AQI=${aqi}`,
        );
      }
    }
  }

  if (
    policy.allowOutdoor &&
    (policy.exposureMode === "controlled" || policy.exposureMode === "limited") &&
    aqiCultureProfile(country ?? "IN") === "tolerant" &&
    aqi > 200
  ) {
    const outdoorItems = items.filter(
      (it) => isOutdoorActivityItem(it) || /\blight outdoor walk\b/i.test(it.activity),
    );
    if (!policy.optionalOutdoor && outdoorItems.length === 0) {
      warnings.push(
        `aqi-validation: tolerant region AQI ${aqi} — expected limited outdoor with advisory`,
      );
    }
  }

  if (policy.maxOutdoorDurationMins != null && policy.maxOutdoorDurationMins > 0) {
    for (const it of items) {
      if (!isOutdoorActivityItem(it) && !/\blight outdoor walk\b/i.test(it.activity)) {
        continue;
      }
      const dur = it.duration ?? 30;
      if (dur > policy.maxOutdoorDurationMins + 5) {
        warnings.push(
          `aqi-validation: "${it.activity}" ${dur}min exceeds cap (${policy.maxOutdoorDurationMins}min)`,
        );
      }
      if (policy.lowIntensityOnly && isHeavyOutdoorActivity(it)) {
        warnings.push(
          `aqi-validation: heavy outdoor "${it.activity}" not allowed in ${policy.exposureMode}`,
        );
      }
    }
  }

  return warnings;
}
