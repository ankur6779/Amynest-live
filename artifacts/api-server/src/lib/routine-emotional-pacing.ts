/**
 * Emotional pacing — mood-aware flow adaptation on top of metadata + load balancing.
 * Adjusts durations, activity tone, and connection windows without rescheduling anchors.
 */
import type { AgeGroup } from "./routine-templates.js";
import type {
  DayType,
  EnergyLevel,
  PreviousDayContext,
} from "./routine-context-engine.js";
import {
  attachActivityMetadata,
  getActivityMetadata,
  isHighEnergyActivity,
  itemFromPreset,
  pickCalmHotAfternoonPreset,
} from "./routine-activity-metadata.js";
import {
  downgradeHighEnergyBlock,
  inferBlockEnergyLevel,
  isProtectedScheduleBlock,
} from "./routine-category-taxonomy.js";
import {
  isLockedScheduleItem,
  isSleepItem,
  minsToTime24,
  normalizeTo24h,
  parseTimeToMins,
  type RoutineScheduleItem,
  type ScheduleDecisionMeta,
} from "./routine-scheduler.js";

const MIN_ACTIVITY_MINS = 10;
const MORNING_END_MINS = 12 * 60;
const AFTERNOON_END_MINS = 17 * 60 + 30;
const MIN_CONNECTION_GAP_MINS = 25;

export type EmotionalState =
  | "neutral"
  | "hyperactive"
  | "emotional"
  | "upset"
  | "tired"
  | "sick";

export type EmotionalFlowPattern =
  | "steady"
  | "energize_early"
  | "co_regulate"
  | "gentle_recovery";

export type EmotionalPacingProfile = {
  state: EmotionalState;
  flowPattern: EmotionalFlowPattern;
  durationFactor: number;
  studyDurationFactor: number;
  maxHighEnergyBlocks: number;
  maxConsecutiveDemand: number;
  preferConnectionBlocks: boolean;
  channelEnergyMorning: boolean;
  softenStudy: boolean;
  parentGuidance: string;
};

export type EmotionalPacingContext = {
  wakeMins: number;
  sleepMins: number;
  mood?: string;
  moodScore?: PreviousDayContext["moodScore"];
  sleepQuality?: PreviousDayContext["sleepQuality"];
  previousMoodScore?: PreviousDayContext["moodScore"];
  ageGroup?: AgeGroup;
  energyLevel?: EnergyLevel;
  dayType?: DayType;
  rainMode?: boolean;
  seed?: number;
};

export type EmotionalPacingAdjustment = {
  activity: string;
  change: string;
  state: EmotionalState;
};

export type EmotionalPacingResult = {
  items: RoutineScheduleItem[];
  profile: EmotionalPacingProfile;
  adjustments: EmotionalPacingAdjustment[];
};

function moodText(ctx: EmotionalPacingContext): string {
  return (ctx.mood ?? "").toLowerCase().trim();
}

/** Classify today's emotional tone from mood text + prior-day signals. */
export function inferEmotionalState(ctx: EmotionalPacingContext): EmotionalState {
  const mood = moodText(ctx);

  if (/\b(sick|ill|unwell|fever|recovering|not feeling well)\b/.test(mood)) {
    return "sick";
  }
  if (
    /\b(hyper|hyperactive|bouncy|wired|restless|energetic|can\'t sit)\b/.test(mood) ||
    (ctx.energyLevel === "high" &&
      /\b(active|excited)\b/.test(mood))
  ) {
    return "hyperactive";
  }
  if (/\b(upset|angry|mad|frustrated|meltdown|tantrum|crying|furious)\b/.test(mood)) {
    return "upset";
  }
  if (
    /\b(emotional|sensitive|anxious|worried|overwhelmed|tearful|big feelings)\b/.test(mood)
  ) {
    return "emotional";
  }
  if (
    /\b(tired|sleepy|exhausted|low energy|low|drained|wiped)\b/.test(mood) ||
    ctx.moodScore === "tired" ||
    ctx.moodScore === "cranky" ||
    ctx.sleepQuality === "poor"
  ) {
    return "tired";
  }
  if (ctx.previousMoodScore === "cranky" && ctx.moodScore !== "happy") {
    return "emotional";
  }
  if (ctx.dayType === "low-energy" && ctx.energyLevel === "low") {
    return "tired";
  }

  return "neutral";
}

/** Deterministic pacing plan for the inferred emotional state. */
export function deriveEmotionalPacingProfile(
  ctx: EmotionalPacingContext,
  state: EmotionalState = inferEmotionalState(ctx),
): EmotionalPacingProfile {
  switch (state) {
    case "hyperactive":
      return {
        state,
        flowPattern: "energize_early",
        durationFactor: 1.05,
        studyDurationFactor: 0.9,
        maxHighEnergyBlocks: 4,
        maxConsecutiveDemand: 3,
        preferConnectionBlocks: false,
        channelEnergyMorning: true,
        softenStudy: false,
        parentGuidance:
          "Channel energy early with movement, then taper into focused blocks before wind-down.",
      };
    case "upset":
      return {
        state,
        flowPattern: "co_regulate",
        durationFactor: 0.82,
        studyDurationFactor: 0.75,
        maxHighEnergyBlocks: 1,
        maxConsecutiveDemand: 2,
        preferConnectionBlocks: true,
        channelEnergyMorning: false,
        softenStudy: true,
        parentGuidance:
          "Keep the pace predictable, lower demands, and prioritize connection before tasks.",
      };
    case "emotional":
      return {
        state,
        flowPattern: "co_regulate",
        durationFactor: 0.88,
        studyDurationFactor: 0.85,
        maxHighEnergyBlocks: 2,
        maxConsecutiveDemand: 2,
        preferConnectionBlocks: true,
        channelEnergyMorning: false,
        softenStudy: true,
        parentGuidance:
          "Offer calm transitions, name feelings, and avoid stacking intense blocks back-to-back.",
      };
    case "tired":
      return {
        state,
        flowPattern: "gentle_recovery",
        durationFactor: 0.8,
        studyDurationFactor: 0.8,
        maxHighEnergyBlocks: 1,
        maxConsecutiveDemand: 2,
        preferConnectionBlocks: false,
        channelEnergyMorning: false,
        softenStudy: true,
        parentGuidance:
          "Shorter blocks, more rest, and earlier calming activities — stop if signs of fatigue.",
      };
    case "sick":
      return {
        state,
        flowPattern: "gentle_recovery",
        durationFactor: 0.72,
        studyDurationFactor: 0.65,
        maxHighEnergyBlocks: 1,
        maxConsecutiveDemand: 1,
        preferConnectionBlocks: true,
        channelEnergyMorning: false,
        softenStudy: true,
        parentGuidance:
          "Recovery pacing — low stimulation, hydration, rest, and flexible expectations.",
      };
    default:
      return {
        state: "neutral",
        flowPattern: "steady",
        durationFactor: 1,
        studyDurationFactor: 1,
        maxHighEnergyBlocks: 99,
        maxConsecutiveDemand: 4,
        preferConnectionBlocks: false,
        channelEnergyMorning: false,
        softenStudy: false,
        parentGuidance: "Balanced day — standard pacing.",
      };
  }
}

function isFlexibleForEmotion(item: RoutineScheduleItem): boolean {
  return (
    !isProtectedScheduleBlock(item) &&
    !isLockedScheduleItem(item) &&
    !isSleepItem(item)
  );
}

function isStudyLike(item: RoutineScheduleItem): boolean {
  const meta = getActivityMetadata(item);
  if (meta.category === "study") return true;
  const cat = (item.category ?? "").toLowerCase();
  return (
    cat === "study" ||
    /\b(homework|tuition|learning block|extra study)\b/i.test(item.activity)
  );
}

function isMealOrSchool(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  if (cat === "meal" || cat === "tiffin" || cat === "school") return true;
  return /\b(breakfast|lunch|dinner|at school)\b/i.test(item.activity);
}

function tagDecision(
  item: RoutineScheduleItem,
  reason: string,
  originalActivity?: string,
): RoutineScheduleItem {
  const decision: ScheduleDecisionMeta = {
    reason,
    source: "preference",
    originalActivity: originalActivity ?? item.activity,
  };
  return { ...item, scheduleDecision: decision };
}

function appendNote(item: RoutineScheduleItem, note: string): RoutineScheduleItem {
  const existing = item.notes?.trim();
  if (existing?.includes(note)) return item;
  return {
    ...item,
    notes: existing ? `${existing} ${note}` : note,
  };
}

function clampDuration(duration: number, min = MIN_ACTIVITY_MINS, max = 90): number {
  return Math.max(min, Math.min(max, Math.round(duration)));
}

function applyDurationFactor(
  item: RoutineScheduleItem,
  factor: number,
  studyFactor: number,
): RoutineScheduleItem {
  const base = item.duration ?? 30;
  const f = isStudyLike(item) ? studyFactor : factor;
  const next = clampDuration(base * f);
  if (next === base) return item;
  return { ...item, duration: next };
}

function softenToCalm(
  item: RoutineScheduleItem,
  seed: number,
  rainMode?: boolean,
): RoutineScheduleItem {
  if (inferBlockEnergyLevel(item) === "high" || isHighEnergyActivity(item)) {
    return attachActivityMetadata(
      tagDecision(
        downgradeHighEnergyBlock(item, rainMode),
        "Emotion: replaced high stimulation with a calmer block",
        item.activity,
      ),
    );
  }
  const preset = pickCalmHotAfternoonPreset(seed);
  return attachActivityMetadata(
    tagDecision(
      {
        ...item,
        activity: preset.activity,
        category: preset.category,
        energyImpact: "low",
        duration: Math.min(item.duration ?? 30, 25),
      },
      "Emotion: softened activity for co-regulation",
      item.activity,
    ),
  );
}

function softenStudyBlock(
  item: RoutineScheduleItem,
  seed: number,
): RoutineScheduleItem {
  const shortened = applyDurationFactor(item, 1, 0.75);
  if (inferBlockEnergyLevel(shortened) === "high") {
    return softenToCalm(shortened, seed);
  }
  const preset = pickCalmHotAfternoonPreset(seed + 3);
  return attachActivityMetadata(
    tagDecision(
      {
        ...shortened,
        activity:
          shortened.duration && shortened.duration <= 15
            ? "Calm reading nook"
            : shortened.activity,
        category: shortened.duration && shortened.duration <= 15 ? "rest" : "study",
        energyImpact: "low",
        notes:
          "Lighter cognitive load while emotions are elevated — pause if frustration shows.",
      },
      "Emotion: reduced study demand",
      item.activity,
    ),
  );
}

function channelMorningEnergy(
  item: RoutineScheduleItem,
  seed: number,
  rainMode?: boolean,
): RoutineScheduleItem {
  const start = parseTimeToMins(normalizeTo24h(item.time));
  if (start >= MORNING_END_MINS) return item;
  const meta = getActivityMetadata(item);
  if (meta.intensity === "high") return item;

  if (rainMode) {
    return attachActivityMetadata(
      tagDecision(
        itemFromPreset("indoor_obstacle", {
          time: item.time,
          duration: Math.min(35, (item.duration ?? 30) + 5),
          status: item.status ?? "pending",
          notes: "Morning movement channel — indoor circuit for active mood.",
          energyImpact: "medium",
        }),
        "Emotion: morning movement channel (indoor)",
        item.activity,
      ),
    );
  }

  return attachActivityMetadata(
    tagDecision(
      {
        ...item,
        activity: "Morning movement & games",
        category: "play",
        duration: Math.min(40, (item.duration ?? 30) + 5),
        energyImpact: "medium",
        notes: "Front-loaded movement to match high energy — hydrate after.",
      },
      "Emotion: morning energy channel",
      item.activity,
    ),
  );
}

function findLargestGap(
  items: RoutineScheduleItem[],
  wakeMins: number,
  sleepMins: number,
): { start: number; duration: number } | null {
  const sorted = [...items]
    .filter((it) => !isSleepItem(it))
    .sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));

  let best: { start: number; duration: number } | null = null;

  const consider = (start: number, end: number) => {
    const gap = end - start;
    if (gap >= MIN_CONNECTION_GAP_MINS + MIN_ACTIVITY_MINS) {
      const dur = Math.min(25, gap - 5);
      if (!best || gap > best.duration + 5) {
        best = { start: start + 5, duration: dur };
      }
    }
  };

  if (sorted.length) {
    consider(wakeMins, parseTimeToMins(sorted[0]!.time));
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const end =
      parseTimeToMins(sorted[i]!.time) + (sorted[i]!.duration ?? 30);
    const next = parseTimeToMins(sorted[i + 1]!.time);
    consider(end, next);
  }

  if (sorted.length) {
    const last = sorted[sorted.length - 1]!;
    const lastEnd = parseTimeToMins(last.time) + (last.duration ?? 30);
    consider(lastEnd, sleepMins - 55);
  }

  return best;
}

const CONNECTION_ACTIVITY_VARIANTS = [
  "Connection & check-in",
  "Calm together time",
  "Family reset moment",
  "Quiet check-in together",
] as const;

function connectionActivityLabel(seed: number): string {
  const i = Math.abs(seed) % CONNECTION_ACTIVITY_VARIANTS.length;
  return CONNECTION_ACTIVITY_VARIANTS[i]!;
}

function insertConnectionBlock(
  items: RoutineScheduleItem[],
  ctx: EmotionalPacingContext,
  profile: EmotionalPacingProfile,
): RoutineScheduleItem[] {
  const gap = findLargestGap(items, ctx.wakeMins, ctx.sleepMins);
  if (!gap) return items;

  const exists = items.some(
    (it) =>
      /\b(connection|check-in|calm together|co-regulation)\b/i.test(it.activity) ||
      /\bfamily time together\b/i.test(it.activity),
  );
  if (exists) return items;

  const label = connectionActivityLabel(ctx.seed + gap.start);
  const block = itemFromPreset("family_time", {
    time: minsToTime24(gap.start),
    duration: gap.duration,
    status: "pending",
    activity: label,
    notes: `${label} — brief calm together time before the next transition.`,
    energyImpact: "low",
  });

  return [
    ...items,
    tagDecision(
      block,
      `Emotion: ${profile.state} — added a connection window`,
    ),
  ].sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));
}

function breakDemandRuns(
  items: RoutineScheduleItem[],
  profile: EmotionalPacingProfile,
  seed: number,
  rainMode?: boolean,
): RoutineScheduleItem[] {
  const sorted = items
    .map((it, index) => ({ it, index }))
    .filter(({ it }) => isFlexibleForEmotion(it))
    .sort(
      (a, b) =>
        parseTimeToMins(a.it.time) - parseTimeToMins(b.it.time),
    );

  let run = 0;
  let softened = 0;
  const out = [...items];

  for (const { it, index } of sorted) {
    const meta = getActivityMetadata(it);
    const demanding =
      meta.intensity !== "low" &&
      meta.category !== "meal" &&
      meta.category !== "self-care" &&
      !isMealOrSchool(it);

    if (demanding) {
      run += 1;
      if (run > profile.maxConsecutiveDemand) {
        out[index] = softenToCalm(it, seed + index + softened, rainMode);
        softened += 1;
        run = 0;
      }
    } else {
      run = 0;
    }
  }

  return out;
}

function capHighEnergyBlocks(
  items: RoutineScheduleItem[],
  profile: EmotionalPacingProfile,
  seed: number,
  rainMode?: boolean,
): RoutineScheduleItem[] {
  const high = items
    .map((it, index) => ({ it, index }))
    .filter(
      ({ it }) =>
        isFlexibleForEmotion(it) &&
        (isHighEnergyActivity(it) || inferBlockEnergyLevel(it) === "high"),
    )
    .sort((a, b) => {
      const aStart = parseTimeToMins(a.it.time);
      const bStart = parseTimeToMins(b.it.time);
      if (profile.state === "hyperactive") return aStart - bStart;
      return bStart - aStart;
    });

  if (high.length <= profile.maxHighEnergyBlocks) return items;

  const out = [...items];
  const excess = high.length - profile.maxHighEnergyBlocks;
  for (let i = 0; i < excess; i++) {
    const { it, index } = high[profile.state === "hyperactive" ? high.length - 1 - i : i]!;
    out[index] = softenToCalm(it, seed + i * 7, rainMode);
  }
  return out;
}

/**
 * Adapt scheduled items for emotional believability — deterministic, metadata-first.
 */
export function adaptRoutineForEmotion(
  items: RoutineScheduleItem[],
  ctx: EmotionalPacingContext,
): EmotionalPacingResult {
  const state = inferEmotionalState(ctx);
  const profile = deriveEmotionalPacingProfile(ctx, state);
  const adjustments: EmotionalPacingAdjustment[] = [];

  if (state === "neutral") {
    return { items, profile, adjustments };
  }

  const seed = ctx.seed ?? ctx.wakeMins + ctx.sleepMins;
  let working = items.map((it) => ({ ...it }));

  working = capHighEnergyBlocks(working, profile, seed, ctx.rainMode);
  working = breakDemandRuns(working, profile, seed, ctx.rainMode);

  let morningEnergized = false;

  for (let i = 0; i < working.length; i++) {
    let item = working[i]!;
    if (!isFlexibleForEmotion(item)) continue;

    const before = item.activity;
    const start = parseTimeToMins(normalizeTo24h(item.time));

    item = applyDurationFactor(
      item,
      profile.durationFactor,
      profile.studyDurationFactor,
    );

    if (profile.softenStudy && isStudyLike(item)) {
      item = softenStudyBlock(item, seed + i);
    }

    if (
      profile.state === "hyperactive" &&
      profile.channelEnergyMorning &&
      !morningEnergized &&
      start < MORNING_END_MINS &&
      !isStudyLike(item) &&
      !isMealOrSchool(item)
    ) {
      item = channelMorningEnergy(item, seed + i, ctx.rainMode);
      morningEnergized = true;
    }

    if (
      (profile.state === "upset" || profile.state === "emotional") &&
      (isHighEnergyActivity(item) || inferBlockEnergyLevel(item) === "high")
    ) {
      item = softenToCalm(item, seed + i, ctx.rainMode);
    }

    if (profile.state === "tired" || profile.state === "sick") {
      if (isHighEnergyActivity(item) || inferBlockEnergyLevel(item) === "high") {
        item = softenToCalm(item, seed + i, ctx.rainMode);
      }
      if (start >= AFTERNOON_END_MINS && !isStudyLike(item)) {
        item = appendNote(
          item,
          "Wind-down friendly — keep voice soft and transitions slow.",
        );
      }
    }

    if (profile.state === "sick") {
      item = appendNote(
        item,
        "Recovery day — offer fluids, rest, and flexible expectations.",
      );
    }

    if (profile.state === "upset") {
      item = appendNote(
        item,
        "Validate feelings first; shorten or pause if escalation appears.",
      );
    }

    if (item.activity !== before || item.duration !== working[i]!.duration) {
      adjustments.push({
        activity: before,
        change:
          item.activity !== before
            ? `${before} → ${item.activity}`
            : `duration → ${item.duration ?? 30}min`,
        state: profile.state,
      });
    }

    working[i] = item;
  }

  if (profile.preferConnectionBlocks) {
    const beforeLen = working.length;
    working = insertConnectionBlock(working, ctx, profile);
    if (working.length > beforeLen) {
      adjustments.push({
        activity: "Connection & check-in",
        change: "inserted co-regulation window",
        state: profile.state,
      });
    }
  }

  return { items: working, profile, adjustments };
}
