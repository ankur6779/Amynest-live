import { CONFIDENCE } from "./ontology.js";
import { buildAdjacency, getState, neighbors } from "./graph.js";
import { isKnown, isStruggling, refreshForgottenFlag } from "./state.js";
import type {
  ConceptRecommendation,
  KnowledgeGraphDocument,
  RecommendationReason,
} from "./types.js";

export type RecommendOptions = {
  limit?: number;
  nowIso?: string;
  /** Prefer recommendations linked to these sources. */
  preferKinds?: ConceptRecommendation["kind"][];
};

function pushUnique(
  bag: Map<string, ConceptRecommendation>,
  rec: ConceptRecommendation,
): void {
  const prev = bag.get(rec.nodeId);
  if (!prev || prev.score < rec.score) bag.set(rec.nodeId, rec);
}

/**
 * Recommend next concepts from what the child knows / struggles with.
 *
 * - Knows Lion → Tiger, Leopard, Jungle, Roar
 * - Struggles with L → Lion, Leaf, Lamp, Speech Coach
 */
export function recommendConcepts(
  doc: KnowledgeGraphDocument,
  opts: RecommendOptions = {},
): ConceptRecommendation[] {
  const limit = opts.limit ?? 8;
  const nowIso = opts.nowIso ?? new Date().toISOString();
  const index = buildAdjacency(doc.edges);
  const bag = new Map<string, ConceptRecommendation>();

  for (const node of Object.values(doc.nodes)) {
    const state = refreshForgottenFlag(getState(doc, node.id), nowIso);

    if (state.forgotten) {
      pushUnique(bag, {
        nodeId: node.id,
        label: node.label,
        kind: node.kind,
        reason: "forgotten",
        score: 90 + (100 - state.confidence) * 0.1,
        links: node.links,
      });
    }

    if (isStruggling(state) && (node.kind === "phoneme" || node.kind === "word" || node.kind === "entity")) {
      // Struggle expansion: phoneme → practice words / entities / speech
      if (node.kind === "phoneme") {
        for (const edge of neighbors(index, node.id, [
          "starts_with",
          "practices",
          "links_to",
        ])) {
          const otherId = edge.from === node.id ? edge.to : edge.from;
          const other = doc.nodes[otherId];
          if (!other) continue;
          const otherState = getState(doc, otherId);
          if (otherState.mastered) continue;
          let reason: RecommendationReason = "phoneme_practice";
          if (other.kind === "speech") reason = "speech_coach";
          if (other.kind === "word" || other.kind === "entity") {
            reason = "phoneme_practice";
          }
          pushUnique(bag, {
            nodeId: other.id,
            label: other.label,
            kind: other.kind,
            reason,
            score: 88 * (edge.weight ?? 1),
            relatedTo: node.id,
            links: other.links,
          });
        }
      } else {
        pushUnique(bag, {
          nodeId: node.id,
          label: node.label,
          kind: node.kind,
          reason: "phoneme_practice",
          score: 80 + (CONFIDENCE.struggling - state.confidence),
          links: node.links,
        });
      }
    }

    if (isKnown(state) && (node.kind === "entity" || node.kind === "sound")) {
      for (const edge of neighbors(index, node.id, [
        "related",
        "lives_in",
        "makes_sound",
        "has_attribute",
        "links_to",
      ])) {
        const otherId = edge.from === node.id ? edge.to : edge.from;
        const other = doc.nodes[otherId];
        if (!other) continue;
        const otherState = getState(doc, otherId);
        if (otherState.mastered && otherState.confidence >= CONFIDENCE.mastered) {
          continue;
        }
        let reason: RecommendationReason = "related_to_known";
        if (edge.kind === "lives_in") reason = "same_habitat";
        if (edge.kind === "makes_sound") reason = "same_sound";
        if (other.kind === "story") reason = "story_link";
        if (other.kind === "reading") reason = "reading_link";
        if (other.kind === "speech") reason = "speech_coach";
        const novelty = otherState.confidence < 10 ? 12 : 0;
        pushUnique(bag, {
          nodeId: other.id,
          label: other.label,
          kind: other.kind,
          reason,
          score: 70 * (edge.weight ?? 1) + novelty + state.confidence * 0.15,
          relatedTo: node.id,
          links: other.links,
        });
      }
    }
  }

  // Light explore bias when bag is thin
  if (bag.size < limit) {
    for (const node of Object.values(doc.nodes)) {
      if (node.kind !== "entity") continue;
      const state = getState(doc, node.id);
      if (state.counts.seen + state.counts.heard > 0) continue;
      pushUnique(bag, {
        nodeId: node.id,
        label: node.label,
        kind: node.kind,
        reason: "explore_new",
        score: 35,
        links: node.links,
      });
      if (bag.size >= limit * 2) break;
    }
  }

  let list = [...bag.values()];
  if (opts.preferKinds?.length) {
    const prefer = new Set(opts.preferKinds);
    list = list.sort((a, b) => {
      const ap = prefer.has(a.kind) ? 1 : 0;
      const bp = prefer.has(b.kind) ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return b.score - a.score;
    });
  } else {
    list.sort((a, b) => b.score - a.score);
  }
  return list.slice(0, limit);
}
