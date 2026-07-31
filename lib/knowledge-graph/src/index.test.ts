import assert from "node:assert/strict";
import { test } from "node:test";
import {
  animalToSeedEntity,
  buildSeedDocument,
  createKnowledgeGraphApi,
  createMemoryPersistence,
  entityId,
  habitatId,
  observationsFromMasteryDelta,
  observationsFromSpeechAttempt,
  phonemeId,
  recommendConcepts,
  wordId,
} from "./index.js";

const ANIMALS = [
  { id: "lion", name: "Lion", category: "jungle", emoji: "🦁", quizPrompt: "Roar" },
  { id: "tiger", name: "Tiger", category: "jungle", emoji: "🐯", quizPrompt: "Roar" },
  { id: "leopard", name: "Leopard", category: "jungle", emoji: "🐆", quizPrompt: "Growl" },
  { id: "leaf", name: "Leaf", category: "nature", emoji: "🍃", quizPrompt: "Rustle" },
  { id: "cow", name: "Cow", category: "farm", emoji: "🐮", quizPrompt: "Moo" },
];

test("seed builds lion → animal → wild → L → roar → jungle links", () => {
  const doc = buildSeedDocument(
    "1",
    ANIMALS.filter((a) => a.id !== "leaf").map(animalToSeedEntity),
  );

  assert.ok(doc.nodes[entityId("lion")]);
  assert.ok(doc.nodes["category:animal"]);
  assert.ok(doc.nodes["category:wild-animal"]);
  assert.ok(doc.nodes[phonemeId("l")]);
  assert.ok(doc.nodes["sound:roar"]);
  assert.ok(doc.nodes[habitatId("jungle")]);
  assert.ok(doc.nodes["speech:coach"]);
  assert.ok(doc.nodes["story:animal-tales"]);
  assert.ok(doc.nodes["reading:phonics"]);

  const edgeKinds = new Set(
    doc.edges
      .filter((e) => e.from === entityId("lion") || e.to === entityId("lion"))
      .map((e) => e.kind),
  );
  assert.ok(edgeKinds.has("is_a"));
  assert.ok(edgeKinds.has("lives_in"));
  assert.ok(edgeKinds.has("makes_sound"));
  assert.ok(edgeKinds.has("starts_with"));
  assert.ok(edgeKinds.has("links_to"));
});

test("knowing lion recommends tiger / leopard / jungle / roar", () => {
  const persistence = createMemoryPersistence();
  const api = createKnowledgeGraphApi({
    childId: "42",
    persistence,
    seedEntities: ANIMALS.filter((a) => a.id !== "leaf").map(animalToSeedEntity),
  });

  // Simulate mastery of lion
  for (let i = 0; i < 4; i++) {
    api.recordObservations([
      {
        nodeId: entityId("lion"),
        modality: "recognized",
        source: "discovery_worlds",
        score: 95,
      },
    ]);
  }

  const recs = api.recommend({ limit: 12 });
  const ids = new Set(recs.map((r) => r.nodeId));
  assert.ok(ids.has(entityId("tiger")) || ids.has(entityId("leopard")));
  assert.ok(
    ids.has(habitatId("jungle")) ||
      ids.has("sound:roar") ||
      ids.has(entityId("tiger")),
  );
});

test("struggling with L recommends lion / leaf / lamp / speech coach", () => {
  const doc = buildSeedDocument(
    "7",
    [
      ...ANIMALS.map(animalToSeedEntity),
      // leaf as nature entity still gets L phoneme
    ],
  );

  // Force L struggle
  const persistence = createMemoryPersistence();
  persistence.save(doc);
  const api = createKnowledgeGraphApi({
    childId: "7",
    persistence,
  });

  api.recordObservations([
    { nodeId: phonemeId("l"), modality: "failed", source: "speech_coach", score: 20 },
    { nodeId: phonemeId("l"), modality: "failed", source: "speech_coach", score: 25 },
    { nodeId: phonemeId("l"), modality: "spoken", source: "speech_coach", score: 40 },
  ]);

  const recs = recommendConcepts(api.getDocument(), { limit: 16 });
  const ids = new Set(recs.map((r) => r.nodeId));
  assert.ok(ids.has(entityId("lion")) || ids.has(wordId("lion")));
  assert.ok(ids.has(wordId("leaf")) || ids.has(wordId("lamp")));
  assert.ok(ids.has("speech:coach"));
});

test("mastery delta adapter emits incremental observations only", () => {
  const obs = observationsFromMasteryDelta(
    "lion",
    { soundsPlayed: 1, quizzesCorrect: 0, hearFindCorrect: 0, hearFindAttempts: 0 },
    { soundsPlayed: 2, quizzesCorrect: 1, hearFindCorrect: 0, hearFindAttempts: 1 },
  );
  assert.equal(obs.filter((o) => o.modality === "heard").length, 1);
  assert.equal(obs.filter((o) => o.modality === "recognized").length, 1);
  assert.equal(obs.filter((o) => o.modality === "failed").length, 1);
});

test("speech attempt maps to word + phoneme nodes", () => {
  const obs = observationsFromSpeechAttempt({
    promptText: "Lion",
    score: 88,
    soundHints: ["l"],
  });
  assert.ok(obs.some((o) => o.nodeId === wordId("lion") && o.modality === "spoken"));
  assert.ok(obs.some((o) => o.nodeId === phonemeId("l")));
});

test("incremental updates persist confidence without rewriting catalog", () => {
  const persistence = createMemoryPersistence();
  const api = createKnowledgeGraphApi({
    childId: "9",
    persistence,
    seedEntities: ANIMALS.map(animalToSeedEntity),
  });
  const beforeNodes = Object.keys(api.getDocument().nodes).length;
  api.recordObservations([
    { nodeId: entityId("cow"), modality: "heard", source: "discovery_worlds" },
  ]);
  const after = api.getDocument();
  assert.equal(Object.keys(after.nodes).length, beforeNodes);
  assert.ok(after.states[entityId("cow")]?.heard);
  assert.ok((after.states[entityId("cow")]?.confidence ?? 0) > 0);
});

test("ensureStoryConcepts seeds story/word/category links without mastery", () => {
  const api = createKnowledgeGraphApi({
    childId: "story-child",
    persistence: createMemoryPersistence(),
    seedEntities: [],
  });
  api.ensureStoryConcepts({
    storyId: "t01",
    title: "The Slow Turtle Wins",
    category: "moral",
    vocabulary: ["turtle", "race"],
    concepts: ["perseverance"],
  });
  const doc = api.getDocument();
  assert.ok(doc.nodes["story:t01"]);
  assert.ok(doc.nodes[wordId("turtle")]);
  assert.ok(doc.nodes["category:moral"]);
  assert.ok(doc.nodes[entityId("perseverance")]);
  assert.ok(
    doc.edges.some(
      (e) => e.from === "story:t01" && e.to === wordId("turtle") && e.kind === "related",
    ),
  );
});

test("ensureReadingConcepts seeds letter/word/phoneme links without mastery", () => {
  const api = createKnowledgeGraphApi({
    childId: "reading-child",
    persistence: createMemoryPersistence(),
    seedEntities: [],
  });
  api.ensureReadingConcepts({
    grapheme: "s",
    focusWord: "sat",
    words: ["sat", "sip"],
    phonemes: ["s"],
    syllables: ["sat"],
    blends: ["st"],
    sentences: ["Sam sat."],
    sentencePatterns: ["cvc"],
  });
  const doc = api.getDocument();
  assert.ok(doc.nodes["reading:s"]);
  assert.ok(doc.nodes["reading:phonics"]);
  assert.ok(doc.nodes[wordId("sat")]);
  assert.ok(doc.nodes[phonemeId("s")]);
  assert.ok(doc.nodes[entityId("syllable-sat")]);
  assert.ok(doc.nodes[entityId("blend-st")]);
  assert.ok(doc.nodes[entityId("sentence-sam-sat")]);
  assert.ok(doc.nodes[entityId("pattern-cvc")]);
  assert.ok(
    doc.edges.some(
      (e) => e.from === "reading:s" && e.to === phonemeId("s") && e.kind === "practices",
    ),
  );
});

test("ensureGameConcepts seeds game/skill/category links without mastery", () => {
  const api = createKnowledgeGraphApi({
    childId: "games-child",
    persistence: createMemoryPersistence(),
    seedEntities: [],
  });
  api.ensureGameConcepts({
    gameId: "pattern-match",
    title: "Pattern Match",
    category: "brain",
    skills: ["logic", "pattern-recognition"],
    concepts: ["patterns"],
  });
  const doc = api.getDocument();
  assert.ok(doc.nodes["game:pattern-match"]);
  assert.ok(doc.nodes["game:hub"]);
  assert.ok(doc.nodes["category:brain"]);
  assert.ok(doc.nodes[entityId("skill-logic")]);
  assert.ok(doc.nodes[entityId("patterns")]);
  assert.ok(
    doc.edges.some(
      (e) =>
        e.from === "game:pattern-match" &&
        e.to === entityId("skill-logic") &&
        e.kind === "practices",
    ),
  );
});
