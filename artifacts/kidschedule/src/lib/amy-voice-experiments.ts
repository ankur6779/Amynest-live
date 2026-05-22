/**
 * Amy voice A/B experiments — encouragement, pacing, instruction style.
 */

import {
  getPromotedExperimentVariants,
  maybeEvaluateExperimentGovernance,
} from "@/lib/amy-voice-governance";

export type AmyVoiceExperimentId =
  | "encouragement_frequency"
  | "pacing"
  | "instruction_style";

export type AmyVoiceExperimentAssignment = Record<AmyVoiceExperimentId, string>;

type VariantMetrics = {
  speaks: number;
  sumReplay: number;
  sumDurationMs: number;
  fallbackCount: number;
};

const EXPERIMENT_VARIANTS: Record<AmyVoiceExperimentId, readonly string[]> = {
  encouragement_frequency: ["control", "sparse", "frequent"],
  pacing: ["control", "slower", "faster"],
  instruction_style: ["control", "direct", "conversational"],
};

const STORAGE_KEY = "amynest:amy-voice-experiments-v1";

let cachedAssignment: AmyVoiceExperimentAssignment | null = null;
const variantMetrics = new Map<string, VariantMetrics>();

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickVariant(experiment: AmyVoiceExperimentId, seed: string): string {
  const variants = EXPERIMENT_VARIANTS[experiment];
  const idx = hashString(`${seed}:${experiment}`) % variants.length;
  return variants[idx]!;
}

function loadPersistedAssignment(): AmyVoiceExperimentAssignment | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AmyVoiceExperimentAssignment;
    if (
      parsed.encouragement_frequency &&
      parsed.pacing &&
      parsed.instruction_style
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function persistAssignment(assignment: AmyVoiceExperimentAssignment): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignment));
  } catch {
    /* ignore */
  }
}

function experimentSeed(): string {
  if (typeof localStorage !== "undefined") {
    const existing = localStorage.getItem(`${STORAGE_KEY}:seed`);
    if (existing) return existing;
    const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      localStorage.setItem(`${STORAGE_KEY}:seed`, seed);
    } catch {
      /* ignore */
    }
    return seed;
  }
  return "amy-voice-session";
}

export function getAmyVoiceExperimentAssignment(): AmyVoiceExperimentAssignment {
  if (cachedAssignment) {
    return { ...cachedAssignment, ...getPromotedExperimentVariants() };
  }
  cachedAssignment = loadPersistedAssignment();
  if (!cachedAssignment) {
    const seed = experimentSeed();
    cachedAssignment = {
      encouragement_frequency: pickVariant("encouragement_frequency", seed),
      pacing: pickVariant("pacing", seed),
      instruction_style: pickVariant("instruction_style", seed),
    };
    persistAssignment(cachedAssignment);
  }
  return { ...cachedAssignment, ...getPromotedExperimentVariants() };
}

export function setAmyVoiceExperimentAssignmentForTests(
  assignment: AmyVoiceExperimentAssignment,
): void {
  cachedAssignment = assignment;
}

export function getAmyVoiceExperimentModifiers(
  assignment: AmyVoiceExperimentAssignment,
): {
  encouragementMultiplier: number;
  microHumanizeMultiplier: number;
  pacingRateDelta: number;
  pacingGapDelta: number;
  leadInStyle: "control" | "direct" | "conversational";
} {
  let encouragementMultiplier = 1;
  let microHumanizeMultiplier = 1;
  let pacingRateDelta = 0;
  let pacingGapDelta = 0;
  let leadInStyle: "control" | "direct" | "conversational" = "control";

  switch (assignment.encouragement_frequency) {
    case "sparse":
      encouragementMultiplier = 0.7;
      break;
    case "frequent":
      encouragementMultiplier = 1.35;
      break;
    default:
      break;
  }

  switch (assignment.pacing) {
    case "slower":
      pacingRateDelta = -0.05;
      pacingGapDelta = 50;
      break;
    case "faster":
      pacingRateDelta = 0.04;
      pacingGapDelta = -35;
      break;
    default:
      break;
  }

  switch (assignment.instruction_style) {
    case "direct":
      leadInStyle = "direct";
      microHumanizeMultiplier *= 0.85;
      break;
    case "conversational":
      leadInStyle = "conversational";
      microHumanizeMultiplier *= 1.12;
      break;
    default:
      break;
  }

  return {
    encouragementMultiplier,
    microHumanizeMultiplier,
    pacingRateDelta,
    pacingGapDelta,
    leadInStyle,
  };
}

function metricKey(experiment: AmyVoiceExperimentId, variant: string): string {
  return `${experiment}:${variant}`;
}

export function recordAmyVoiceExperimentOutcome(
  assignment: AmyVoiceExperimentAssignment,
  outcome: { replayCount: number; durationMs: number; fallback: boolean },
): void {
  for (const experiment of Object.keys(EXPERIMENT_VARIANTS) as AmyVoiceExperimentId[]) {
    const variant = assignment[experiment];
    const key = metricKey(experiment, variant);
    const bucket = variantMetrics.get(key) ?? {
      speaks: 0,
      sumReplay: 0,
      sumDurationMs: 0,
      fallbackCount: 0,
    };
    bucket.speaks += 1;
    bucket.sumReplay += Math.max(0, outcome.replayCount);
    bucket.sumDurationMs += Math.max(0, outcome.durationMs);
    if (outcome.fallback) bucket.fallbackCount += 1;
    variantMetrics.set(key, bucket);
  }
  maybeEvaluateExperimentGovernance(getAmyVoiceExperimentSnapshot().results);
}

export function getAmyVoiceExperimentSnapshot(): {
  assignment: AmyVoiceExperimentAssignment;
  results: Array<{
    experiment: AmyVoiceExperimentId;
    variant: string;
    speaks: number;
    avgReplayCount: number;
    avgDurationMs: number;
    fallbackRate: number;
  }>;
} {
  const assignment = getAmyVoiceExperimentAssignment();
  const results: ReturnType<typeof getAmyVoiceExperimentSnapshot>["results"] = [];

  for (const experiment of Object.keys(EXPERIMENT_VARIANTS) as AmyVoiceExperimentId[]) {
    for (const variant of EXPERIMENT_VARIANTS[experiment]) {
      const bucket = variantMetrics.get(metricKey(experiment, variant));
      if (!bucket || bucket.speaks === 0) continue;
      results.push({
        experiment,
        variant,
        speaks: bucket.speaks,
        avgReplayCount: bucket.sumReplay / bucket.speaks,
        avgDurationMs: bucket.sumDurationMs / bucket.speaks,
        fallbackRate: bucket.fallbackCount / bucket.speaks,
      });
    }
  }

  return { assignment, results };
}

export function resetAmyVoiceExperimentMetrics(): void {
  variantMetrics.clear();
}

export function resetAmyVoiceExperimentsForTests(): void {
  cachedAssignment = null;
  variantMetrics.clear();
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(`${STORAGE_KEY}:seed`);
    } catch {
      /* ignore */
    }
  }
}
