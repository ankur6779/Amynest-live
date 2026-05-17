/**
 * Explainable routine metadata — UI/debug only; does not affect scheduling.
 */
import type { DifficultyAdjustment } from "./routine-adaptive-difficulty.js";
import type { ChildBehaviorSignature } from "./routine-behavior-signature.js";
import type { CulturalModelingChange } from "./routine-cultural-modeling.js";
import type { InterpretedBehavioralState } from "./routine-context-engine.js";
import {
  normalizeTo24h,
  parseTimeToMins,
  minsToTime24,
  type RoutineScheduleItem,
} from "./routine-scheduler.js";

export type ExplainabilitySource =
  | "behavior_signature"
  | "weather"
  | "culture"
  | "difficulty"
  | "energy";

export type RoutineExplanation = {
  reason: string;
  source: ExplainabilitySource;
};

export type ExplainableRoutineItem = RoutineScheduleItem & {
  routineExplanation?: RoutineExplanation;
  /** Display-only; does not drive scheduler. */
  displayStart?: string;
  displayEnd?: string;
};

export type ExplainabilityInput = {
  signature: ChildBehaviorSignature;
  state: InterpretedBehavioralState;
  difficultyAdjustments?: DifficultyAdjustment[];
  culturalChanges?: CulturalModelingChange[];
};

function endTime(start: string, durationMins: number): string {
  return minsToTime24(parseTimeToMins(normalizeTo24h(start)) + durationMins);
}

/**
 * Attaches non-invasive explainability fields to each item.
 */
export function attachExplainabilityMetadata(
  items: RoutineScheduleItem[],
  input: ExplainabilityInput,
): ExplainableRoutineItem[] {
  const { signature, state, difficultyAdjustments = [], culturalChanges = [] } = input;

  return items.map((item) => {
    const start = normalizeTo24h(item.time);
    const duration = item.duration ?? 30;
    const displayStart = start;
    const displayEnd = endTime(start, duration);

    let reason = "Standard schedule placement";
    let source: ExplainabilitySource = "culture";

    if (item.scheduleDecision?.reason) {
      reason = item.scheduleDecision.reason;
      if (item.scheduleDecision.source === "safety") source = "weather";
      else if (item.scheduleDecision.source === "preference") source = "culture";
      else source = "culture";
    }

    const diffAdj = difficultyAdjustments.find(
      (d) => d.activity === item.activity || d.activity === item.scheduleDecision?.originalActivity,
    );
    if (diffAdj) {
      reason = diffAdj.reason;
      source = "difficulty";
    }

    const cult = culturalChanges.find((c) => c.activity === item.activity);
    if (cult) {
      reason = cult.reason;
      source = "culture";
    }

    const cat = (item.category ?? "").toLowerCase();
    if (cat === "study" && signature.energyPattern === "morning") {
      reason = `Adjusted for ${signature.focusSpan}-min focus span (morning peak)`;
      source = "behavior_signature";
    } else if (cat === "study" && signature.focusSpan < 30) {
      reason = "Shortened study block for lower focus span";
      source = "behavior_signature";
    } else if (signature.complianceScore < 0.45 && /break/i.test(item.activity)) {
      reason = "Extra break inserted for low compliance";
      source = "behavior_signature";
    }

    if (item.culturalTag?.includes("outdoor") && state.allowOutdoor) {
      source = "culture";
      reason = reason || `${state.country} outdoor preference`;
    }

    return {
      ...item,
      displayStart,
      displayEnd,
      routineExplanation: { reason, source },
    };
  });
}
