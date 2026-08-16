import assert from "node:assert/strict";
import { test } from "node:test";
import {
  attentionStateEvent,
  createLearningEventBus,
  createMemoryOfflineQueue,
  knowledgeUpdatedEvent,
  learningItemEvent,
  masteryDeltaToLearningInputs,
  speechPracticeEvent,
  gameLearningEvent,
  readingLearningEvent,
  storyLearningEvent,
  toAnalyticsCompatible,
  toKnowledgeObservations,
  LEARNING_EVENT_SCHEMA_VERSION,
} from "./index.js";

test("publish delivers ordered events with schema version", () => {
  const bus = createLearningEventBus();
  const seen: number[] = [];
  bus.subscribe((e) => seen.push(e.seq));

  bus.publish(
    learningItemEvent("learning.item_heard", {
      childId: 1,
      module: "discovery_worlds",
      entityId: "lion",
    }),
  );
  bus.publish(
    learningItemEvent("learning.item_recognized", {
      childId: 1,
      module: "discovery_worlds",
      entityId: "lion",
      confidence: 90,
    }),
  );

  assert.deepEqual(seen, [1, 2]);
  const hist = bus.getHistory();
  assert.equal(hist[0]?.schemaVersion, LEARNING_EVENT_SCHEMA_VERSION);
  assert.equal(hist[0]?.payload.conceptId, "entity:lion");
});

test("subscribe filter + unsubscribe by id", () => {
  const bus = createLearningEventBus();
  const speech: string[] = [];
  const all: string[] = [];

  const unsubSpeech = bus.subscribe((e) => speech.push(e.type), {
    types: ["speech.practice_completed"],
    priority: 8,
  });
  bus.subscribe((e) => all.push(e.type));

  bus.publish(
    speechPracticeEvent("completed", {
      childId: 2,
      confidence: 88,
      metadata: { promptText: "Lion" },
    }),
  );
  bus.publish(
    learningItemEvent("learning.item_seen", {
      childId: 2,
      module: "stories",
      entityId: "lion",
    }),
  );

  assert.deepEqual(speech, ["speech.practice_completed"]);
  assert.equal(all.length, 2);

  assert.equal(bus.unsubscribe(unsubSpeech.id), true);
  bus.publish(
    speechPracticeEvent("completed", {
      childId: 2,
      confidence: 70,
      metadata: { promptText: "Tiger" },
    }),
  );
  assert.equal(speech.length, 1);
  assert.equal(all.length, 3);
});

test("subscriber priority — higher runs first", () => {
  const bus = createLearningEventBus();
  const order: string[] = [];
  bus.subscribe(() => order.push("low"), { priority: 1 });
  bus.subscribe(() => order.push("high"), { priority: 9 });
  bus.subscribe(() => order.push("mid"), { priority: 5 });

  bus.publish(
    learningItemEvent("learning.item_seen", {
      childId: 3,
      module: "games",
      entityId: "x",
    }),
  );
  assert.deepEqual(order, ["high", "mid", "low"]);
});

test("deduplication by event id", () => {
  const bus = createLearningEventBus();
  let count = 0;
  bus.subscribe(() => {
    count += 1;
  });

  const input = learningItemEvent("learning.item_heard", {
    childId: 4,
    module: "animal_world",
    entityId: "cow",
  });
  input.id = "fixed-id-1";

  assert.ok(bus.publish(input));
  assert.equal(bus.publish({ ...input, id: "fixed-id-1" }), null);
  assert.equal(count, 1);
});

test("offline queue + flush on reconnect preserves order", () => {
  const storage = createMemoryOfflineQueue();
  let online = false;
  const bus = createLearningEventBus({
    offlineStorage: storage,
    isOnline: () => online,
  });
  const types: string[] = [];
  bus.subscribe((e) => types.push(e.type));

  bus.publish(
    learningItemEvent("learning.item_seen", {
      childId: 5,
      module: "discovery_worlds",
      entityId: "lion",
    }),
  );
  bus.publish(
    learningItemEvent("learning.item_heard", {
      childId: 5,
      module: "discovery_worlds",
      entityId: "lion",
    }),
  );

  assert.equal(types.length, 0);
  assert.equal(bus.getOfflineQueue().length, 2);

  online = true;
  const flushed = bus.flushOffline();
  assert.equal(flushed, 2);
  assert.deepEqual(types, ["learning.item_seen", "learning.item_heard"]);
  assert.equal(bus.getOfflineQueue().length, 0);
});

test("setOnline(true) auto-flushes offline queue", () => {
  const bus = createLearningEventBus({ isOnline: () => false });
  const seen: string[] = [];
  bus.subscribe((e) => seen.push(e.type));
  bus.publish(
    learningItemEvent("learning.item_mastered", {
      childId: 6,
      module: "reading",
      entityId: "cat",
    }),
  );
  assert.equal(seen.length, 0);
  bus.setOnline(true);
  assert.deepEqual(seen, ["learning.item_mastered"]);
});

test("flushOffline defers nested publishes so history seq stays monotonic", () => {
  let online = false;
  const bus = createLearningEventBus({ isOnline: () => online });
  bus.subscribe((e) => {
    if (e.type === "learning.item_heard") {
      bus.publish(
        learningItemEvent("learning.item_recognized", {
          childId: 61,
          module: "discovery_worlds",
          entityId: "lion",
        }),
      );
    }
  });

  bus.publish(
    learningItemEvent("learning.item_heard", {
      childId: 61,
      module: "discovery_worlds",
      entityId: "lion",
    }),
  );
  bus.publish(
    learningItemEvent("learning.item_heard", {
      childId: 61,
      module: "discovery_worlds",
      entityId: "tiger",
    }),
  );

  online = true;
  bus.flushOffline();

  const history = bus.getHistory();
  let last = -1;
  for (const e of history) {
    assert.ok(e.seq >= last, `seq regression ${e.seq} after ${last}`);
    last = e.seq;
  }
  assert.equal(history.length, 4);
});

test("replay re-dispatches history without duplicating history", () => {
  const bus = createLearningEventBus();
  bus.publish(
    learningItemEvent("learning.item_heard", {
      childId: 7,
      module: "discovery_worlds",
      entityId: "tiger",
    }),
  );
  const replayed: string[] = [];
  bus.subscribe((e) => {
    if (e.payload.metadata?.replayed) replayed.push(e.type);
  });
  const n = bus.replay({ markReplay: true, childId: "7" });
  assert.equal(n, 1);
  assert.deepEqual(replayed, ["learning.item_heard"]);
  assert.equal(bus.getHistory().length, 1);
});

test("batch publishes priority-ordered within batch", () => {
  const bus = createLearningEventBus();
  const types: string[] = [];
  bus.subscribe((e) => types.push(e.type));

  bus.batch([
    learningItemEvent("learning.item_seen", {
      childId: 8,
      module: "games",
      entityId: "a",
      priority: 2,
    }),
    learningItemEvent("learning.item_recognized", {
      childId: 8,
      module: "games",
      entityId: "a",
      priority: 9,
    }),
  ]);

  assert.deepEqual(types, [
    "learning.item_recognized",
    "learning.item_seen",
  ]);
});

test("knowledge.updated does not map to KG observations (no circular writes)", () => {
  const event = createLearningEventBus().publish(
    knowledgeUpdatedEvent({
      childId: 9,
      conceptId: "entity:lion",
      confidence: 90,
    }),
  );
  assert.ok(event);
  assert.deepEqual(toKnowledgeObservations(event!), []);
});

test("speech.practice_completed maps to word/phoneme observations", () => {
  const event = createLearningEventBus().publish(
    speechPracticeEvent("completed", {
      childId: 10,
      confidence: 88,
      metadata: { promptText: "Lion" },
    }),
  );
  const obs = toKnowledgeObservations(event!);
  assert.ok(obs.some((o) => o.nodeId === "word:lion" && o.modality === "spoken"));
  assert.ok(obs.some((o) => o.nodeId === "phoneme:l"));
  // Must not target discovery/animal entity nodes (entity:lion would corrupt Animal World).
  assert.equal(
    obs.some((o) => o.nodeId === "entity:lion"),
    false,
  );
});

test("speech.practice_completed with animal word does not emit entity observations", () => {
  const event = createLearningEventBus().publish(
    speechPracticeEvent("completed", {
      childId: 11,
      confidence: 40,
      metadata: { promptText: "cat", soundHints: ["k", "ae", "t"] },
    }),
  );
  const obs = toKnowledgeObservations(event!);
  assert.ok(obs.some((o) => o.nodeId === "word:cat" && o.modality === "failed"));
  assert.ok(obs.some((o) => o.nodeId === "phoneme:c"));
  assert.ok(obs.some((o) => o.nodeId === "phoneme:k"));
  assert.ok(obs.some((o) => o.nodeId === "phoneme:t"));
  assert.equal(
    obs.some((o) => o.nodeId.startsWith("entity:")),
    false,
  );
});

test("story.chapter_completed maps to story/word/category observations", () => {
  const event = createLearningEventBus().publish(
    storyLearningEvent("chapter_completed", {
      childId: 20,
      entityId: "t01",
      conceptId: "story:t01",
      confidence: 85,
      metadata: {
        category: "moral",
        vocabulary: ["turtle", "race"],
        concepts: ["perseverance"],
      },
    }),
  );
  assert.equal(event?.type, "story.chapter_completed");
  assert.equal(event?.payload.module, "stories");
  const obs = toKnowledgeObservations(event!);
  assert.ok(obs.some((o) => o.nodeId === "story:t01"));
  assert.ok(obs.some((o) => o.nodeId === "word:turtle"));
  assert.ok(obs.some((o) => o.nodeId === "category:moral"));
  assert.ok(obs.some((o) => o.nodeId === "entity:perseverance"));
});

test("story.session_started does not write KG observations", () => {
  const event = createLearningEventBus().publish(
    storyLearningEvent("session_started", {
      childId: 21,
      sessionId: "s1",
    }),
  );
  assert.equal(event?.type, "story.session_started");
  assert.deepEqual(toKnowledgeObservations(event!), []);
});

test("reading.word_completed maps to word/phoneme/reading observations", () => {
  const event = createLearningEventBus().publish(
    readingLearningEvent("word_completed", {
      childId: 30,
      entityId: "sat",
      conceptId: "word:sat",
      confidence: 88,
      metadata: { word: "sat", grapheme: "s" },
    }),
  );
  assert.equal(event?.type, "reading.word_completed");
  assert.equal(event?.payload.module, "reading");
  const obs = toKnowledgeObservations(event!);
  assert.ok(obs.some((o) => o.nodeId === "word:sat"));
  assert.ok(obs.some((o) => o.nodeId === "phoneme:s"));
  assert.ok(obs.some((o) => o.nodeId === "reading:s"));
});

test("reading.session_started does not write KG observations", () => {
  const event = createLearningEventBus().publish(
    readingLearningEvent("session_started", {
      childId: 31,
      sessionId: "r1",
    }),
  );
  assert.equal(event?.type, "reading.session_started");
  assert.deepEqual(toKnowledgeObservations(event!), []);
});

test("game.level_completed maps to game/skill/category observations", () => {
  const event = createLearningEventBus().publish(
    gameLearningEvent("level_completed", {
      childId: 40,
      entityId: "pattern-match",
      conceptId: "game:pattern-match",
      confidence: 90,
      metadata: {
        category: "brain",
        skills: ["logic"],
        concepts: ["patterns"],
      },
    }),
  );
  assert.equal(event?.type, "game.level_completed");
  assert.equal(event?.payload.module, "games");
  const obs = toKnowledgeObservations(event!);
  assert.ok(obs.some((o) => o.nodeId === "game:pattern-match"));
  assert.ok(obs.some((o) => o.nodeId === "entity:skill-logic"));
  assert.ok(obs.some((o) => o.nodeId === "category:brain"));
});

test("game.session_started does not write KG observations", () => {
  const event = createLearningEventBus().publish(
    gameLearningEvent("session_started", {
      childId: 41,
      sessionId: "g1",
      entityId: "card-flip",
    }),
  );
  assert.equal(event?.type, "game.session_started");
  assert.deepEqual(toKnowledgeObservations(event!), []);
});

test("mastery delta helper + analytics projection", () => {
  const inputs = masteryDeltaToLearningInputs({
    childId: 11,
    module: "discovery_worlds",
    entityId: "lion",
    heardDelta: 1,
    recognizedDelta: 1,
    failedDelta: 1,
    worldId: "animal_world",
  });
  assert.ok(inputs.some((i) => i.type === "learning.item_seen"));
  assert.ok(inputs.some((i) => i.type === "learning.item_heard"));
  assert.equal(
    inputs.filter((i) => i.type === "learning.item_recognized").length,
    2,
  );

  const bus = createLearningEventBus();
  const event = bus.publish(inputs[0]!);
  const analytics = toAnalyticsCompatible(event!);
  assert.equal(analytics.name, "learning.item_seen");
  assert.equal(analytics.childId, "11");
  assert.equal(analytics.properties.schemaVersion, LEARNING_EVENT_SCHEMA_VERSION);
});

test("attention.state_changed builder", () => {
  const bus = createLearningEventBus();
  const event = bus.publish(
    attentionStateEvent({
      childId: 12,
      classification: "focused",
      score: 72,
      worldId: "nature_world",
    }),
  );
  assert.equal(event?.type, "attention.state_changed");
  assert.equal(event?.payload.metadata?.classification, "focused");
});

test("handler errors do not break the bus", () => {
  const bus = createLearningEventBus();
  let ok = false;
  bus.subscribe(() => {
    throw new Error("boom");
  });
  bus.subscribe(() => {
    ok = true;
  });
  bus.publish(
    learningItemEvent("learning.item_seen", {
      childId: 13,
      module: "parent_hub",
      entityId: "x",
    }),
  );
  assert.equal(ok, true);
});
