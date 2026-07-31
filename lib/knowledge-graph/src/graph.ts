import { edgeId } from "./ontology.js";
import type {
  ConceptEdge,
  ConceptEdgeKind,
  ConceptNode,
  KnowledgeGraphDocument,
  NodeLearningState,
} from "./types.js";
import { KNOWLEDGE_GRAPH_VERSION } from "./types.js";
import { createDefaultLearningState } from "./state.js";

export function createEmptyDocument(childId: string): KnowledgeGraphDocument {
  return {
    version: KNOWLEDGE_GRAPH_VERSION,
    childId,
    catalogVersion: 0,
    updatedAt: new Date(0).toISOString(),
    nodes: {},
    edges: [],
    states: {},
  };
}

export function upsertNode(
  doc: KnowledgeGraphDocument,
  node: ConceptNode,
): KnowledgeGraphDocument {
  if (doc.nodes[node.id]) {
    const prev = doc.nodes[node.id]!;
    doc.nodes[node.id] = {
      ...prev,
      ...node,
      tags: mergeTags(prev.tags, node.tags),
      links: { ...prev.links, ...node.links },
    };
    return doc;
  }
  doc.nodes[node.id] = node;
  if (!doc.states[node.id]) {
    doc.states[node.id] = createDefaultLearningState();
  }
  return doc;
}

export function upsertEdge(
  doc: KnowledgeGraphDocument,
  from: string,
  kind: ConceptEdgeKind,
  to: string,
  weight = 1,
): KnowledgeGraphDocument {
  const id = edgeId(from, kind, to);
  const existing = doc.edges.find((e) => e.id === id);
  if (existing) {
    existing.weight = Math.max(existing.weight ?? 1, weight);
    return doc;
  }
  const edge: ConceptEdge = { id, from, to, kind, weight };
  doc.edges.push(edge);
  return doc;
}

function mergeTags(a?: string[], b?: string[]): string[] | undefined {
  if (!a && !b) return undefined;
  return [...new Set([...(a ?? []), ...(b ?? [])])];
}

export type AdjacencyIndex = {
  out: Map<string, ConceptEdge[]>;
  in: Map<string, ConceptEdge[]>;
};

export function buildAdjacency(edges: ConceptEdge[]): AdjacencyIndex {
  const out = new Map<string, ConceptEdge[]>();
  const inn = new Map<string, ConceptEdge[]>();
  for (const e of edges) {
    const o = out.get(e.from);
    if (o) o.push(e);
    else out.set(e.from, [e]);
    const i = inn.get(e.to);
    if (i) i.push(e);
    else inn.set(e.to, [e]);
  }
  return { out, in: inn };
}

export function neighbors(
  index: AdjacencyIndex,
  nodeId: string,
  kinds?: ConceptEdgeKind[],
): ConceptEdge[] {
  const edges = [
    ...(index.out.get(nodeId) ?? []),
    ...(index.in.get(nodeId) ?? []),
  ];
  if (!kinds?.length) return edges;
  const set = new Set(kinds);
  return edges.filter((e) => set.has(e.kind));
}

export function getState(
  doc: KnowledgeGraphDocument,
  nodeId: string,
): NodeLearningState {
  return doc.states[nodeId] ?? createDefaultLearningState();
}

/** Shallow clone safe for incremental mutation of nodes/edges/states maps. */
export function cloneDocument(doc: KnowledgeGraphDocument): KnowledgeGraphDocument {
  return {
    ...doc,
    nodes: { ...doc.nodes },
    edges: doc.edges.map((e) => ({ ...e })),
    states: { ...doc.states },
  };
}
