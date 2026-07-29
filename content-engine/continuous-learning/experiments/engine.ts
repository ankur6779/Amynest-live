/**
 * Experiment engine — controlled A/B variants from learning signals.
 * Wraps brain experimentation when analytics are available; otherwise DNA-based plans.
 */

import { createHash } from "node:crypto";
import {
  collectExperimentResults,
  planExperiments,
} from "../../brain/experimentation/index.js";
import { buildOptimizationDecision } from "../../brain/optimizer/index.js";
import type { AnalyticsReport } from "../../types/analytics.js";
import type { CorrelationInsight, LearningExperiment, PromptOptimizationHints } from "../types.js";

export function planLearningExperiments(input: {
  analytics?: AnalyticsReport;
  correlations: CorrelationInsight[];
  promptHints: PromptOptimizationHints;
}): LearningExperiment[] {
  const experiments: LearningExperiment[] = [];

  const hookCorr = input.correlations.find((c) => c.dimension === "hookStyle");
  experiments.push({
    id: expId("hook"),
    kind: "hook",
    label: "Hook A vs Hook B",
    variantA: hookCorr?.winner ?? input.promptHints.preferHookStyles[0] ?? "emotional",
    variantB: hookCorr?.loser ?? "educational",
    status: hookCorr ? "completed" : "planned",
    winner: hookCorr ? "A" : undefined,
    lift: hookCorr?.lift,
    confidence: hookCorr?.confidence,
    rationale: hookCorr?.rationale ?? "Test emotional vs educational cold opens.",
  });

  const ctaCorr = input.correlations.find((c) => c.dimension === "ctaVariant");
  experiments.push({
    id: expId("cta"),
    kind: "cta",
    label: "CTA A vs CTA B",
    variantA: ctaCorr?.winner ?? input.promptHints.preferCtaVariants[0] ?? "soft",
    variantB: ctaCorr?.loser ?? "direct",
    status: ctaCorr ? "completed" : "planned",
    winner: ctaCorr ? "A" : undefined,
    lift: ctaCorr?.lift,
    confidence: ctaCorr?.confidence,
    rationale: ctaCorr?.rationale ?? "Test soft vs direct CTA after hope.",
  });

  experiments.push({
    id: expId("intro"),
    kind: "intro",
    label: "Amy AI intro vs Parent intro",
    variantA: "parent-cold-open",
    variantB: "amy-ai-cold-open",
    status: "planned",
    rationale: "Compare parent-situation open vs Amy AI guide open.",
  });

  experiments.push({
    id: expId("pacing"),
    kind: "pacing",
    label: "Fast pacing vs Slow pacing",
    variantA: "fast",
    variantB: "slow",
    status: "planned",
    rationale: "Compare brisk scene pace vs lingering emotional holds.",
  });

  const durCorr = input.correlations.find((c) => c.dimension === "duration");
  experiments.push({
    id: expId("duration"),
    kind: "duration",
    label: "Duration A vs Duration B",
    variantA: durCorr?.winner ?? String(input.promptHints.preferDurations[0] ?? 22),
    variantB: durCorr?.loser ?? "30",
    status: durCorr ? "completed" : "planned",
    winner: durCorr ? "A" : undefined,
    lift: durCorr?.lift,
    confidence: durCorr?.confidence,
    rationale: durCorr?.rationale ?? "Test shorter vs longer Shorts length.",
  });

  if (input.analytics) {
    try {
      const optimization = buildOptimizationDecision({
        analytics: input.analytics,
        memory: {
          publishedTopicIds: [],
          winningHooks: [],
          winningCtas: [],
          winningPublishHours: input.promptHints.preferPublishHours,
          winningVideoStyles: [],
          avoidedTopicIds: [],
          updatedAt: new Date().toISOString(),
        },
        rankedTopics: [],
        rankedCategories: [],
        enabled: true,
      });
      const planned = planExperiments({
        analytics: input.analytics,
        optimization,
        enabled: true,
      });
      const results = collectExperimentResults(planned, input.analytics, optimization);
      for (const result of results.slice(0, 4)) {
        const def = planned.find((p) => p.id === result.experimentId);
        if (!def) continue;
        experiments.push({
          id: `brain_${result.experimentId}`,
          kind: mapBrainVariable(result.variable),
          label: `${result.variable} experiment`,
          variantA: String(def.variants[0]?.value ?? "A"),
          variantB: String(def.variants[1]?.value ?? "B"),
          status: "completed",
          winner: result.winnerVariantId === "a" ? "A" : "B",
          lift: result.lift,
          confidence: result.confidence,
          rationale: `Brain experiment winner ${result.winnerVariantId} (lift ${result.lift}).`,
        });
      }
    } catch {
      // Brain optimizer signature may evolve — DNA experiments still apply.
    }
  }

  return dedupeExperiments(experiments);
}

function mapBrainVariable(variable: string): LearningExperiment["kind"] {
  if (variable === "hook") return "hook";
  if (variable === "cta") return "cta";
  if (variable === "length") return "duration";
  if (variable === "publish-time") return "publish-time";
  return "hook";
}

function expId(kind: string): string {
  return `exp_${createHash("sha256").update(kind).digest("hex").slice(0, 8)}`;
}

function dedupeExperiments(list: LearningExperiment[]): LearningExperiment[] {
  const seen = new Set<string>();
  const out: LearningExperiment[] = [];
  for (const item of list) {
    const key = `${item.kind}|${item.variantA}|${item.variantB}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
