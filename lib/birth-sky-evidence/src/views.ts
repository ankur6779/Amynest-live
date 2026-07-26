/**
 * Explanation level projections — tags only, no parent-facing prose.
 */

import type { EvidenceSnapshot, ExplanationLevel } from "./types.js";

export function buildViews(
  snap: Omit<EvidenceSnapshot, "views">,
): EvidenceSnapshot["views"] {
  const compact = snap.ruleTrace
    .slice(0, 12)
    .map(
      (n) =>
        `${n.engine}:${n.id.split(":").slice(1).join(":")}@${n.rules.map((r) => r.id).join(",")}`,
    )
    .sort();

  const debug = [
    `engines=${Object.entries(snap.engineVersions)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}:${v}`)
      .join(",")}`,
    `overall_confidence=${snap.confidenceBreakdown.overall}`,
    ...snap.ruleTrace.map(
      (n) =>
        `trace ${n.id} rules=${n.rules.map((r) => r.id).join(",")} conf=${n.confidence} facts=${n.supportingFacts.slice(0, 3).join(";")}`,
    ),
    ...snap.dependencyGraph.edges
      .slice(0, 40)
      .map((e) => `edge ${e.from} -${e.relation}-> ${e.to}`),
  ];

  const developer = [
    `evidence_engine=${snap.evidenceEngineVersion}`,
    `level=${snap.level}`,
    `trace_count=${snap.ruleTrace.length}`,
    `graph_nodes=${snap.dependencyGraph.nodes.length}`,
    `graph_edges=${snap.dependencyGraph.edges.length}`,
    `confidence_meaning=${snap.confidenceBreakdown.meaning ?? "null"}`,
    `confidence_development=${snap.confidenceBreakdown.development ?? "null"}`,
    `confidence_adaptive=${snap.confidenceBreakdown.adaptive ?? "null"}`,
    `confidence_conversation=${snap.confidenceBreakdown.conversation ?? "null"}`,
    `confidence_overall=${snap.confidenceBreakdown.overall}`,
    ...snap.ruleTrace.map((n) => JSON.stringify(n)),
  ];

  return { compact, debug, developer };
}

export function projectLevel(
  snap: EvidenceSnapshot,
  level: ExplanationLevel,
): string[] {
  return snap.views[level];
}
