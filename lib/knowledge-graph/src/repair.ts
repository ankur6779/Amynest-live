import { KNOWLEDGE_GRAPH_VERSION, type KnowledgeGraphDocument } from "./types.js";
import { createDefaultLearningState } from "./state.js";
import { createEmptyDocument } from "./graph.js";
import {
  buildSeedDocument,
  mergeSeedIntoDocument,
  type SeedEntityInput,
} from "./seed-catalog.js";

export type KnowledgeGraphRepairResult = {
  doc: KnowledgeGraphDocument;
  repaired: boolean;
  actions: string[];
  dataLossRisk: "none" | "low" | "medium" | "high";
  reason: string;
};

/**
 * Sanitize / rebuild a knowledge graph document after corruption or schema drift.
 * Pure — does not touch storage.
 */
export function repairKnowledgeGraphDocument(
  raw: unknown,
  childId: string,
  seedEntities: SeedEntityInput[] = [],
): KnowledgeGraphRepairResult {
  const actions: string[] = [];
  const id = String(childId);

  if (raw == null) {
    const doc = seedEntities.length
      ? buildSeedDocument(id, seedEntities)
      : createEmptyDocument(id);
    return {
      doc,
      repaired: true,
      actions: ["reseed_empty"],
      dataLossRisk: "low",
      reason: "Missing document",
    };
  }

  if (typeof raw !== "object") {
    const doc = seedEntities.length
      ? buildSeedDocument(id, seedEntities)
      : createEmptyDocument(id);
    return {
      doc,
      repaired: true,
      actions: ["replace_non_object"],
      dataLossRisk: "high",
      reason: "Document was not an object",
    };
  }

  const obj = raw as Record<string, unknown>;
  let risk: KnowledgeGraphRepairResult["dataLossRisk"] = "none";
  let repaired = false;

  if (obj.version !== KNOWLEDGE_GRAPH_VERSION) {
    actions.push("schema_version_normalize");
    repaired = true;
    risk = "medium";
  }

  const nodes =
    obj.nodes && typeof obj.nodes === "object" && !Array.isArray(obj.nodes)
      ? (obj.nodes as KnowledgeGraphDocument["nodes"])
      : null;
  const edges = Array.isArray(obj.edges)
    ? (obj.edges as KnowledgeGraphDocument["edges"])
    : null;
  const states =
    obj.states && typeof obj.states === "object" && !Array.isArray(obj.states)
      ? (obj.states as KnowledgeGraphDocument["states"])
      : null;

  if (!nodes || !edges || !states) {
    actions.push("rebuild_structure");
    repaired = true;
    risk = "high";
    let doc = seedEntities.length
      ? buildSeedDocument(id, seedEntities)
      : createEmptyDocument(id);
    // Best-effort salvage of states when present
    if (states) {
      for (const [nodeId, st] of Object.entries(states)) {
        if (st && typeof st === "object") {
          doc.states[nodeId] = {
            ...createDefaultLearningState(),
            ...(st as object),
          } as KnowledgeGraphDocument["states"][string];
        }
      }
      actions.push("salvage_states");
      risk = "medium";
    }
    return {
      doc,
      repaired: true,
      actions,
      dataLossRisk: risk,
      reason: "Missing nodes/edges/states structure",
    };
  }

  // Drop dangling edges and ensure state objects exist for nodes
  const validEdges = edges.filter(
    (e) =>
      e &&
      typeof e === "object" &&
      typeof e.id === "string" &&
      typeof e.from === "string" &&
      typeof e.to === "string" &&
      nodes[e.from] &&
      nodes[e.to],
  );
  if (validEdges.length !== edges.length) {
    actions.push(`drop_dangling_edges:${edges.length - validEdges.length}`);
    repaired = true;
    risk = risk === "none" ? "low" : risk;
  }

  const nextStates: KnowledgeGraphDocument["states"] = { ...states };
  for (const nodeId of Object.keys(nodes)) {
    if (!nextStates[nodeId]) {
      nextStates[nodeId] = createDefaultLearningState();
      actions.push(`fill_missing_state:${nodeId}`);
      repaired = true;
      risk = risk === "none" ? "low" : risk;
    }
  }

  // Drop states for unknown nodes
  for (const stateId of Object.keys(nextStates)) {
    if (!nodes[stateId]) {
      delete nextStates[stateId];
      actions.push(`drop_orphan_state:${stateId}`);
      repaired = true;
      risk = risk === "none" ? "low" : risk;
    }
  }

  let doc: KnowledgeGraphDocument = {
    version: KNOWLEDGE_GRAPH_VERSION,
    childId: typeof obj.childId === "string" ? obj.childId : id,
    catalogVersion:
      typeof obj.catalogVersion === "number" ? obj.catalogVersion : 0,
    updatedAt:
      typeof obj.updatedAt === "string"
        ? obj.updatedAt
        : new Date().toISOString(),
    nodes,
    edges: validEdges,
    states: nextStates,
  };

  if (doc.childId !== id) {
    doc = { ...doc, childId: id };
    actions.push("fix_child_id");
    repaired = true;
    risk = "medium";
  }

  if (seedEntities.length) {
    doc = mergeSeedIntoDocument(doc, seedEntities);
    actions.push("merge_seed_catalog");
  }

  return {
    doc,
    repaired,
    actions: actions.length ? actions : ["noop"],
    dataLossRisk: risk,
    reason: repaired ? "Document sanitized" : "Document healthy",
  };
}
