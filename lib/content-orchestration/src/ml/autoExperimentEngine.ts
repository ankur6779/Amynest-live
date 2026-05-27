import type { ExperimentFlags } from "../types-v2.js";
import { DEFAULT_EXPERIMENT_FLAGS } from "../config/experiments.js";
import type { ExperimentState, ExperimentVariantState } from "./types-meta.js";

const experiments = new Map<string, ExperimentState>();
let experimentCounter = 0;

function variantMetrics(seed: number): ExperimentVariantState["metrics"] {
  return {
    engagement: 0.45 + (seed % 20) / 100,
    retention: 0.4 + (seed % 15) / 100,
    reward: 0.2 + (seed % 12) / 100,
  };
}

export function createAutoExperiment(
  name: string,
  variantCount = 2,
): ExperimentState {
  experimentCounter += 1;
  const id = `auto_exp_${experimentCounter}`;
  const share = 1 / variantCount;
  const variants: ExperimentVariantState[] = [];
  for (let i = 0; i < variantCount; i++) {
    variants.push({
      id: `${id}_v${i}`,
      label: `variant_${i}`,
      trafficShare: share,
      metrics: variantMetrics(i + experimentCounter),
      status: "running",
    });
  }
  const exp: ExperimentState = {
    id,
    name,
    variants,
    startedAt: new Date().toISOString(),
  };
  experiments.set(id, exp);
  return exp;
}

export function recordVariantOutcome(
  experimentId: string,
  variantId: string,
  outcome: { engagement?: number; retention?: number; reward?: number },
): void {
  const exp = experiments.get(experimentId);
  if (!exp) return;
  const v = exp.variants.find((x) => x.id === variantId);
  if (!v) return;
  if (outcome.engagement !== undefined) {
    v.metrics.engagement = v.metrics.engagement * 0.85 + outcome.engagement * 0.15;
  }
  if (outcome.retention !== undefined) {
    v.metrics.retention = v.metrics.retention * 0.85 + outcome.retention * 0.15;
  }
  if (outcome.reward !== undefined) {
    v.metrics.reward = v.metrics.reward * 0.85 + outcome.reward * 0.15;
  }
}

export function evaluateExperiments(): ExperimentState[] {
  for (const exp of experiments.values()) {
    if (exp.winnerId) continue;
    const running = exp.variants.filter((v) => v.status === "running");
    if (running.length < 2) continue;

    const scored = running.map((v) => ({
      v,
      score: v.metrics.engagement * 0.4 + v.metrics.retention * 0.35 + v.metrics.reward * 0.25,
    }));
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0]!;
    const worst = scored[scored.length - 1]!;

    if (best.score - worst.score > 0.08) {
      exp.winnerId = best.v.id;
      best.v.status = "winner";
      best.v.trafficShare = 0.85;
      for (const v of exp.variants) {
        if (v.id !== best.v.id && v.status === "running") {
          v.status = "disabled";
          v.trafficShare = 0.05;
        }
      }
    }
  }
  return [...experiments.values()];
}

export function assignExperimentTraffic(
  childId: string,
  experimentId: string,
): { variantId: string; explorationRate: number; difficultyRamp: "slow" | "fast" } {
  const exp = experiments.get(experimentId);
  if (!exp) {
    return { variantId: "default", explorationRate: 0.2, difficultyRamp: "slow" };
  }

  const active = exp.variants.filter((v) => v.status !== "disabled");
  const hash = childId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  let cumulative = 0;
  const pick = (hash % 1000) / 1000;
  for (const v of active) {
    cumulative += v.trafficShare;
    if (pick <= cumulative) {
      const bucket = v.label.endsWith("_1") ? 1 : 0;
      return {
        variantId: v.id,
        explorationRate:
          DEFAULT_EXPERIMENT_FLAGS.explorationRate[bucket] ??
          DEFAULT_EXPERIMENT_FLAGS.explorationRate[0]!,
        difficultyRamp:
          DEFAULT_EXPERIMENT_FLAGS.difficultyRampSpeed[bucket] ?? "slow",
      };
    }
  }

  const fallback = active[0]!;
  return {
    variantId: fallback.id,
    explorationRate: DEFAULT_EXPERIMENT_FLAGS.explorationRate[0]!,
    difficultyRamp: "slow",
  };
}

export function winningExperimentFlags(): ExperimentFlags | null {
  for (const exp of experiments.values()) {
    if (!exp.winnerId) continue;
    const winner = exp.variants.find((v) => v.id === exp.winnerId);
    if (!winner) continue;
    const bucket = winner.label.endsWith("_1") ? 1 : 0;
    const ramp = DEFAULT_EXPERIMENT_FLAGS.difficultyRampSpeed[bucket] ?? "slow";
    return {
      explorationRate: [
        DEFAULT_EXPERIMENT_FLAGS.explorationRate[0]!,
        DEFAULT_EXPERIMENT_FLAGS.explorationRate[1]!,
      ] as [number, number],
      difficultyRampSpeed: [ramp, ramp] as readonly ["slow", "fast"],
    };
  }
  return null;
}

export function getActiveExperiments(): ExperimentState[] {
  return [...experiments.values()];
}

export function clearAutoExperiments(): void {
  experiments.clear();
  experimentCounter = 0;
}
