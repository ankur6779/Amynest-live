import { beforeEach, describe, expect, it } from "vitest";
import {
  getLearningEventBus,
  installLearningEventBus,
  publishItemLearning,
  publishLearning,
  publishMasteryDeltaEvents,
  registerKnowledgeGraphEventSink,
  resetLearningEventBusForTests,
} from "./learning-events-bridge";
import { knowledgeUpdatedEvent } from "@workspace/learning-events";

describe("learning-events-bridge", () => {
  beforeEach(() => {
    localStorage.clear();
    resetLearningEventBusForTests();
  });

  it("delivers item events to the registered KG sink once", () => {
    installLearningEventBus();
    const seen: Array<{ childId: string; nodeId: string }> = [];
    registerKnowledgeGraphEventSink((childId, observations) => {
      for (const o of observations) {
        seen.push({ childId, nodeId: o.nodeId });
      }
    });

    publishItemLearning({
      childId: 55,
      module: "discovery_worlds",
      entityId: "lion",
      modality: "heard",
    });

    expect(seen.some((s) => s.nodeId === "entity:lion")).toBe(true);

    // knowledge.updated must not write to KG
    const before = seen.length;
    publishLearning(
      knowledgeUpdatedEvent({
        childId: 55,
        conceptId: "entity:lion",
        confidence: 99,
      }),
    );
    expect(seen.length).toBe(before);
  });

  it("publishes mastery deltas as ordered learning events", () => {
    installLearningEventBus();
    const types: string[] = [];
    getLearningEventBus().subscribe((e) => types.push(e.type));

    publishMasteryDeltaEvents({
      childId: 66,
      module: "animal_world",
      worldId: "animal_world",
      prevMap: {
        lion: {
          soundsPlayed: 0,
          quizzesCorrect: 0,
          hearFindCorrect: 0,
          hearFindAttempts: 0,
        },
      },
      nextMap: {
        lion: {
          soundsPlayed: 1,
          quizzesCorrect: 1,
          hearFindCorrect: 0,
          hearFindAttempts: 0,
        },
      },
    });

    expect(types).toContain("learning.item_heard");
    expect(types).toContain("learning.item_recognized");
  });

  it("dedupes sink application across replay", () => {
    installLearningEventBus();
    let writes = 0;
    registerKnowledgeGraphEventSink(() => {
      writes += 1;
    });

    publishItemLearning({
      childId: 77,
      module: "reading",
      entityId: "cat",
      modality: "seen",
    });
    const n = getLearningEventBus().replay({ childId: "77", markReplay: true });
    expect(n).toBeGreaterThan(0);
    // applied-id guard prevents double KG write on replay
    expect(writes).toBe(1);
  });

  it("does not permanently drop KG writes when the sink throws", () => {
    installLearningEventBus();
    let writes = 0;
    let shouldThrow = true;
    registerKnowledgeGraphEventSink(() => {
      writes += 1;
      if (shouldThrow) throw new Error("transient kg failure");
    });

    publishItemLearning({
      childId: 88,
      module: "reading",
      entityId: "dog",
      modality: "spoken",
    });
    expect(writes).toBe(1);

    shouldThrow = false;
    const n = getLearningEventBus().replay({ childId: "88", markReplay: true });
    expect(n).toBeGreaterThan(0);
    expect(writes).toBe(2);
  });
});
