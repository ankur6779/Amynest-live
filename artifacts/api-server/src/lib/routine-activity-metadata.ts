/**
 * Metadata-driven activity model — reduces scattered regex heuristics across
 * weather, cultural, and scheduling passes. Legacy category strings remain for
 * backward compatibility; new logic should prefer `activityMeta`.
 */
import type { AgeGroup } from "./routine-templates.js";
import type { RoutineScheduleItem } from "./routine-scheduler.js";
import { isSleepItem } from "./routine-scheduler.js";

export type ActivityMetaCategory =
  | "play"
  | "study"
  | "creative"
  | "movement"
  | "meal"
  | "rest"
  | "social"
  | "self-care";

export type ActivityIntensity = "low" | "medium" | "high";

export type ActivityEnvironment = "indoor" | "outdoor" | "either";

export type ActivityMetadata = {
  category: ActivityMetaCategory;
  intensity: ActivityIntensity;
  environment: ActivityEnvironment;
  ageGroups: AgeGroup[];
  weatherSafe: boolean;
  heatRestricted: boolean;
  calmingScore: number;
  autonomyFriendly?: boolean;
};

export type ActivityMetadataPreset = ActivityMetadata & {
  /** Stable catalog id for analytics / tests */
  id: string;
  /** Display labels this preset applies to (normalized) */
  labels: readonly string[];
};

const ALL_AGE_GROUPS: readonly AgeGroup[] = [
  "infant",
  "toddler",
  "preschool",
  "early_school",
  "pre_teen",
];

function meta(
  partial: Omit<ActivityMetadata, "ageGroups"> & { ageGroups?: AgeGroup[] },
): ActivityMetadata {
  return {
    ageGroups: partial.ageGroups ?? [...ALL_AGE_GROUPS],
    ...partial,
  };
}

/** Known activities — exact label match after normalization. */
export const ACTIVITY_METADATA_CATALOG: readonly ActivityMetadataPreset[] = [
  {
    id: "outdoor_play",
    labels: ["outdoor play", "park play", "backyard cricket", "morning outdoor play"],
    ...meta({
      category: "play",
      intensity: "high",
      environment: "outdoor",
      weatherSafe: false,
      heatRestricted: true,
      calmingScore: 2,
    }),
  },
  {
    id: "indoor_creative_play",
    labels: ["indoor creative play", "creative play", "creative play time"],
    ...meta({
      category: "creative",
      intensity: "medium",
      environment: "indoor",
      weatherSafe: true,
      heatRestricted: true,
      calmingScore: 4,
    }),
  },
  {
    id: "quiet_puzzles",
    labels: ["quiet puzzles & drawing", "quiet creative play"],
    ...meta({
      category: "rest",
      intensity: "low",
      environment: "indoor",
      weatherSafe: true,
      heatRestricted: false,
      calmingScore: 8,
    }),
  },
  {
    id: "calm_reading",
    labels: ["calm reading nook", "low-key indoor time"],
    ...meta({
      category: "rest",
      intensity: "low",
      environment: "indoor",
      weatherSafe: true,
      heatRestricted: false,
      calmingScore: 9,
    }),
  },
  {
    id: "soccer_practice",
    labels: ["soccer practice", "football club", "sports practice"],
    ...meta({
      category: "movement",
      intensity: "high",
      environment: "outdoor",
      weatherSafe: false,
      heatRestricted: true,
      calmingScore: 2,
    }),
  },
  {
    id: "homework",
    labels: ["homework", "homework time", "learning block", "extra study"],
    ...meta({
      category: "study",
      intensity: "medium",
      environment: "indoor",
      weatherSafe: true,
      heatRestricted: false,
      calmingScore: 5,
      autonomyFriendly: true,
    }),
  },
  {
    id: "indoor_obstacle",
    labels: ["indoor obstacle course", "living-room sports circuit"],
    ...meta({
      category: "movement",
      intensity: "high",
      environment: "indoor",
      weatherSafe: true,
      heatRestricted: true,
      calmingScore: 3,
    }),
  },
  {
    id: "dance_party",
    labels: ["dance party & movement"],
    ...meta({
      category: "movement",
      intensity: "high",
      environment: "indoor",
      weatherSafe: true,
      heatRestricted: true,
      calmingScore: 3,
    }),
  },
  {
    id: "cozy_indoor",
    labels: ["cozy indoor play", "cozy indoor warm-up"],
    ...meta({
      category: "creative",
      intensity: "low",
      environment: "indoor",
      weatherSafe: true,
      heatRestricted: false,
      calmingScore: 7,
    }),
  },
  {
    id: "wind_down",
    labels: ["wind-down & story", "quiet wind-down time", "lights out"],
    ...meta({
      category: "rest",
      intensity: "low",
      environment: "indoor",
      weatherSafe: true,
      heatRestricted: false,
      calmingScore: 9,
    }),
  },
  {
    id: "family_time",
    labels: ["family time", "family time together", "tea time together"],
    ...meta({
      category: "social",
      intensity: "low",
      environment: "indoor",
      weatherSafe: true,
      heatRestricted: false,
      calmingScore: 6,
    }),
  },
  {
    id: "wake_up",
    labels: ["wake up", "wake up & freshen up"],
    ...meta({
      category: "self-care",
      intensity: "low",
      environment: "indoor",
      weatherSafe: true,
      heatRestricted: false,
      calmingScore: 5,
    }),
  },
];

const CATALOG_BY_LABEL = new Map<string, ActivityMetadata>();
for (const preset of ACTIVITY_METADATA_CATALOG) {
  for (const label of preset.labels) {
    CATALOG_BY_LABEL.set(normalizeActivityKey(label), stripPreset(preset));
  }
}

function stripPreset(preset: ActivityMetadataPreset): ActivityMetadata {
  const { id: _id, labels: _labels, ...m } = preset;
  return { ...m, ageGroups: [...m.ageGroups] };
}

export function normalizeActivityKey(activity: string): string {
  return activity
    .replace(/\s*\([^)]*\)/gi, "")
    .replace(/\s*—\s*.*/g, "")
    .trim()
    .toLowerCase();
}

type PatternRule = {
  id: string;
  when: (item: RoutineScheduleItem) => boolean;
  meta: Partial<ActivityMetadata>;
};

/** Ordered rules — first match wins after catalog lookup. */
const ACTIVITY_PATTERN_RULES: readonly PatternRule[] = [
  {
    id: "sleep",
    when: (it) => isSleepItem(it),
    meta: {
      category: "rest",
      intensity: "low",
      environment: "indoor",
      weatherSafe: true,
      heatRestricted: false,
      calmingScore: 10,
    },
  },
  {
    id: "meal",
    when: (it) =>
      ["meal", "tiffin"].includes((it.category ?? "").toLowerCase()) ||
      /\b(breakfast|lunch|dinner|snack|tiffin|refuel)\b/i.test(it.activity),
    meta: {
      category: "meal",
      intensity: "low",
      environment: "indoor",
      weatherSafe: true,
      heatRestricted: false,
      calmingScore: 5,
    },
  },
  {
    id: "school",
    when: (it) => (it.category ?? "").toLowerCase() === "school",
    meta: {
      category: "study",
      intensity: "medium",
      environment: "indoor",
      weatherSafe: true,
      heatRestricted: false,
      calmingScore: 4,
    },
  },
  {
    id: "outdoor_keyword",
    when: (it) =>
      (it.category ?? "").toLowerCase() === "outdoor" ||
      /\b(outdoor|park|playground|backyard|cricket|beach|nature walk)\b/i.test(
        it.activity,
      ),
    meta: {
      category: "play",
      intensity: "high",
      environment: "outdoor",
      weatherSafe: false,
      heatRestricted: true,
      calmingScore: 2,
    },
  },
  {
    id: "calm_keyword",
    when: (it) =>
      /\b(quiet|cozy|calm|wind.?down|story|breathing-safe|board games|air-safe|low-key|puzzle)\b/i.test(
        it.activity,
      ),
    meta: {
      category: "rest",
      intensity: "low",
      environment: "indoor",
      weatherSafe: true,
      heatRestricted: false,
      calmingScore: 8,
    },
  },
  {
    id: "study_keyword",
    when: (it) =>
      ["study", "homework"].includes((it.category ?? "").toLowerCase()) ||
      /\b(homework|study|tuition|learning|revision)\b/i.test(it.activity),
    meta: {
      category: "study",
      intensity: "medium",
      environment: "indoor",
      weatherSafe: true,
      heatRestricted: false,
      calmingScore: 5,
      autonomyFriendly: true,
    },
  },
  {
    id: "movement_sport",
    when: (it) =>
      (it.category ?? "").toLowerCase() === "exercise" ||
      /\b(soccer|football|sports|obstacle|dance party|circuit)\b/i.test(it.activity),
    meta: {
      category: "movement",
      intensity: "high",
      environment: "either",
      weatherSafe: false,
      heatRestricted: true,
      calmingScore: 3,
    },
  },
  {
    id: "creative_play",
    when: (it) =>
      (it.category ?? "").toLowerCase() === "creative" ||
      /\b(creative|crafts|drawing|lego|building blocks)\b/i.test(it.activity),
    meta: {
      category: "creative",
      intensity: "medium",
      environment: "indoor",
      weatherSafe: true,
      heatRestricted: true,
      calmingScore: 4,
    },
  },
  {
    id: "play_generic",
    when: (it) => (it.category ?? "").toLowerCase() === "play",
    meta: {
      category: "play",
      intensity: "medium",
      environment: "either",
      weatherSafe: true,
      heatRestricted: true,
      calmingScore: 4,
    },
  },
  {
    id: "family_social",
    when: (it) =>
      (it.category ?? "").toLowerCase() === "family" ||
      /\bfamily\b/i.test(it.activity),
    meta: {
      category: "social",
      intensity: "low",
      environment: "indoor",
      weatherSafe: true,
      heatRestricted: false,
      calmingScore: 6,
    },
  },
  {
    id: "hygiene",
    when: (it) =>
      ["hygiene", "morning_routine", "travel"].includes(
        (it.category ?? "").toLowerCase(),
      ),
    meta: {
      category: "self-care",
      intensity: "low",
      environment: "indoor",
      weatherSafe: true,
      heatRestricted: false,
      calmingScore: 5,
    },
  },
];

function baseFromScheduleCategory(category: string): ActivityMetadata {
  const cat = category.toLowerCase();
  switch (cat) {
    case "meal":
    case "tiffin":
      return meta({
        category: "meal",
        intensity: "low",
        environment: "indoor",
        weatherSafe: true,
        heatRestricted: false,
        calmingScore: 5,
      });
    case "school":
      return meta({
        category: "study",
        intensity: "medium",
        environment: "indoor",
        weatherSafe: true,
        heatRestricted: false,
        calmingScore: 4,
      });
    case "sleep":
      return meta({
        category: "rest",
        intensity: "low",
        environment: "indoor",
        weatherSafe: true,
        heatRestricted: false,
        calmingScore: 10,
      });
    case "outdoor":
      return meta({
        category: "play",
        intensity: "high",
        environment: "outdoor",
        weatherSafe: false,
        heatRestricted: true,
        calmingScore: 2,
      });
    case "exercise":
      return meta({
        category: "movement",
        intensity: "high",
        environment: "either",
        weatherSafe: false,
        heatRestricted: true,
        calmingScore: 3,
      });
    case "creative":
      return meta({
        category: "creative",
        intensity: "medium",
        environment: "indoor",
        weatherSafe: true,
        heatRestricted: true,
        calmingScore: 4,
      });
    case "study":
    case "homework":
      return meta({
        category: "study",
        intensity: "medium",
        environment: "indoor",
        weatherSafe: true,
        heatRestricted: false,
        calmingScore: 5,
        autonomyFriendly: true,
      });
    case "rest":
      return meta({
        category: "rest",
        intensity: "low",
        environment: "indoor",
        weatherSafe: true,
        heatRestricted: false,
        calmingScore: 7,
      });
    case "family":
      return meta({
        category: "social",
        intensity: "low",
        environment: "indoor",
        weatherSafe: true,
        heatRestricted: false,
        calmingScore: 6,
      });
    case "play":
      return meta({
        category: "play",
        intensity: "medium",
        environment: "either",
        weatherSafe: true,
        heatRestricted: true,
        calmingScore: 4,
      });
    default:
      return meta({
        category: "play",
        intensity: "medium",
        environment: "either",
        weatherSafe: true,
        heatRestricted: false,
        calmingScore: 5,
      });
  }
}

function mergeMetadata(
  base: ActivityMetadata,
  overlay: Partial<ActivityMetadata>,
): ActivityMetadata {
  return {
    ...base,
    ...overlay,
    ageGroups: overlay.ageGroups ?? base.ageGroups,
  };
}

/** Infer metadata from label, schedule category, and pattern rules. */
export function inferActivityMetadata(item: RoutineScheduleItem): ActivityMetadata {
  const key = normalizeActivityKey(item.activity);
  const catalog = CATALOG_BY_LABEL.get(key);
  if (catalog) {
    return { ...catalog, ageGroups: [...catalog.ageGroups] };
  }

  for (const rule of ACTIVITY_PATTERN_RULES) {
    if (rule.when(item)) {
      const base = baseFromScheduleCategory(item.category ?? "play");
      return mergeMetadata(base, rule.meta);
    }
  }

  return baseFromScheduleCategory(item.category ?? "play");
}

/** Resolved metadata — uses attached meta when present. */
export function getActivityMetadata(item: RoutineScheduleItem): ActivityMetadata {
  if (item.activityMeta) {
    return {
      ...item.activityMeta,
      ageGroups: [...item.activityMeta.ageGroups],
    };
  }
  return inferActivityMetadata(item);
}

export function attachActivityMetadata<T extends RoutineScheduleItem>(
  item: T,
  override?: Partial<ActivityMetadata>,
): T & { activityMeta: ActivityMetadata } {
  const inferred = inferActivityMetadata(item);
  const activityMeta = override
    ? mergeMetadata(inferred, override)
    : inferred;
  return { ...item, activityMeta };
}

export function enrichItemsWithActivityMetadata<T extends RoutineScheduleItem>(
  items: T[],
): Array<T & { activityMeta: ActivityMetadata }> {
  return items.map((item) => attachActivityMetadata(item));
}

export function metadataForPresetId(id: string): ActivityMetadata | null {
  const preset = ACTIVITY_METADATA_CATALOG.find((p) => p.id === id);
  return preset ? stripPreset(preset) : null;
}

/** Preset id for a catalog label, if any. */
export function presetIdForActivity(activity: string): string | null {
  const key = normalizeActivityKey(activity);
  const preset = ACTIVITY_METADATA_CATALOG.find((p) =>
    p.labels.some((l) => normalizeActivityKey(l) === key),
  );
  return preset?.id ?? null;
}

/**
 * Deterministic alternate label from the same preset — avoids unstable randomness.
 * Returns null when no safe rotation exists.
 */
export function pickDeterministicFreshLabel(
  activity: string,
  seed: number,
  avoidKeys: ReadonlySet<string>,
): string | null {
  const key = normalizeActivityKey(activity);
  const preset = ACTIVITY_METADATA_CATALOG.find((p) =>
    p.labels.some((l) => normalizeActivityKey(l) === key),
  );
  if (!preset || preset.labels.length < 2) return null;

  const labels = preset.labels.map((l) => l.trim());
  const start = Math.abs(seed) % labels.length;
  for (let i = 0; i < labels.length; i++) {
    const label = labels[(start + i) % labels.length]!;
    const labelKey = normalizeActivityKey(label);
    if (labelKey !== key && !avoidKeys.has(labelKey)) {
      return label;
    }
  }
  return null;
}

export function matchesAgeGroup(
  meta: ActivityMetadata,
  ageGroup: AgeGroup,
): boolean {
  return meta.ageGroups.includes(ageGroup);
}

export function isCalmAfternoonSuitable(meta: ActivityMetadata): boolean {
  return (
    meta.calmingScore >= 7 ||
    (meta.intensity === "low" &&
      (meta.category === "rest" || meta.category === "social"))
  );
}

export function isPeakHeatRestricted(meta: ActivityMetadata): boolean {
  if (meta.heatRestricted) return true;
  if (meta.intensity === "high") return true;
  if (
    meta.intensity === "medium" &&
    (meta.category === "play" ||
      meta.category === "movement" ||
      meta.category === "creative")
  ) {
    return true;
  }
  return false;
}

/** Blocks that should not sit in the 12:00–17:30 hot window. */
export function isHotAfternoonActiveBlock(item: RoutineScheduleItem): boolean {
  const meta = getActivityMetadata(item);
  if (meta.category === "meal" || meta.category === "self-care") return false;
  if (isCalmAfternoonSuitable(meta)) return false;
  if (meta.category === "study" && meta.intensity !== "high") return false;
  if (meta.category === "social" && meta.intensity === "low") return false;
  return isPeakHeatRestricted(meta);
}

export function isOutdoorActivity(item: RoutineScheduleItem): boolean {
  const meta = getActivityMetadata(item);
  if (meta.environment === "outdoor") return true;
  if (meta.environment === "indoor") return false;
  return meta.category === "play" && meta.intensity === "high" && !meta.weatherSafe;
}

export function isWeatherSensitiveActivity(item: RoutineScheduleItem): boolean {
  const meta = getActivityMetadata(item);
  if (!meta.weatherSafe) return true;
  return isOutdoorActivity(item);
}

export function isHighEnergyActivity(item: RoutineScheduleItem): boolean {
  const meta = getActivityMetadata(item);
  return meta.intensity === "high";
}

export function pickCalmHotAfternoonPreset(seed: number): {
  activity: string;
  category: string;
  meta: ActivityMetadata;
} {
  const presets = ["quiet_puzzles", "calm_reading"] as const;
  const id = presets[Math.abs(seed) % presets.length]!;
  const meta = metadataForPresetId(id)!;
  const catalog = ACTIVITY_METADATA_CATALOG.find((p) => p.id === id)!;
  return {
    activity: catalog.labels[0]!,
    category: meta.category === "rest" ? "rest" : "creative",
    meta,
  };
}

export function itemFromPreset(
  id: string,
  fields: Pick<RoutineScheduleItem, "time" | "duration"> &
    Partial<RoutineScheduleItem>,
): RoutineScheduleItem & { activityMeta: ActivityMetadata } {
  const preset = ACTIVITY_METADATA_CATALOG.find((p) => p.id === id);
  if (!preset) {
    throw new Error(`Unknown activity preset: ${id}`);
  }
  const meta = stripPreset(preset);
  return attachActivityMetadata({
    activity: preset.labels[0]!,
    category:
      meta.category === "movement"
        ? "exercise"
        : meta.category === "study"
          ? "study"
          : meta.category === "meal"
            ? "meal"
            : meta.category === "rest"
              ? "rest"
              : meta.category === "creative"
                ? "creative"
                : "play",
    notes: "",
    status: "pending",
    ...fields,
  });
}
