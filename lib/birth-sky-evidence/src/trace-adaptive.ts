/**
 * Reconstruct adaptive traces from AdaptiveSnapshot fields.
 */

import {
  ADAPTIVE_ENGINE_VERSION,
  type AdaptiveSnapshot,
} from "@workspace/birth-sky-adaptive";
import { ruleRef } from "./rule-ids.js";
import type { EvidenceNode } from "./types.js";

export function traceAdaptive(
  adaptive?: AdaptiveSnapshot | null,
): EvidenceNode[] {
  if (!adaptive) return [];
  const version = adaptive.adaptiveEngineVersion || ADAPTIVE_ENGINE_VERSION;
  const nodes: EvidenceNode[] = [];

  const engKey = `engagement_${adaptive.profile.engagementLevel}`;
  nodes.push({
    id: `adaptive:engagement:${adaptive.profile.engagementLevel}`,
    label: `engagement_${adaptive.profile.engagementLevel}`,
    engine: "adaptive",
    engineVersion: version,
    rules: [ruleRef("A", engKey)],
    supportingFacts: [
      `score=${adaptive.engagementProfile.score}`,
      `consistency=${adaptive.profile.consistencyScore}`,
      `sessions_per_week=${adaptive.historySummary.sessionsPerWeek}`,
    ],
    confidence: adaptive.confidence,
    dependencies: ["child_history", "development_snapshot"],
  });

  nodes.push({
    id: `adaptive:routine_health:${adaptive.profile.routineHealthLabel}`,
    label: adaptive.profile.routineHealthLabel,
    engine: "adaptive",
    engineVersion: version,
    rules: [ruleRef("A", `routine_${adaptive.profile.routineHealthLabel}`)],
    supportingFacts: [
      `completion_rate=${adaptive.routineHealth.completionRate}`,
      ...adaptive.routineHealth.dropOffPoints.map((d) => `drop_off=${d}`),
    ],
    confidence: adaptive.confidence,
    dependencies: ["child_history"],
  });

  for (const t of adaptive.profile.preferredActivityTypes.slice(0, 6)) {
    nodes.push({
      id: `adaptive:prefer:${t}`,
      label: t,
      engine: "adaptive",
      engineVersion: version,
      rules: [ruleRef("A", `prefer_${t}`)],
      supportingFacts: ["learning_preferences"],
      confidence: adaptive.confidence,
      dependencies: [
        `adaptive:engagement:${adaptive.profile.engagementLevel}`,
      ],
    });
  }

  for (const r of adaptive.adaptationRecommendations.slice(0, 6)) {
    nodes.push({
      id: `adaptive:rec:${r.id}`,
      label: `${r.action}:${r.target}`,
      engine: "adaptive",
      engineVersion: version,
      rules: [ruleRef("A", `rec_${r.action}_${r.target}`)],
      supportingFacts: [r.reason],
      confidence: adaptive.confidence,
      dependencies: [
        `adaptive:routine_health:${adaptive.profile.routineHealthLabel}`,
      ],
    });
  }

  return nodes.sort((a, b) => a.id.localeCompare(b.id));
}
