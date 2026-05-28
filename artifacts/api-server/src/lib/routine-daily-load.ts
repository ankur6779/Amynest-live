/**
 * Daily load + energy balancing — full-day stimulation pacing using activity metadata.
 * Complements overlap resolution and the evening-only `enforceEnergyCurve` pass.
 */
import type { AgeGroup } from "./routine-templates.js";
import type { DayType, EnergyLevel, PreviousDayContext } from "./routine-context-engine.js";
import {
  attachActivityMetadata,
  getActivityMetadata,
  isHighEnergyActivity,
  itemFromPreset,
  pickCalmHotAfternoonPreset,
  type ActivityMetadata,
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
} from "./routine-scheduler.js";

const MIN_ACTIVITY_MINS = 10;
const MIN_RECOVERY_GAP_MINS = 20;
const EVENING_STIM_CUTOFF_MINS = 17 * 60 + 30;
const EVENING_HARD_CUTOFF_MINS = 18 * 60 + 30;

export type DailyLoadPeriod = "morning" | "afternoon" | "evening";

export type DailyLoadLimits = {
  maxHighEnergyBlocks: number;
  maxStudyBlocks: number;
  maxStudyClusterSize: number;
  maxCognitiveLoadScore: number;
  maxTotalStimulationScore: number;
  maxEveningStimulationScore: number;
  minRecoveryGaps: number;
  minRecoveryGapMins: number;
  /** Target calming blocks when recovery is thin. */
  minCalmBlocks: number;
  pacingMode: "normal" | "gentle" | "recovery";
};

export type DailyLoadBlockMetrics = {
  index: number;
  activity: string;
  startMins: number;
  durationMins: number;
  period: DailyLoadPeriod;
  stimulationScore: number;
  cognitiveScore: number;
  isHighEnergy: boolean;
  isStudy: boolean;
  isRecovery: boolean;
};

export type DailyLoadIssue = {
  code:
    | "high_energy_excess"
    | "cognitive_overload"
    | "study_cluster"
    | "evening_overstimulation"
    | "recovery_gap_shortage"
    | "recovery_window_thin"
    | "total_stimulation_high";
  severity: "warning" | "critical";
  message: string;
  detail?: string;
};

export type DailyLoadProfile = {
  limits: DailyLoadLimits;
  blocks: DailyLoadBlockMetrics[];
  highEnergyCount: number;
  studyBlockCount: number;
  studyClusterMax: number;
  cognitiveLoadScore: number;
  totalStimulationScore: number;
  eveningStimulationScore: number;
  recoveryGapCount: number;
  calmBlockCount: number;
  balanceScore: number;
  issues: DailyLoadIssue[];
  pacingMode: DailyLoadLimits["pacingMode"];
};

export type DailyLoadContext = {
  wakeMins: number;
  sleepMins: number;
  ageGroup?: AgeGroup;
  energyLevel?: EnergyLevel;
  dayType?: DayType;
  sleepQuality?: PreviousDayContext["sleepQuality"];
  mood?: string;
  reduceStudyBlocks?: boolean;
  rainMode?: boolean;
  sickDay?: boolean;
  seed?: number;
};

export type DailyLoadBalanceResult = {
  items: RoutineScheduleItem[];
  profile: DailyLoadProfile;
  profileAfter: DailyLoadProfile;
  adjustments: string[];
};

function periodFor(startMins: number): DailyLoadPeriod {
  if (startMins >= EVENING_STIM_CUTOFF_MINS) return "evening";
  if (startMins >= 12 * 60) return "afternoon";
  return "morning";
}

function isMealOrAnchor(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  if (cat === "meal" || cat === "tiffin" || cat === "school") return true;
  return /\b(breakfast|lunch|dinner|drunch|refuel|snack|tiffin|at school)\b/i.test(
    item.activity,
  );
}

function isWindDown(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  return (
    cat === "wind-down" ||
    /\b(wind.?down|story time|bedtime story|lights out)\b/i.test(item.activity)
  );
}

function isStudyBlock(item: RoutineScheduleItem, meta: ActivityMetadata): boolean {
  if (meta.category === "study") return true;
  const cat = (item.category ?? "").toLowerCase();
  return cat === "study" || /\b(homework|tuition|learning block|extra study)\b/i.test(item.activity);
}

function isRecoveryBlock(meta: ActivityMetadata): boolean {
  return (
    meta.intensity === "low" &&
    (meta.category === "rest" ||
      meta.calmingScore >= 7 ||
      meta.category === "social")
  );
}

function isSickDaySignal(ctx: DailyLoadContext): boolean {
  if (ctx.sickDay === true) return true;
  const mood = (ctx.mood ?? "").toLowerCase();
  if (/\b(sick|ill|unwell|fever|recovering|not feeling)\b/.test(mood)) return true;
  if (ctx.dayType === "low-energy" && ctx.sleepQuality === "poor") return true;
  if (
    ctx.dayType === "low-energy" &&
    /\b(tired|cranky|low)\b/.test(mood)
  ) {
    return true;
  }
  return false;
}

/** Derive per-day stimulation budgets from child state and prior-night context. */
export function deriveDailyLoadLimits(ctx: DailyLoadContext): DailyLoadLimits {
  const sick = isSickDaySignal(ctx);
  const poorSleep = ctx.sleepQuality === "poor";
  const lowEnergy =
    ctx.energyLevel === "low" || ctx.dayType === "low-energy" || poorSleep;
  const gentle =
    lowEnergy || sick || ctx.dayType === "indoor-heavy";
  const pacingMode: DailyLoadLimits["pacingMode"] = sick
    ? "recovery"
    : gentle
      ? "gentle"
      : "normal";

  let maxHighEnergyBlocks = 3;
  let maxStudyBlocks = 4;
  let maxStudyClusterSize = 2;
  let maxCognitiveLoadScore = 14;
  let maxTotalStimulationScore = 28;
  let maxEveningStimulationScore = 6;
  let minRecoveryGaps = 2;
  let minCalmBlocks = 1;

  if (ctx.ageGroup === "infant" || ctx.ageGroup === "toddler") {
    maxHighEnergyBlocks = 1;
    maxStudyBlocks = 0;
    maxStudyClusterSize = 1;
    maxCognitiveLoadScore = 6;
    maxTotalStimulationScore = 14;
    maxEveningStimulationScore = 3;
    minRecoveryGaps = 3;
    minCalmBlocks = 2;
  } else if (ctx.ageGroup === "preschool") {
    maxHighEnergyBlocks = 2;
    maxStudyBlocks = 1;
    maxCognitiveLoadScore = 10;
    maxTotalStimulationScore = 22;
    maxEveningStimulationScore = 5;
  }

  if (gentle) {
    maxHighEnergyBlocks = Math.max(1, maxHighEnergyBlocks - 1);
    maxCognitiveLoadScore -= 4;
    maxTotalStimulationScore -= 6;
    maxEveningStimulationScore = Math.max(3, maxEveningStimulationScore - 2);
    minRecoveryGaps += 1;
    minCalmBlocks += 1;
  }

  if (poorSleep) {
    maxHighEnergyBlocks = Math.max(1, maxHighEnergyBlocks - 1);
    maxCognitiveLoadScore -= 3;
    maxStudyClusterSize = 1;
    maxEveningStimulationScore = Math.min(maxEveningStimulationScore, 4);
  }

  if (sick) {
    maxHighEnergyBlocks = 1;
    maxStudyBlocks = Math.min(maxStudyBlocks, 1);
    maxStudyClusterSize = 1;
    maxCognitiveLoadScore = Math.min(maxCognitiveLoadScore, 8);
    maxTotalStimulationScore = Math.min(maxTotalStimulationScore, 16);
    maxEveningStimulationScore = 3;
    minRecoveryGaps = Math.max(minRecoveryGaps, 3);
    minCalmBlocks = Math.max(minCalmBlocks, 2);
  }

  if (ctx.reduceStudyBlocks) {
    maxStudyBlocks = Math.min(maxStudyBlocks, 2);
    maxStudyClusterSize = 1;
    maxCognitiveLoadScore -= 2;
  }

  if (ctx.energyLevel === "high" && !lowEnergy && !sick) {
    maxHighEnergyBlocks += 1;
    maxTotalStimulationScore += 4;
  }

  return {
    maxHighEnergyBlocks,
    maxStudyBlocks,
    maxStudyClusterSize,
    maxCognitiveLoadScore,
    maxTotalStimulationScore,
    maxEveningStimulationScore,
    minRecoveryGaps,
    minRecoveryGapMins: sick ? 25 : poorSleep ? 22 : MIN_RECOVERY_GAP_MINS,
    minCalmBlocks,
    pacingMode,
  };
}

function stimulationWeight(meta: ActivityMetadata, durationMins: number): number {
  const intensityFactor =
    meta.intensity === "high" ? 4 : meta.intensity === "medium" ? 2 : 1;
  const categoryBoost =
    meta.category === "movement" || meta.category === "play" ? 0.5 : 0;
  return Math.round(intensityFactor * (durationMins / 30) * 10) / 10 + categoryBoost;
}

function cognitiveWeight(meta: ActivityMetadata, durationMins: number): number {
  if (meta.category !== "study" && meta.category !== "creative") return 0;
  const base = meta.category === "study" ? 3 : 1.5;
  const intensity =
    meta.intensity === "high" ? 1.4 : meta.intensity === "medium" ? 1 : 0.7;
  return Math.round(base * intensity * (durationMins / 30) * 10) / 10;
}

function scoreBlock(
  item: RoutineScheduleItem,
  index: number,
): DailyLoadBlockMetrics | null {
  if (isSleepItem(item) || isMealOrAnchor(item) || isWindDown(item)) return null;

  const startMins = parseTimeToMins(normalizeTo24h(item.time));
  const durationMins = item.duration ?? 30;
  const meta = getActivityMetadata(item);
  const schedHigh = inferBlockEnergyLevel(item) === "high";
  const metaHigh = isHighEnergyActivity(item);
  const isHighEnergy = schedHigh || metaHigh;
  const isStudy = isStudyBlock(item, meta);
  const isRecovery = isRecoveryBlock(meta);

  return {
    index,
    activity: item.activity,
    startMins,
    durationMins,
    period: periodFor(startMins),
    stimulationScore: isRecovery
      ? Math.max(0, stimulationWeight(meta, durationMins) * 0.35)
      : stimulationWeight(meta, durationMins),
    cognitiveScore: isStudy ? cognitiveWeight(meta, durationMins) : cognitiveWeight(meta, durationMins) * 0.5,
    isHighEnergy,
    isStudy,
    isRecovery,
  };
}

function maxStudyCluster(blocks: DailyLoadBlockMetrics[]): number {
  const sorted = [...blocks]
    .filter((b) => b.isStudy)
    .sort((a, b) => a.startMins - b.startMins);
  let max = 0;
  let run = 0;
  let lastEnd = -1;
  for (const b of sorted) {
    if (lastEnd >= 0 && b.startMins - lastEnd <= 25) {
      run += 1;
    } else {
      run = 1;
    }
    max = Math.max(max, run);
    lastEnd = b.startMins + b.durationMins;
  }
  return max;
}

function countRecoveryGaps(
  items: RoutineScheduleItem[],
  minGap: number,
): number {
  const sorted = [...items]
    .filter((it) => !isSleepItem(it))
    .sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));
  let count = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    const prevEnd =
      parseTimeToMins(prev.time) + (prev.duration ?? 30);
    const gap = parseTimeToMins(curr.time) - prevEnd;
    if (gap >= minGap) count += 1;
  }
  return count;
}

/**
 * Analyze full-day stimulation balance — metadata-first, deterministic.
 */
export function calculateDailyLoadProfile(
  items: RoutineScheduleItem[],
  ctx: DailyLoadContext = {},
): DailyLoadProfile {
  const limits = deriveDailyLoadLimits(ctx);
  const blocks: DailyLoadBlockMetrics[] = [];

  items.forEach((item, index) => {
    const metrics = scoreBlock(item, index);
    if (metrics) blocks.push(metrics);
  });

  const highEnergyCount = blocks.filter((b) => b.isHighEnergy).length;
  const studyBlockCount = blocks.filter((b) => b.isStudy).length;
  const studyClusterMax = maxStudyCluster(blocks);
  const cognitiveLoadScore = Math.round(
    blocks.reduce((s, b) => s + b.cognitiveScore, 0) * 10,
  ) / 10;
  const totalStimulationScore = Math.round(
    blocks.reduce((s, b) => s + b.stimulationScore, 0) * 10,
  ) / 10;
  const eveningStimulationScore = Math.round(
    blocks
      .filter((b) => b.period === "evening")
      .reduce((s, b) => s + b.stimulationScore, 0) * 10,
  ) / 10;
  const recoveryGapCount = countRecoveryGaps(
    items,
    limits.minRecoveryGapMins,
  );
  const calmBlockCount = blocks.filter((b) => b.isRecovery).length;

  const issues: DailyLoadIssue[] = [];

  if (highEnergyCount > limits.maxHighEnergyBlocks) {
    issues.push({
      code: "high_energy_excess",
      severity: "critical",
      message: `${highEnergyCount} high-energy blocks (max ${limits.maxHighEnergyBlocks})`,
    });
  }

  if (cognitiveLoadScore > limits.maxCognitiveLoadScore) {
    issues.push({
      code: "cognitive_overload",
      severity: limits.pacingMode === "recovery" ? "critical" : "warning",
      message: `cognitive load ${cognitiveLoadScore} exceeds ${limits.maxCognitiveLoadScore}`,
    });
  }

  if (studyClusterMax > limits.maxStudyClusterSize) {
    issues.push({
      code: "study_cluster",
      severity: "warning",
      message: `study cluster of ${studyClusterMax} (max ${limits.maxStudyClusterSize})`,
    });
  }

  if (studyBlockCount > limits.maxStudyBlocks) {
    issues.push({
      code: "study_cluster",
      severity: "warning",
      message: `${studyBlockCount} study blocks (max ${limits.maxStudyBlocks})`,
      detail: "study_count",
    });
  }

  if (eveningStimulationScore > limits.maxEveningStimulationScore) {
    issues.push({
      code: "evening_overstimulation",
      severity: "critical",
      message: `evening stimulation ${eveningStimulationScore} (max ${limits.maxEveningStimulationScore})`,
    });
  }

  if (totalStimulationScore > limits.maxTotalStimulationScore) {
    issues.push({
      code: "total_stimulation_high",
      severity: "warning",
      message: `total stimulation ${totalStimulationScore} (max ${limits.maxTotalStimulationScore})`,
    });
  }

  if (recoveryGapCount < limits.minRecoveryGaps) {
    issues.push({
      code: "recovery_gap_shortage",
      severity: "warning",
      message: `${recoveryGapCount} recovery gaps (need ${limits.minRecoveryGaps})`,
    });
  }

  if (calmBlockCount < limits.minCalmBlocks && limits.pacingMode !== "normal") {
    issues.push({
      code: "recovery_window_thin",
      severity: "warning",
      message: `${calmBlockCount} calm blocks (need ${limits.minCalmBlocks})`,
    });
  }

  const penalty = issues.reduce(
    (s, i) => s + (i.severity === "critical" ? 12 : 6),
    0,
  );
  const balanceScore = Math.max(0, Math.min(100, 100 - penalty));

  return {
    limits,
    blocks,
    highEnergyCount,
    studyBlockCount,
    studyClusterMax,
    cognitiveLoadScore,
    totalStimulationScore,
    eveningStimulationScore,
    recoveryGapCount,
    calmBlockCount,
    balanceScore,
    issues,
    pacingMode: limits.pacingMode,
  };
}

function isBalancingEligible(item: RoutineScheduleItem): boolean {
  return !isProtectedScheduleBlock(item) && !isLockedScheduleItem(item) && !isSleepItem(item);
}

function downgradeToCalm(
  item: RoutineScheduleItem,
  seed: number,
  rainMode?: boolean,
): RoutineScheduleItem {
  if (inferBlockEnergyLevel(item) === "high") {
    return attachActivityMetadata(downgradeHighEnergyBlock(item, rainMode));
  }
  const preset = pickCalmHotAfternoonPreset(seed);
  return attachActivityMetadata({
    ...item,
    activity: preset.activity,
    category: preset.category,
    energyImpact: "low",
    duration: Math.min(item.duration ?? 30, 25),
  });
}

function shortenBlock(item: RoutineScheduleItem, maxMins: number): RoutineScheduleItem {
  const dur = item.duration ?? 30;
  if (dur <= maxMins) return item;
  return { ...item, duration: Math.max(MIN_ACTIVITY_MINS, maxMins) };
}

function findLargestIdleGap(
  items: RoutineScheduleItem[],
  wakeMins: number,
  sleepMins: number,
): { start: number; end: number; gap: number } | null {
  const sorted = [...items]
    .filter((it) => !isSleepItem(it))
    .sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));

  let best: { start: number; end: number; gap: number } | null = null;

  if (sorted.length) {
    const firstStart = parseTimeToMins(sorted[0]!.time);
    const wakeGap = firstStart - wakeMins;
    if (wakeGap >= MIN_RECOVERY_GAP_MINS + MIN_ACTIVITY_MINS) {
      best = { start: wakeMins + 5, end: firstStart - 5, gap: wakeGap };
    }
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const prevEnd =
      parseTimeToMins(sorted[i]!.time) + (sorted[i]!.duration ?? 30);
    const nextStart = parseTimeToMins(sorted[i + 1]!.time);
    const gap = nextStart - prevEnd;
    if (gap >= MIN_RECOVERY_GAP_MINS + MIN_ACTIVITY_MINS) {
      if (!best || gap > best.gap) {
        best = { start: prevEnd + 5, end: nextStart - 5, gap };
      }
    }
  }

  const last = sorted[sorted.length - 1];
  if (last) {
    const lastEnd = parseTimeToMins(last.time) + (last.duration ?? 30);
    const tailGap = sleepMins - 50 - lastEnd;
    if (tailGap >= MIN_RECOVERY_GAP_MINS + MIN_ACTIVITY_MINS) {
      if (!best || tailGap > best.gap) {
        best = { start: lastEnd + 5, end: Math.min(lastEnd + 35, sleepMins - 55), gap: tailGap };
      }
    }
  }

  return best;
}

function insertRecoveryBlock(
  items: RoutineScheduleItem[],
  startMins: number,
  durationMins: number,
  seed: number,
): RoutineScheduleItem[] {
  const preset = pickCalmHotAfternoonPreset(seed + startMins);
  const block = itemFromPreset(
    preset.meta.calmingScore >= 8 ? "calm_reading" : "quiet_puzzles",
    {
      time: minsToTime24(startMins),
      duration: Math.max(MIN_ACTIVITY_MINS, Math.min(25, durationMins)),
      status: "pending",
      notes: "Recovery window — gentle pacing after load balancing.",
      energyImpact: "low",
    },
  );
  const out = [...items, block];
  out.sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));
  return out;
}

/**
 * Apply metadata-aware load balancing — shortens, downgrades, and inserts recovery
 * without rescheduling the core timeline.
 */
export function balanceDailySchedule(
  items: RoutineScheduleItem[],
  ctx: DailyLoadContext,
): DailyLoadBalanceResult {
  const adjustments: string[] = [];
  let working = items.map((it) => ({ ...it }));
  const seed = ctx.seed ?? ctx.wakeMins + ctx.sleepMins;

  const profileBefore = calculateDailyLoadProfile(working, ctx);
  if (!profileBefore.issues.length) {
    return {
      items: working,
      profile: profileBefore,
      profileAfter: profileBefore,
      adjustments,
    };
  }

  const limits = profileBefore.limits;

  for (let pass = 0; pass < 4; pass++) {
    const profile = calculateDailyLoadProfile(working, ctx);
    if (!profile.issues.length) break;

    const highEnergyBlocks = profile.blocks
      .filter((b) => b.isHighEnergy)
      .sort((a, b) => {
        if (a.period === "evening" && b.period !== "evening") return -1;
        if (b.period === "evening" && a.period !== "evening") return 1;
        return b.stimulationScore - a.stimulationScore;
      });

    if (profile.highEnergyCount > limits.maxHighEnergyBlocks) {
      const excess = profile.highEnergyCount - limits.maxHighEnergyBlocks;
      for (let i = 0; i < excess && i < highEnergyBlocks.length; i++) {
        const target = highEnergyBlocks[i]!;
        const item = working[target.index];
        if (!item || !isBalancingEligible(item)) continue;
        working[target.index] = downgradeToCalm(item, seed + i, ctx.rainMode);
        adjustments.push(`load: downgraded high-energy "${item.activity}"`);
      }
    }

    const studyBlocks = profile.blocks
      .filter((b) => b.isStudy)
      .sort((a, b) => b.cognitiveScore - a.cognitiveScore);

    if (
      profile.studyClusterMax > limits.maxStudyClusterSize ||
      profile.studyBlockCount > limits.maxStudyBlocks
    ) {
      const trimCount = Math.max(
        profile.studyBlockCount - limits.maxStudyBlocks,
        profile.studyClusterMax - limits.maxStudyClusterSize,
      );
      for (let i = 0; i < trimCount && i < studyBlocks.length; i++) {
        const target = studyBlocks[i]!;
        const item = working[target.index];
        if (!item || !isBalancingEligible(item)) continue;
        const shortened = shortenBlock(item, profile.pacingMode === "recovery" ? 15 : 20);
        if (shortened.duration !== item.duration) {
          working[target.index] = attachActivityMetadata(shortened);
          adjustments.push(`load: shortened study "${item.activity}"`);
        } else if (profile.studyBlockCount > limits.maxStudyBlocks) {
          working[target.index] = downgradeToCalm(item, seed + i + 40, ctx.rainMode);
          adjustments.push(`load: softened extra study "${item.activity}"`);
        }
      }
    }

    for (const block of profile.blocks) {
      if (block.period !== "evening") continue;
      if (block.stimulationScore <= 2) continue;
      const item = working[block.index];
      if (!item || !isBalancingEligible(item)) continue;
      const start = parseTimeToMins(item.time);
      if (
        profile.eveningStimulationScore > limits.maxEveningStimulationScore &&
        (block.isHighEnergy || start >= EVENING_HARD_CUTOFF_MINS)
      ) {
        working[block.index] = downgradeToCalm(item, seed + start, ctx.rainMode);
        adjustments.push(`load: calmed evening "${item.activity}"`);
      }
    }

    if (
      profile.cognitiveLoadScore > limits.maxCognitiveLoadScore ||
      profile.totalStimulationScore > limits.maxTotalStimulationScore
    ) {
      const heavy = [...profile.blocks]
        .filter((b) => !b.isRecovery)
        .sort((a, b) => b.stimulationScore + b.cognitiveScore - (a.stimulationScore + a.cognitiveScore));
      for (const target of heavy.slice(0, 2)) {
        const item = working[target.index];
        if (!item || !isBalancingEligible(item)) continue;
        const shortened = shortenBlock(item, 20);
        if ((shortened.duration ?? 30) < (item.duration ?? 30)) {
          working[target.index] = shortened;
          adjustments.push(`load: trimmed heavy block "${item.activity}"`);
        }
      }
    }

    const afterTrim = calculateDailyLoadProfile(working, ctx);
    if (
      afterTrim.recoveryGapCount < limits.minRecoveryGaps ||
      afterTrim.calmBlockCount < limits.minCalmBlocks
    ) {
      const gap = findLargestIdleGap(working, ctx.wakeMins, ctx.sleepMins);
      if (gap && gap.gap >= limits.minRecoveryGapMins + MIN_ACTIVITY_MINS) {
        const dur = Math.min(25, gap.end - gap.start);
        const already = working.some(
          (it) =>
            Math.abs(parseTimeToMins(it.time) - gap.start) < 15 &&
            getActivityMetadata(it).calmingScore >= 7,
        );
        if (!already) {
          working = insertRecoveryBlock(working, gap.start, dur, seed);
          adjustments.push(`load: inserted recovery block (${dur}min)`);
        }
      }
    }

    const next = calculateDailyLoadProfile(working, ctx);
    if (next.issues.length >= profile.issues.length && pass >= 1) break;
  }

  const profileAfter = calculateDailyLoadProfile(working, ctx);

  return {
    items: working,
    profile: profileBefore,
    profileAfter,
    adjustments,
  };
}

/** Pipeline entry — analyze then balance when issues exist. */
export function applyDailyLoadBalancing(
  items: RoutineScheduleItem[],
  ctx: DailyLoadContext,
): DailyLoadBalanceResult {
  return balanceDailySchedule(items, ctx);
}
