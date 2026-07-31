/**
 * Local-first child learning knowledge graph client.
 * Shared by Discovery Worlds (wired), Speech Coach / Stories / Reading / Games (API-ready).
 */

import { getAllAnimals } from "@workspace/animal-world";
import { getAllVehicles } from "@workspace/vehicle-world";
import { getAllNatureSounds } from "@workspace/nature-sounds-world";
import { getAllHomeSounds } from "@workspace/home-sounds-world";
import { getAllInstruments } from "@workspace/instrument-world";
import {
  animalToSeedEntity,
  createKnowledgeGraphApi,
  type ItemMasteryLike,
  type KnowledgeGraphApi,
  type KnowledgeGraphDocument,
  type KnowledgeGraphTelemetryEvent,
  type LearningObservation,
  type LearningSource,
  type SeedEntityInput,
  type StoryConceptSeedInput,
  type ReadingConceptSeedInput,
  type GameConceptSeedInput,
} from "@workspace/knowledge-graph";
import type { WorldManifestItem } from "@workspace/world-engine";
import {
  installLearningEventBus,
  publishItemLearning,
  publishMasteryDeltaEvents,
  publishSpeechPracticeCompleted,
  registerKnowledgeGraphEventSink,
} from "@/lib/learning-events-bridge";

const STORAGE_PREFIX = "amynest:knowledge-graph:v1:";

const apiCache = new Map<string, KnowledgeGraphApi>();
const lastMasterySnapshot = new Map<string, Record<string, ItemMasteryLike>>();
let bootstrapped = false;

/** Mutable sink — telemetry host attaches without clearing API cache. */
let kgTelemetrySink: ((event: KnowledgeGraphTelemetryEvent) => void) | null =
  null;

export function setKnowledgeGraphTelemetrySink(
  sink: ((event: KnowledgeGraphTelemetryEvent) => void) | null,
): void {
  kgTelemetrySink = sink;
}

function storageKey(childId: string): string {
  return `${STORAGE_PREFIX}${childId}`;
}

function localStoragePersistence(childId: string) {
  return {
    load(id: string): KnowledgeGraphDocument | null {
      if (typeof localStorage === "undefined") return null;
      try {
        const raw = localStorage.getItem(storageKey(id));
        if (!raw) return null;
        return JSON.parse(raw) as KnowledgeGraphDocument;
      } catch {
        return null;
      }
    },
    save(doc: KnowledgeGraphDocument): void {
      if (typeof localStorage === "undefined") return;
      try {
        localStorage.setItem(storageKey(doc.childId), JSON.stringify(doc));
      } catch {
        /* quota */
      }
    },
  };
}

function worldItemsToSeed(
  worldId: string,
  items: WorldManifestItem[],
): SeedEntityInput[] {
  return items.map((item) => ({
    id: item.id,
    label: item.name,
    worldId,
    category: item.category,
    soundLabel: item.quizPrompt,
    glyph: item.emoji,
  }));
}

function seedEntitiesFromCatalogs(): SeedEntityInput[] {
  return [
    ...getAllAnimals().map(animalToSeedEntity),
    ...worldItemsToSeed("vehicle_world", getAllVehicles()),
    ...worldItemsToSeed("nature_world", getAllNatureSounds()),
    ...worldItemsToSeed("home_sounds_world", getAllHomeSounds()),
    ...worldItemsToSeed("instrument_world", getAllInstruments()),
  ];
}

export function getKnowledgeGraph(childId: number | string): KnowledgeGraphApi {
  const id = String(childId);
  const cached = apiCache.get(id);
  if (cached) return cached;

  const api = createKnowledgeGraphApi({
    childId: id,
    persistence: localStoragePersistence(id),
    seedEntities: seedEntitiesFromCatalogs(),
    onTelemetry: (event) => {
      try {
        kgTelemetrySink?.(event);
      } catch {
        /* never break KG */
      }
    },
  });
  // Ensure any newly added catalog animals merge in.
  api.ensureSeeded(seedEntitiesFromCatalogs());
  apiCache.set(id, api);
  return api;
}

/** Drop cached API (tests / child switch). */
export function resetKnowledgeGraphClient(childId?: number | string): void {
  if (childId == null) {
    apiCache.clear();
    lastMasterySnapshot.clear();
    bootstrapped = false;
    return;
  }
  const id = String(childId);
  apiCache.delete(id);
  lastMasterySnapshot.delete(id);
}

export function recordLearningObservations(
  childId: number | string,
  observations: LearningObservation[],
): void {
  if (!observations.length) return;
  try {
    getKnowledgeGraph(childId).recordObservations(observations);
  } catch {
    /* never break gameplay */
  }
}

export function recordSpeechCoachLearning(
  childId: number | string,
  input: {
    promptText: string;
    score: number;
    soundHints?: string[];
    sessionId?: string;
  },
): void {
  ensureLearningEventIntegration();
  publishSpeechPracticeCompleted({
    childId: Number(childId),
    promptText: input.promptText,
    score: input.score,
    soundHints: input.soundHints,
    sessionId: input.sessionId,
  });
}

export function recordEntityLearning(
  childId: number | string,
  itemId: string,
  modality: LearningObservation["modality"],
  source: LearningSource = "discovery_worlds",
  score?: number,
): void {
  ensureLearningEventIntegration();
  const module =
    source === "speech_coach"
      ? "speech_coach"
      : source === "stories"
        ? "stories"
        : source === "reading"
          ? "reading"
          : source === "games"
            ? "games"
            : "discovery_worlds";
  if (
    modality === "seen" ||
    modality === "heard" ||
    modality === "recognized" ||
    modality === "spoken"
  ) {
    publishItemLearning({
      childId: Number(childId),
      module,
      entityId: itemId,
      modality,
      confidence: score,
    });
    return;
  }
  // failed → recognized with failed metadata via bus mapper path
  publishItemLearning({
    childId: Number(childId),
    module,
    entityId: itemId,
    modality: "recognized",
    confidence: score ?? 30,
    metadata: { failed: true },
  });
}

function masterySnapshotKey(worldId: string, childId: number): string {
  return `${worldId}:${childId}`;
}

/**
 * Ingest WorldProgress / Animal mastery maps incrementally.
 * Call after each progress save with the new mastery map.
 */
export function ingestWorldMasteryProgress(
  childId: number,
  worldId: string,
  mastery: Record<string, ItemMasteryLike>,
): void {
  try {
    ensureLearningEventIntegration();
    const key = masterySnapshotKey(worldId, childId);
    const prev = lastMasterySnapshot.get(key);
    lastMasterySnapshot.set(key, { ...mastery });
    // First snapshot after cold start: baseline only (no events).
    if (!prev) return;
    const module = worldId === "animal_world" ? "animal_world" : "discovery_worlds";
    publishMasteryDeltaEvents({
      childId,
      module,
      worldId,
      prevMap: prev,
      nextMap: mastery,
    });
  } catch {
    /* never break gameplay */
  }
}

/**
 * Prefer this on first engagement in a session so the first real delta emits.
 * Seeds the snapshot from current progress without recording history.
 */
export function baselineWorldMasterySnapshot(
  childId: number,
  worldId: string,
  mastery: Record<string, ItemMasteryLike>,
): void {
  lastMasterySnapshot.set(masterySnapshotKey(worldId, childId), { ...mastery });
}

function ensureLearningEventIntegration(): void {
  if (bootstrapped) return;
  installLearningEventBus();
  registerKnowledgeGraphEventSink((childId, observations) => {
    recordLearningObservations(
      childId,
      observations.map((o) => ({
        nodeId: o.nodeId,
        modality: o.modality,
        source: o.source,
        at: o.at,
        score: o.score,
      })),
    );
  });
  bootstrapped = true;
}

/**
 * Idempotent bootstrap — wires learning-events bus → KG sink.
 * Dual-write from save*Progress publishes events (not direct KG writes).
 */
export function installKnowledgeGraphDiscoveryBridge(): void {
  ensureLearningEventIntegration();
}

export function isKnowledgeGraphBootstrapped(): boolean {
  return bootstrapped;
}

export function getKnowledgeRecommendations(childId: number | string, limit = 8) {
  try {
    return getKnowledgeGraph(childId).recommend({ limit });
  } catch {
    return [];
  }
}

export function getKnowledgeSummary(childId: number | string) {
  try {
    return getKnowledgeGraph(childId).summarize();
  } catch {
    return null;
  }
}

export function getKnowledgeWeakPhonemes(childId: number | string, limit = 5) {
  try {
    return getKnowledgeGraph(childId).weakPhonemes(limit);
  } catch {
    return [];
  }
}

/** Ensure story/word/category nodes exist before observations land. */
export function ensureStoryLearningNodes(
  childId: number | string,
  input: StoryConceptSeedInput,
): void {
  try {
    getKnowledgeGraph(childId).ensureStoryConcepts(input);
  } catch {
    /* never break storytelling */
  }
}

/** Ensure reading letter/word/phoneme nodes exist before observations land. */
export function ensureReadingLearningNodes(
  childId: number | string,
  input: ReadingConceptSeedInput,
): void {
  try {
    getKnowledgeGraph(childId).ensureReadingConcepts(input);
  } catch {
    /* never break reading UI */
  }
}

/** Ensure game/skill/category nodes exist before observations land. */
export function ensureGameLearningNodes(
  childId: number | string,
  input: GameConceptSeedInput,
): void {
  try {
    getKnowledgeGraph(childId).ensureGameConcepts(input);
  } catch {
    /* never break gameplay */
  }
}
