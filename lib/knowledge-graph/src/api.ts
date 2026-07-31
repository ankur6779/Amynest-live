import { cloneDocument, createEmptyDocument, getState } from "./graph.js";
import {
  animalToSeedEntity,
  buildSeedDocument,
  ensureGameLearningStructure,
  ensureReadingLearningStructure,
  ensureStoryLearningStructure,
  mergeSeedIntoDocument,
  SEED_CATALOG_VERSION,
  type GameConceptSeedInput,
  type ReadingConceptSeedInput,
  type SeedEntityInput,
  type StoryConceptSeedInput,
} from "./seed-catalog.js";
import { recommendConcepts, type RecommendOptions } from "./recommendations.js";
import { applyObservationToState, refreshForgottenFlag } from "./state.js";
import { getWeakPhonemes, summarizeKnowledgeGraph } from "./summary.js";
import { repairKnowledgeGraphDocument } from "./repair.js";
import type {
  ConceptRecommendation,
  KnowledgeGraphDocument,
  KnowledgeGraphPersistence,
  KnowledgeGraphSummary,
  LearningObservation,
  NodeLearningState,
} from "./types.js";

export type KnowledgeGraphApi = {
  getDocument(): KnowledgeGraphDocument;
  ensureSeeded(entities: SeedEntityInput[]): KnowledgeGraphDocument;
  /** Upsert story/word/category nodes so observations can land. */
  ensureStoryConcepts(input: StoryConceptSeedInput): KnowledgeGraphDocument;
  /** Upsert reading letter/word/phoneme nodes so observations can land. */
  ensureReadingConcepts(input: ReadingConceptSeedInput): KnowledgeGraphDocument;
  /** Upsert game/skill/category nodes so observations can land. */
  ensureGameConcepts(input: GameConceptSeedInput): KnowledgeGraphDocument;
  recordObservations(observations: LearningObservation[]): KnowledgeGraphDocument;
  getNodeState(nodeId: string): NodeLearningState;
  recommend(opts?: RecommendOptions): ConceptRecommendation[];
  summarize(): KnowledgeGraphSummary;
  weakPhonemes(limit?: number): ReturnType<typeof getWeakPhonemes>;
};

/** Optional KG telemetry — null/absent = zero overhead. */
export type KnowledgeGraphTelemetryEvent =
  | {
      kind: "snapshot";
      nodeCount: number;
      edgeCount: number;
      bytes: number;
      childId: string;
    }
  | {
      kind: "repair";
      reason: string;
      durationMs: number;
      dataLossRisk: string;
      childId: string;
      actions: string[];
    }
  | { kind: "migration"; durationMs: number; childId: string };

export type CreateKnowledgeGraphApiOptions = {
  childId: string;
  persistence: KnowledgeGraphPersistence;
  /** Optional seed entities applied on first load / catalog bump. */
  seedEntities?: SeedEntityInput[];
  /** Observability sink — never throws into callers. */
  onTelemetry?: (event: KnowledgeGraphTelemetryEvent) => void;
};

/**
 * Local-first knowledge graph API.
 * Persistence is injectable (localStorage, memory, IndexedDB…).
 */
export function createKnowledgeGraphApi(
  options: CreateKnowledgeGraphApiOptions,
): KnowledgeGraphApi {
  const { childId, persistence } = options;
  const seedEntities = options.seedEntities ?? [];
  const onTelemetry = options.onTelemetry;
  let lastSnapshotEmitMs = 0;

  const emitTelemetry = (event: KnowledgeGraphTelemetryEvent): void => {
    if (!onTelemetry) return;
    try {
      onTelemetry(event);
    } catch {
      /* never break KG */
    }
  };

  const emitSnapshot = (
    d: KnowledgeGraphDocument,
    opts?: { force?: boolean },
  ): void => {
    if (!onTelemetry) return;
    const now =
      typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();
    // Throttle hot-path persists — force on load/repair/migration.
    if (!opts?.force && now - lastSnapshotEmitMs < 2000) return;
    lastSnapshotEmitMs = now;
    let bytes = 0;
    try {
      bytes = JSON.stringify(d).length;
    } catch {
      bytes = 0;
    }
    emitTelemetry({
      kind: "snapshot",
      nodeCount: Object.keys(d.nodes).length,
      edgeCount: d.edges.length,
      bytes,
      childId: d.childId,
    });
  };

  let doc = persistence.load(childId);
  if (!doc || doc.childId !== childId) {
    doc = seedEntities.length
      ? buildSeedDocument(childId, seedEntities)
      : createEmptyDocument(childId);
    persistence.save(doc);
    emitSnapshot(doc, { force: true });
  } else {
    const t0 =
      typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();
    const repaired = repairKnowledgeGraphDocument(doc, childId, seedEntities);
    doc = repaired.doc;
    const t1 =
      typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();
    if (repaired.repaired) {
      emitTelemetry({
        kind: "repair",
        reason: repaired.reason,
        durationMs: Math.max(0, t1 - t0),
        dataLossRisk: repaired.dataLossRisk,
        childId,
        actions: repaired.actions,
      });
      persistence.save(doc);
      emitSnapshot(doc, { force: true });
    } else if (seedEntities.length && doc.catalogVersion < SEED_CATALOG_VERSION) {
      const m0 =
        typeof performance !== "undefined" && performance.now
          ? performance.now()
          : Date.now();
      doc = mergeSeedIntoDocument(doc, seedEntities);
      const m1 =
        typeof performance !== "undefined" && performance.now
          ? performance.now()
          : Date.now();
      emitTelemetry({
        kind: "migration",
        durationMs: Math.max(0, m1 - m0),
        childId,
      });
      persistence.save(doc);
      emitSnapshot(doc, { force: true });
    } else {
      emitSnapshot(doc, { force: true });
    }
  }

  const persist = (next: KnowledgeGraphDocument): KnowledgeGraphDocument => {
    next.updatedAt = new Date().toISOString();
    persistence.save(next);
    doc = next;
    emitSnapshot(next);
    return next;
  };

  return {
    getDocument() {
      return doc!;
    },

    ensureSeeded(entities: SeedEntityInput[]) {
      if (!entities.length) return doc!;
      if (doc!.catalogVersion >= SEED_CATALOG_VERSION && Object.keys(doc!.nodes).length > 0) {
        // Still merge new entities that may have been added to catalogs.
        const before = Object.keys(doc!.nodes).length;
        const merged = mergeSeedIntoDocument(doc!, entities);
        if (Object.keys(merged.nodes).length !== before) {
          return persist(merged);
        }
        return doc!;
      }
      return persist(mergeSeedIntoDocument(doc!, entities));
    },

    ensureStoryConcepts(input) {
      return persist(ensureStoryLearningStructure(doc!, input));
    },

    ensureReadingConcepts(input) {
      return persist(ensureReadingLearningStructure(doc!, input));
    },

    ensureGameConcepts(input) {
      return persist(ensureGameLearningStructure(doc!, input));
    },

    recordObservations(observations: LearningObservation[]) {
      if (!observations.length) return doc!;
      const next = cloneDocument(doc!);
      const now = new Date().toISOString();
      for (const obs of observations) {
        if (!obs.nodeId) continue;
        // Skip unknown nodes quietly — producers may emit ahead of seed.
        if (!next.nodes[obs.nodeId]) continue;
        const at = obs.at ?? now;
        next.states[obs.nodeId] = applyObservationToState(
          next.states[obs.nodeId],
          { ...obs, at },
          at,
        );
      }
      return persist(next);
    },

    getNodeState(nodeId: string) {
      return refreshForgottenFlag(getState(doc!, nodeId));
    },

    recommend(opts) {
      return recommendConcepts(doc!, opts);
    },

    summarize() {
      return summarizeKnowledgeGraph(doc!);
    },

    weakPhonemes(limit) {
      return getWeakPhonemes(doc!, limit);
    },
  };
}

export function createMemoryPersistence(): KnowledgeGraphPersistence {
  const map = new Map<string, KnowledgeGraphDocument>();
  return {
    load(id) {
      const doc = map.get(id);
      return doc ? cloneDocument(doc) : null;
    },
    save(doc) {
      map.set(doc.childId, cloneDocument(doc));
    },
  };
}

export { animalToSeedEntity, SEED_CATALOG_VERSION };
