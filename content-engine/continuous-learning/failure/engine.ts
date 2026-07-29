/**
 * Failure analysis — explain poor performers with actionable fixes.
 */

import type {
  FailureAnalysis,
  PlatformPerformance,
  VideoDna,
} from "../types.js";

export function analyzeFailures(input: {
  dnaList: VideoDna[];
  performances: PlatformPerformance[];
  titlesByVideoId?: Record<string, string>;
  threshold?: number;
}): FailureAnalysis[] {
  const threshold = input.threshold ?? 45;
  const byDna = new Map(input.dnaList.map((d) => [d.videoId, d]));
  const failures: FailureAnalysis[] = [];

  for (const perf of input.performances) {
    if (perf.performanceScore >= threshold) continue;
    const dna = byDna.get(perf.videoId);
    const causes: FailureAnalysis["causes"] = [];

    if (perf.ctr < 0.035 || (dna && dna.hook.length < 24)) {
      causes.push({
        code: "weak-hook",
        message: "Hook underperformed on CTR / strength",
        recommendation: "Rewrite cold open as a sharper parenting situation in ≤3s.",
      });
    }
    if (dna && /amynest/i.test(dna.hook)) {
      causes.push({
        code: "long-intro",
        message: "Product appears too early in the hook",
        recommendation: "Delay AmyNest until after the emotional beat.",
      });
    }
    if (dna && dna.durationSeconds >= 28 && perf.retention < 0.5) {
      causes.push({
        code: "too-much-narration",
        message: "Longer runtime with weak retention suggests VO overload",
        recommendation: "Cut narration; lean on muted-readable micro actions.",
      });
    }
    if (dna && (dna.ctaVariant === "direct" || dna.ctaText.length < 12)) {
      causes.push({
        code: "weak-cta",
        message: "CTA may be too hard or too thin",
        recommendation: "Use hope-first soft/habit CTA on end card.",
      });
    }
    if (perf.retention < 0.45) {
      causes.push({
        code: "poor-pacing",
        message: "Retention curve suggests pacing/visual fatigue",
        recommendation: "Tighten scene goals; add micro-actions; vary shot size.",
      });
    }
    if (dna && /feature|premium|ui/i.test(dna.feature) && perf.retention < 0.5) {
      causes.push({
        code: "visual-clutter",
        message: "Feature-heavy video may read as UI clutter",
        recommendation: "Show UI as a story prop in-environment, not a slideshow.",
      });
    }
    if (dna?.season === "Evergreen" && perf.views < 1000) {
      causes.push({
        code: "wrong-publish-timing",
        message: "Low reach may indicate weak slot or season mismatch",
        recommendation: "Align with editorial weekday pillar + winning publish hour.",
      });
    }
    if (perf.retention < 0.4) {
      causes.push({
        code: "low-retention",
        message: "Average retention is critically low",
        recommendation: "Re-direct first 3 seconds and mid-video emotion beat.",
      });
    }
    if (perf.ctr < 0.03) {
      causes.push({
        code: "low-ctr",
        message: "CTR indicates weak title/thumbnail stop power",
        recommendation: "Test emotion-closeup thumbnail + question title variant.",
      });
    }
    if (causes.length === 0) {
      causes.push({
        code: "topic-saturation",
        message: "Underperformance without a single dominant creative fault",
        recommendation: "Rotate series/topic; avoid near-duplicate hooks.",
      });
    }

    failures.push({
      videoId: perf.videoId,
      title:
        input.titlesByVideoId?.[perf.videoId] ??
        dna?.topicTitle ??
        perf.videoId,
      performanceScore: perf.performanceScore,
      causes,
      summary: causes.map((c) => c.message).join(" "),
    });
  }

  return failures.sort((a, b) => a.performanceScore - b.performanceScore);
}
