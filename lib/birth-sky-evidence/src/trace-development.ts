/**
 * Reconstruct development traces from DevelopmentSnapshot fields.
 */

import {
  DEVELOPMENT_ENGINE_VERSION,
  type DevelopmentSnapshot,
} from "@workspace/birth-sky-development";
import { ruleRef } from "./rule-ids.js";
import type { EvidenceNode } from "./types.js";

export function traceDevelopment(
  development?: DevelopmentSnapshot | null,
): EvidenceNode[] {
  if (!development) return [];
  const version =
    development.developmentEngineVersion || DEVELOPMENT_ENGINE_VERSION;
  const nodes: EvidenceNode[] = [];

  const stageKey = `stage_${development.stage.id}`;
  const stageRef = ruleRef("D", stageKey);
  nodes.push({
    id: `development:stage:${development.stage.id}`,
    label: development.stage.label,
    engine: "development",
    engineVersion: version,
    rules: [stageRef],
    supportingFacts: [`age_months=${development.ageMonths}`],
    confidence: development.confidence,
    dependencies: ["child_age"],
  });

  for (const p of development.priorityAreas.slice(0, 8)) {
    const key = `priority_${p.domain}_${p.rank}`;
    const ref = ruleRef("D", key);
    nodes.push({
      id: `development:priority:${p.domain}`,
      label: p.label,
      engine: "development",
      engineVersion: version,
      rules: [ref],
      supportingFacts: [p.reason, `score=${p.score}`],
      confidence: Math.min(1, p.score),
      dependencies: [
        `development:stage:${development.stage.id}`,
        "meaning_profile",
      ],
    });
  }

  for (const a of development.recommendedParentActions.slice(0, 6)) {
    const key = `parent_action_${a.id}`;
    const ref = ruleRef("D", key);
    nodes.push({
      id: `development:action:${a.id}`,
      label: a.label,
      engine: "development",
      engineVersion: version,
      rules: [ref],
      supportingFacts: a.domain ? [`domain=${a.domain}`] : [],
      confidence: development.confidence,
      dependencies: development.priorityAreas[0]
        ? [`development:priority:${development.priorityAreas[0].domain}`]
        : [`development:stage:${development.stage.id}`],
    });
  }

  return nodes.sort((a, b) => a.id.localeCompare(b.id));
}
