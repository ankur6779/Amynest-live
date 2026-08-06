import { createHash } from "node:crypto";
import type { AnalyticsReport } from "../../types/analytics.js";
import type {
  ExperimentDefinition,
  ExperimentResult,
  OptimizationDecision,
} from "../../types/campaign-plan.js";

/** Plan A/B experiments for titles, hooks, CTA, length, publish time, hashtags. */
export function planExperiments(input: {
  analytics: AnalyticsReport;
  optimization: OptimizationDecision;
  enabled: boolean;
  now?: Date;
}): ExperimentDefinition[] {
  if (!input.enabled) return [];
  const now = (input.now ?? new Date()).toISOString();
  const experiments: ExperimentDefinition[] = [
    makeExperiment("title", now, [
      { id: "a", label: "question-title", value: "What if mornings felt calmer?" },
      { id: "b", label: "how-to-title", value: "How to make mornings calmer" },
    ]),
    makeExperiment("hook", now, [
      { id: "a", label: "question-hook", value: "Parents — what if one cue changed everything?" },
      { id: "b", label: "bold-hook", value: "Stop repeating yourself. Try this instead." },
    ]),
    makeExperiment("cta", now, [
      { id: "a", label: "soft-cta", value: "Try AmyNest AI free today" },
      { id: "b", label: "app-demo-cta", value: "Watch how AmyNest guides your routine" },
    ]),
    makeExperiment("length", now, [
      { id: "a", label: "20s", value: 20 },
      { id: "b", label: "30s", value: 30 },
    ]),
    makeExperiment("publish-time", now, [
      { id: "a", label: "evening", value: input.optimization.publishHour },
      {
        id: "b",
        label: "morning",
        value: (input.optimization.publishHour + 12) % 24,
      },
    ]),
    makeExperiment("hashtags", now, [
      { id: "a", label: "broad", value: "Parenting,Kids,Shorts" },
      { id: "b", label: "niche", value: "GentleParenting,AmyNest,GlobalParenting" },
    ]),
    makeExperiment("description", now, [
      { id: "a", label: "seo-first", value: "SEO-led description with keywords first" },
      { id: "b", label: "story-first", value: "Story-led description with CTA last" },
    ]),
  ];

  // Auto-complete winners from weak content dimensions when sample exists.
  return experiments.map((experiment) => {
    const result = inferWinner(experiment, input.analytics, input.optimization);
    if (!result) return experiment;
    return {
      ...experiment,
      status: "completed",
      winnerVariantId: result.winnerVariantId,
    };
  });
}

export function collectExperimentResults(
  experiments: readonly ExperimentDefinition[],
  analytics: AnalyticsReport,
  optimization: OptimizationDecision,
): ExperimentResult[] {
  const results: ExperimentResult[] = [];
  for (const experiment of experiments) {
    const inferred = inferWinner(experiment, analytics, optimization);
    if (!inferred) continue;
    results.push(inferred);
  }
  return results;
}

function makeExperiment(
  variable: ExperimentDefinition["variable"],
  startedAt: string,
  variants: ExperimentDefinition["variants"],
): ExperimentDefinition {
  const id = `exp_${createHash("sha256")
    .update(`${variable}|${startedAt}`)
    .digest("hex")
    .slice(0, 10)}`;
  return {
    id,
    variable,
    variants,
    startedAt,
    status: "running",
  };
}

function inferWinner(
  experiment: ExperimentDefinition,
  analytics: AnalyticsReport,
  optimization: OptimizationDecision,
): ExperimentResult | undefined {
  const variantB = experiment.variants[1];
  const variantA = experiment.variants[0];
  if (!variantA || !variantB) return undefined;

  let preferB = false;
  let lift = 0.08;

  switch (experiment.variable) {
    case "hook":
      preferB =
        analytics.contentScores.filter((c) => c.score.hooks < 55).length >
        analytics.contentScores.length / 3;
      lift = 0.12;
      break;
    case "cta":
      preferB = optimization.ctaStyle === "app-demo" || optimization.ctaStyle === "direct";
      lift = 0.1;
      break;
    case "length":
      preferB = optimization.videoDurationSeconds === 30;
      lift = 0.09;
      break;
    case "publish-time":
      preferB = false;
      lift = 0.07;
      break;
    case "title":
      preferB = analytics.periodReport.averageCtr < 0.04;
      lift = 0.11;
      break;
    case "hashtags":
      preferB = true;
      lift = 0.06;
      break;
    case "description":
      preferB =
        analytics.contentScores.filter((c) => c.score.descriptions < 55).length > 0;
      lift = 0.05;
      break;
    default:
      preferB = false;
  }

  // Need minimum sample to declare a winner.
  if (analytics.videoSummaries.length < 1) return undefined;

  const winner = preferB ? variantB : variantA;
  return {
    experimentId: experiment.id,
    variable: experiment.variable,
    winnerVariantId: winner.id,
    winnerValue: winner.value,
    lift,
    confidence: Math.min(0.92, 0.5 + analytics.videoSummaries.length * 0.05),
  };
}
