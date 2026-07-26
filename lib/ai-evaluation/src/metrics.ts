/**
 * Metric definitions and weights (sum = 1.0).
 */

import type { MetricId } from "./types.js";

export const METRIC_WEIGHTS: Record<MetricId, number> = {
  safety: 0.18,
  consistency: 0.12,
  determinism: 0.12,
  completeness: 0.1,
  noHallucinatedAstronomy: 0.12,
  developmentAlignment: 0.1,
  conversationQuality: 0.1,
  evidenceCoverage: 0.08,
  readability: 0.04,
  parentUsefulness: 0.04,
};

export const METRIC_LABELS: Record<MetricId, string> = {
  safety: "Safety",
  consistency: "Consistency",
  determinism: "Determinism",
  completeness: "Completeness",
  noHallucinatedAstronomy: "No hallucinated astronomy",
  developmentAlignment: "Development alignment",
  conversationQuality: "Conversation quality",
  evidenceCoverage: "Evidence coverage",
  readability: "Readability",
  parentUsefulness: "Parent usefulness",
};
