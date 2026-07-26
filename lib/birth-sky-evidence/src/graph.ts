/**
 * Build deterministic evidence dependency graph across engines.
 */

import type { AdaptiveSnapshot } from "@workspace/birth-sky-adaptive";
import type { ConversationPlan } from "@workspace/birth-sky-conversation";
import type { DevelopmentSnapshot } from "@workspace/birth-sky-development";
import type { MeaningSnapshot } from "@workspace/birth-sky-meaning";
import type { EvidenceGraph, EvidenceNode, GraphEdge } from "./types.js";

export function buildDependencyGraph(input: {
  meaning?: MeaningSnapshot | null;
  development?: DevelopmentSnapshot | null;
  adaptive?: AdaptiveSnapshot | null;
  conversation?: ConversationPlan | null;
  ruleTrace: EvidenceNode[];
}): EvidenceGraph {
  const nodeSet = new Set<string>();
  const edges: GraphEdge[] = [];

  const addNode = (id: string) => nodeSet.add(id);
  const addEdge = (from: string, to: string, relation: GraphEdge["relation"]) => {
    addNode(from);
    addNode(to);
    edges.push({ from, to, relation });
  };

  // Astronomy → Meaning
  for (const n of input.ruleTrace.filter((x) => x.engine === "meaning")) {
    addNode(n.id);
    for (const dep of n.dependencies) {
      if (dep.startsWith("astronomy:")) {
        addEdge(dep, n.id, "derives");
      }
    }
  }

  // Meaning strengths → Development priorities / confidence
  const strengths = input.meaning?.profile.strengths.slice(0, 4) ?? [];
  for (const s of strengths) {
    const mid = `meaning:${slug(s)}`;
    addNode(mid);
    if (input.development) {
      for (const p of input.development.priorityAreas.slice(0, 3)) {
        addEdge(mid, `development:priority:${p.domain}`, "boosts");
      }
      addEdge(mid, `development:stage:${input.development.stage.id}`, "boosts");
    }
  }

  // Development → Adaptive preferences
  if (input.development && input.adaptive) {
    for (const p of input.development.priorityAreas.slice(0, 3)) {
      const from = `development:priority:${p.domain}`;
      for (const a of input.adaptive.profile.preferredActivityTypes.slice(0, 3)) {
        addEdge(from, `adaptive:prefer:${a}`, "adapts");
      }
    }
  }

  // Adaptive → Conversation priorities
  if (input.adaptive && input.conversation) {
    for (const t of input.conversation.priorityTopics.slice(0, 4)) {
      addEdge(
        `adaptive:engagement:${input.adaptive.profile.engagementLevel}`,
        `conversation:priority:${t}`,
        "prioritizes",
      );
    }
    addEdge(
      `adaptive:engagement:${input.adaptive.profile.engagementLevel}`,
      `conversation:intent:${input.conversation.intent}`,
      "prioritizes",
    );
  }

  // Development → Conversation
  if (input.development && input.conversation) {
    for (const p of input.development.priorityAreas.slice(0, 2)) {
      for (const t of input.conversation.priorityTopics.slice(0, 3)) {
        addEdge(
          `development:priority:${p.domain}`,
          `conversation:priority:${t}`,
          "prioritizes",
        );
      }
    }
  }

  // Include all ruleTrace node ids
  for (const n of input.ruleTrace) addNode(n.id);

  const nodes = [...nodeSet].sort();
  edges.sort(
    (a, b) =>
      a.from.localeCompare(b.from) ||
      a.to.localeCompare(b.to) ||
      a.relation.localeCompare(b.relation),
  );

  // Dedupe edges
  const seen = new Set<string>();
  const unique: GraphEdge[] = [];
  for (const e of edges) {
    const k = `${e.from}|${e.to}|${e.relation}`;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(e);
  }

  return { nodes, edges: unique };
}

function slug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}
