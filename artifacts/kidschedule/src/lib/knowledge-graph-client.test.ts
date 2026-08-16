import { beforeEach, describe, expect, it } from "vitest";
import {
  getKnowledgeGraph,
  getKnowledgeRecommendations,
  recordEntityLearning,
  recordSpeechCoachLearning,
  resetKnowledgeGraphClient,
} from "./knowledge-graph-client";
import { resetLearningEventBusForTests } from "./learning-events-bridge";
import { entityId, phonemeId, wordId } from "@workspace/knowledge-graph";

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

  it("speech practice lands on word/phoneme nodes without corrupting animal entities", () => {
    const api = getKnowledgeGraph(303);
    const animalBefore = api.getNodeState(entityId("cat"));
    expect(api.getDocument().nodes[entityId("cat")]).toBeTruthy();
    expect(animalBefore.spoken).toBe(false);

    recordSpeechCoachLearning(303, {
      promptText: "cat",
      score: 92,
      soundHints: ["k"],
    });

    const doc = getKnowledgeGraph(303).getDocument();
    expect(doc.nodes[wordId("cat")]).toBeTruthy();
    expect(doc.nodes[phonemeId("c")]).toBeTruthy();

    const wordState = getKnowledgeGraph(303).getNodeState(wordId("cat"));
    expect(wordState.spoken).toBe(true);

    const animalAfter = getKnowledgeGraph(303).getNodeState(entityId("cat"));
    expect(animalAfter.spoken).toBe(false);
    expect(animalAfter.confidence).toBe(animalBefore.confidence);
  });
});
