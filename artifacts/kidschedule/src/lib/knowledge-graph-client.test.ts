import { beforeEach, describe, expect, it } from "vitest";
import {
  getKnowledgeGraph,
  getKnowledgeRecommendations,
  installKnowledgeGraphDiscoveryBridge,
  recordEntityLearning,
  resetKnowledgeGraphClient,
} from "./knowledge-graph-client";
import { resetLearningEventBusForTests } from "./learning-events-bridge";
import {
  LEARNING_EVENT_SCHEMA_VERSION,
  type LearningEvent,
} from "@workspace/learning-events";
import { entityId, phonemeId } from "@workspace/knowledge-graph";

describe("knowledge-graph-client", () => {
  beforeEach(() => {
    localStorage.clear();
    resetLearningEventBusForTests();
    resetKnowledgeGraphClient();
  });

  it("seeds animals and records entity learning locally", () => {
    const api = getKnowledgeGraph(101);
    expect(api.getDocument().nodes[entityId("lion")]).toBeTruthy();

    recordEntityLearning(101, "lion", "heard", "discovery_worlds");
    recordEntityLearning(101, "lion", "recognized", "discovery_worlds", 92);
    recordEntityLearning(101, "lion", "recognized", "discovery_worlds", 95);
    recordEntityLearning(101, "lion", "recognized", "discovery_worlds", 97);

    const state = getKnowledgeGraph(101).getNodeState(entityId("lion"));
    expect(state.heard).toBe(true);
    expect(state.recognized).toBe(true);
    expect(state.confidence).toBeGreaterThan(40);

    const recs = getKnowledgeRecommendations(101, 12);
    expect(recs.length).toBeGreaterThan(0);
  });

  it("recommends practice when phoneme struggles", () => {
    const api = getKnowledgeGraph(202);
    api.recordObservations([
      { nodeId: phonemeId("l"), modality: "failed", source: "speech_coach", score: 20 },
      { nodeId: phonemeId("l"), modality: "failed", source: "speech_coach", score: 22 },
    ]);
    const recs = api.recommend({ limit: 12 });
    const ids = new Set(recs.map((r) => r.nodeId));
    expect(
      ids.has(entityId("lion")) ||
        ids.has("word:lion") ||
        ids.has("word:leaf") ||
        ids.has("speech:coach"),
    ).toBe(true);
  });

  it("flushes persisted offline events into KG when bootstrapping online", () => {
    const stuck: LearningEvent = {
      schemaVersion: LEARNING_EVENT_SCHEMA_VERSION,
      id: "offline-evt-lion-heard",
      type: "learning.item_heard",
      seq: 1,
      priority: 5,
      payload: {
        childId: "303",
        timestamp: new Date().toISOString(),
        module: "discovery_worlds",
        entityId: "lion",
        conceptId: "entity:lion",
        confidence: null,
        difficulty: null,
        sessionId: null,
        metadata: {},
      },
    };
    localStorage.setItem(
      "amynest:learning-events:offline:v1",
      JSON.stringify([stuck]),
    );
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });

    installKnowledgeGraphDiscoveryBridge();

    const state = getKnowledgeGraph(303).getNodeState(entityId("lion"));
    expect(state.heard).toBe(true);
    expect(localStorage.getItem("amynest:learning-events:offline:v1")).toBe(
      JSON.stringify([]),
    );
  });
});
