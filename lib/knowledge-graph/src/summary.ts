import { CONFIDENCE } from "./ontology.js";
import { getState } from "./graph.js";
import { isStruggling, refreshForgottenFlag } from "./state.js";
import type { KnowledgeGraphDocument, KnowledgeGraphSummary } from "./types.js";

export function summarizeKnowledgeGraph(
  doc: KnowledgeGraphDocument,
  nowIso = new Date().toISOString(),
): KnowledgeGraphSummary {
  const nodes = Object.values(doc.nodes);
  let touched = 0;
  let mastered = 0;
  let struggling = 0;
  let forgotten = 0;
  let confSum = 0;
  let confN = 0;
  const masteredList: KnowledgeGraphSummary["topMastered"] = [];
  const strugglingList: KnowledgeGraphSummary["topStruggling"] = [];

  for (const node of nodes) {
    if (node.kind !== "entity" && node.kind !== "phoneme" && node.kind !== "word") {
      continue;
    }
    const state = refreshForgottenFlag(getState(doc, node.id), nowIso);
    const touch =
      state.counts.seen +
        state.counts.heard +
        state.counts.recognized +
        state.counts.spoken +
        state.counts.failed >
      0;
    if (!touch) continue;
    touched += 1;
    confSum += state.confidence;
    confN += 1;
    if (state.mastered) {
      mastered += 1;
      masteredList.push({
        nodeId: node.id,
        label: node.label,
        confidence: state.confidence,
      });
    }
    if (isStruggling(state)) {
      struggling += 1;
      strugglingList.push({
        nodeId: node.id,
        label: node.label,
        confidence: state.confidence,
      });
    }
    if (state.forgotten) forgotten += 1;
  }

  masteredList.sort((a, b) => b.confidence - a.confidence);
  strugglingList.sort((a, b) => a.confidence - b.confidence);

  return {
    childId: doc.childId,
    totalNodes: nodes.length,
    touchedNodes: touched,
    masteredNodes: mastered,
    strugglingNodes: struggling,
    forgottenNodes: forgotten,
    avgConfidence: confN ? Math.round(confSum / confN) : 0,
    topMastered: masteredList.slice(0, 8),
    topStruggling: strugglingList.slice(0, 8),
  };
}

export function getWeakPhonemes(
  doc: KnowledgeGraphDocument,
  limit = 5,
): Array<{ nodeId: string; label: string; confidence: number }> {
  const out: Array<{ nodeId: string; label: string; confidence: number }> = [];
  for (const node of Object.values(doc.nodes)) {
    if (node.kind !== "phoneme") continue;
    const state = getState(doc, node.id);
    if (state.counts.failed + state.counts.spoken + state.counts.recognized === 0) {
      continue;
    }
    if (state.confidence >= CONFIDENCE.recognized) continue;
    out.push({
      nodeId: node.id,
      label: node.label,
      confidence: state.confidence,
    });
  }
  out.sort((a, b) => a.confidence - b.confidence);
  return out.slice(0, limit);
}
