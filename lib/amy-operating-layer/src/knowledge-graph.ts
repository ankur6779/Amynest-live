import type { FamilyIntelligenceSnapshot } from "@workspace/family-intelligence";
import type { FamilyKnowledgeGraph, KnowledgeGraphEdge, KnowledgeGraphNode } from "./types.js";

export function buildFamilyKnowledgeGraph(
  snapshot: FamilyIntelligenceSnapshot,
): FamilyKnowledgeGraph {
  const nodes: KnowledgeGraphNode[] = [];
  const edges: KnowledgeGraphEdge[] = [];

  nodes.push({ id: "health", type: "outcome", label: `Health ${snapshot.health.score}` });

  for (const g of snapshot.goals) {
    const id = `goal_${g.id}`;
    nodes.push({ id, type: "goal", label: g.target });
    edges.push({ from: id, to: "health", relation: "drives", weight: 0.7 });
  }

  for (const h of snapshot.digitalTwin.habits) {
    const id = `habit_${h}`;
    nodes.push({ id, type: "habit", label: h });
    edges.push({ from: id, to: "health", relation: "improves", weight: 0.6 });
  }

  for (const w of snapshot.digitalTwin.weaknesses) {
    const id = `weak_${w}`;
    nodes.push({ id, type: "behavior", label: w });
    edges.push({ from: id, to: "health", relation: "blocks", weight: 0.5 });
  }

  if (snapshot.topAction) {
    const id = `intervention_${snapshot.topAction.category}`;
    nodes.push({ id, type: "intervention", label: snapshot.topAction.title });
    const target = weaknessNodeForCategory(snapshot.topAction.category);
    if (target) {
      edges.push({ from: id, to: target, relation: "improves", weight: 0.8 });
    }
    edges.push({ from: id, to: "health", relation: "predicts", weight: snapshot.topAction.valueScore / 100 });
  }

  for (const m of snapshot.memory.filter((mem) => mem.outcome === "positive")) {
    const id = `mem_${m.id}`;
    nodes.push({ id, type: "intervention", label: m.key });
    edges.push({ from: id, to: "health", relation: "resulted_in", weight: 0.9 });
  }

  return { nodes, edges };
}

function weaknessNodeForCategory(category: string): string | null {
  if (category.includes("routine")) return "weak_routine_consistency";
  if (category.includes("learning")) return null;
  return null;
}

export function graphReasoningPath(
  graph: FamilyKnowledgeGraph,
  fromId: string,
  toId: string,
): string[] {
  const path: string[] = [];
  const edge = graph.edges.find((e) => e.from === fromId && e.to === toId);
  if (edge) {
    path.push(`${fromId} --${edge.relation}--> ${toId}`);
  }
  return path;
}
