/**
 * Monthly evolution report — evidence of continuous improvement.
 */

import { createHash } from "node:crypto";
import type {
  CorrelationInsight,
  FailureAnalysis,
  MonthlyEvolutionReport,
  PlatformPerformance,
  PromptOptimizationHints,
  VideoDna,
} from "../types.js";

export function buildMonthlyEvolutionReport(input: {
  month: string;
  dnaList: VideoDna[];
  performances: PlatformPerformance[];
  correlations: CorrelationInsight[];
  failures: FailureAnalysis[];
  promptHints: PromptOptimizationHints;
  titlesByVideoId?: Record<string, string>;
}): MonthlyEvolutionReport {
  const byPerf = new Map(input.performances.map((p) => [p.videoId, p]));
  const ranked = input.dnaList
    .map((dna) => ({
      videoId: dna.videoId,
      title: input.titlesByVideoId?.[dna.videoId] ?? dna.topicTitle,
      score: byPerf.get(dna.videoId)?.performanceScore ?? 0,
      topicId: dna.topicId,
      campaign: dna.campaign,
      seriesId: String(dna.seriesId),
    }))
    .sort((a, b) => b.score - a.score);

  const top10 = ranked.slice(0, 10).map(({ videoId, title, score }) => ({
    videoId,
    title,
    score,
  }));
  const bottom10 = ranked
    .slice()
    .reverse()
    .slice(0, 10)
    .map(({ videoId, title, score }) => ({ videoId, title, score }));

  const topicScores = new Map<string, number[]>();
  for (const row of ranked) {
    const list = topicScores.get(row.topicId) ?? [];
    list.push(row.score);
    topicScores.set(row.topicId, list);
  }
  const topicAvg = [...topicScores.entries()]
    .map(([topicId, scores]) => ({
      topicId,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  const campaignScores = aggregate(ranked.map((r) => [r.campaign, r.score] as const));
  const seriesScores = aggregate(ranked.map((r) => [r.seriesId, r.score] as const));

  const optimizationRecommendations = [
    ...input.correlations.slice(0, 5).map((c) => c.rationale),
    ...input.failures.slice(0, 3).flatMap((f) =>
      f.causes.slice(0, 1).map((c) => `${f.title}: ${c.recommendation}`),
    ),
    input.promptHints.preferDurations[0]
      ? `Bias production toward ~${input.promptHints.preferDurations[0]}s runtimes.`
      : "Keep Shorts concise.",
    input.promptHints.preferHookStyles[0]
      ? `Increase ${input.promptHints.preferHookStyles[0]} hook priority in future scripts.`
      : "Keep emotion-first hooks.",
  ].slice(0, 12);

  const report: Omit<MonthlyEvolutionReport, "markdown"> = {
    id: `month_${createHash("sha256").update(input.month).digest("hex").slice(0, 10)}`,
    month: input.month,
    generatedAt: new Date().toISOString(),
    top10,
    bottom10,
    fastestGrowingTopics: topicAvg.slice(0, 5).map((t) => t.topicId),
    decliningTopics: topicAvg.slice(-5).reverse().map((t) => t.topicId),
    bestCampaigns: campaignScores.slice(0, 5).map((c) => c.key),
    bestSeries: seriesScores.slice(0, 5).map((c) => c.key),
    optimizationRecommendations,
  };

  return { ...report, markdown: renderMonthlyMarkdown(report) };
}

function aggregate(
  pairs: ReadonlyArray<readonly [string, number]>,
): Array<{ key: string; avg: number }> {
  const map = new Map<string, number[]>();
  for (const [key, score] of pairs) {
    const list = map.get(key) ?? [];
    list.push(score);
    map.set(key, list);
  }
  return [...map.entries()]
    .map(([key, scores]) => ({
      key,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))
    .sort((a, b) => b.avg - a.avg);
}

function renderMonthlyMarkdown(
  report: Omit<MonthlyEvolutionReport, "markdown">,
): string {
  const lines = [
    `# AmyNest Continuous Learning — ${report.month}`,
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Top 10 Videos",
    "",
    ...report.top10.map(
      (v, i) => `${i + 1}. ${v.title} (\`${v.videoId}\`) — score ${v.score}`,
    ),
    "",
    "## Bottom 10 Videos",
    "",
    ...report.bottom10.map(
      (v, i) => `${i + 1}. ${v.title} (\`${v.videoId}\`) — score ${v.score}`,
    ),
    "",
    "## Fastest Growing Topics",
    "",
    ...report.fastestGrowingTopics.map((t) => `- ${t}`),
    "",
    "## Declining Topics",
    "",
    ...report.decliningTopics.map((t) => `- ${t}`),
    "",
    "## Best Campaigns",
    "",
    ...report.bestCampaigns.map((c) => `- ${c}`),
    "",
    "## Best Series",
    "",
    ...report.bestSeries.map((s) => `- ${s}`),
    "",
    "## Optimization Recommendations",
    "",
    ...report.optimizationRecommendations.map((r) => `- ${r}`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}
