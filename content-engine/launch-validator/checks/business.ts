/**
 * Business validation — duplicates, campaign balance, calendar, season, slot.
 */

import { evaluateTopic } from "../../content-intelligence/scoring/topic-gate.js";
import type { LaunchCheck, LaunchValidationInput } from "../types.js";

export function validateBusiness(input: LaunchValidationInput): LaunchCheck[] {
  const asOfDate =
    input.asOfDate ?? new Date().toISOString().slice(0, 10);
  const published = input.publishedTopicIds ?? [];
  const gate = evaluateTopic({
    topic: input.content.topic,
    asOfDate,
    memory: [],
    publishedTopicIds: published,
  });

  const checks: LaunchCheck[] = [
    {
      id: "business.not-duplicate",
      category: "business",
      ok: !published.includes(input.content.topic.id),
      severity: "critical",
      code: "DUPLICATE_TOPIC",
      message: "Must not republish a duplicate topic accidentally",
      suggestion: "Pick the next approved editorial calendar topic.",
    },
    {
      id: "business.campaign-balance",
      category: "business",
      ok: gate.scores.seriesBalance >= 35,
      severity: "major",
      code: "CAMPAIGN_IMBALANCE",
      message: "Campaign / series balance should remain healthy",
      suggestion: "Rotate series before stacking too many similar uploads.",
    },
    {
      id: "business.editorial-fit",
      category: "business",
      ok: gate.scores.overall >= 50,
      severity: "major",
      code: "EDITORIAL_MISFIT",
      message: "Topic should respect editorial intelligence scoring",
      suggestion: gate.reasons[0] ?? "Re-run content intelligence before publish.",
    },
    {
      id: "business.seasonal",
      category: "business",
      ok: gate.scores.seasonalRelevance >= 30,
      severity: "minor",
      code: "SEASONAL_WEAK",
      message: "Seasonal relevance should be considered",
      suggestion: "Boost seasonal campaigns when school/festival windows are active.",
    },
    {
      id: "business.publish-slot",
      category: "business",
      ok:
        input.schedule.mode === "immediate" ||
        input.schedule.mode === "draft" ||
        Boolean(input.schedule.publishAt),
      severity: "critical",
      code: "NO_PUBLISH_SLOT",
      message: "A publishing slot / schedule must be available",
      suggestion: "Set immediate publish or a concrete scheduled publishAt.",
    },
  ];

  return checks;
}
