import { beforeEach, describe, expect, it } from "vitest";
import {
  getKnowledgeGraph,
  getKnowledgeRecommendations,
  recordEntityLearning,
  resetKnowledgeGraphClient,
} from "./knowledge-graph-client";
import { resetLearningEventBusForTests } from "./learning-events-bridge";
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
});
