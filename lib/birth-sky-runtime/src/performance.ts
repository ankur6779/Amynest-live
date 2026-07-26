/**
 * Deterministic pipeline performance profiler (target < 500ms).
 */

import { runIntelligencePipeline } from "./pipeline.js";
import { flagsAllEnabled } from "./flags.js";
import { PIPELINE_SLO_MS } from "./types.js";

export type PerformanceProfileReport = {
  samples: number;
  averageTotalMs: number;
  p95TotalMs: number;
  maxTotalMs: number;
  sloMs: number;
  sloPassRate: number;
  passed: boolean;
  perStageAvgMs: Record<string, number>;
};

export function profileIntelligencePipeline(samples = 12): PerformanceProfileReport {
  const totals: number[] = [];
  const stageSums = new Map<string, number>();
  const stageCounts = new Map<string, number>();

  for (let i = 0; i < samples; i++) {
    const result = runIntelligencePipeline({
      requestId: `perf_${i}`,
      astronomy: {
        sunSign: "Leo",
        moonSign: "Cancer",
        risingSign: "Virgo",
        planetHouseMap: { sun: 5, moon: 4 },
      },
      ageMonths: 72,
      parentGoals: ["better_focus"],
      routines: [{ kind: "focus" }, { kind: "sleep" }],
      adaptiveHistory: {
        sessionFrequency: { sessionsPerWeek: 4, avgSessionMinutes: 12 },
        activities: [{ type: "focus", completed: 4, skipped: 1 }],
      },
      userQuestion: "How can I support learning and focus?",
      entryPoint: "sky",
      flags: flagsAllEnabled(),
      enableExperiments: false,
    });
    totals.push(result.totalPipelineMs);
    for (const t of result.stageTimings) {
      if (t.status !== "ok") continue;
      stageSums.set(t.stage, (stageSums.get(t.stage) ?? 0) + t.durationMs);
      stageCounts.set(t.stage, (stageCounts.get(t.stage) ?? 0) + 1);
    }
  }

  const sorted = [...totals].sort((a, b) => a - b);
  const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]!;
  const max = sorted[sorted.length - 1]!;
  const pass = totals.filter((t) => t <= PIPELINE_SLO_MS).length;

  const perStageAvgMs: Record<string, number> = {};
  for (const [stage, sum] of stageSums) {
    const n = stageCounts.get(stage) ?? 1;
    perStageAvgMs[stage] = Math.round((sum / n) * 100) / 100;
  }

  return {
    samples,
    averageTotalMs: Math.round(avg * 100) / 100,
    p95TotalMs: Math.round(p95 * 100) / 100,
    maxTotalMs: Math.round(max * 100) / 100,
    sloMs: PIPELINE_SLO_MS,
    sloPassRate: pass / totals.length,
    passed: p95 <= PIPELINE_SLO_MS,
    perStageAvgMs,
  };
}
