import {
  animalToSeedEntity,
  createKnowledgeGraphApi,
  repairKnowledgeGraphDocument,
  type KnowledgeGraphApi,
  type KnowledgeGraphDocument,
  type SeedEntityInput,
} from "@workspace/knowledge-graph";
import {
  createLearningEventBus,
  createMemoryOfflineQueue,
  learningItemEvent,
  speechPracticeEvent,
  type LearningEvent,
  type LearningEventBus,
  type LearningEventInput,
} from "@workspace/learning-events";
import {
  createLearningRuntime,
  toLearningDecisionEvent,
  type LearningDecision,
  type LearningRuntime,
  type RuntimeInputSnapshots,
  type RuntimeSkillEntry,
} from "@workspace/learning-runtime";

export type PlatformHarness = {
  childId: string;
  bus: LearningEventBus;
  getRuntime(): LearningRuntime;
  getKg(): KnowledgeGraphApi;
  persistence: {
    load(childId: string): KnowledgeGraphDocument | null;
    save(doc: KnowledgeGraphDocument): void;
    corrupt(raw: string): void;
    readRaw(): string | null;
  };
  skills: RuntimeSkillEntry[];
  decisions: LearningDecision[];
  seedEntities: SeedEntityInput[];
  publish(input: LearningEventInput): void;
  killAndReload(): void;
  setOnline(online: boolean): void;
};

const DEFAULT_SEED: SeedEntityInput[] = [
  animalToSeedEntity({
    id: "lion",
    name: "Lion",
    category: "jungle",
    emoji: "🦁",
    quizPrompt: "Roar",
  }),
  animalToSeedEntity({
    id: "tiger",
    name: "Tiger",
    category: "jungle",
    emoji: "🐯",
    quizPrompt: "Roar",
  }),
  animalToSeedEntity({
    id: "cow",
    name: "Cow",
    category: "farm",
    emoji: "🐮",
    quizPrompt: "Moo",
  }),
];

const DEFAULT_SKILLS: RuntimeSkillEntry[] = [
  { skillId: "speech_clear_sounds", mastery: 40, confidence: 45 },
  { skillId: "phonics_letter_sounds", mastery: 55, confidence: 50 },
  { skillId: "creativity_animals", mastery: 70, confidence: 65 },
];

/**
 * In-memory Amy Learning Platform harness for chaos / verification.
 * No DOM, no network — production-safe for Node tests.
 */
export function createPlatformHarness(opts?: {
  childId?: string;
  seedEntities?: SeedEntityInput[];
}): PlatformHarness {
  const childId = opts?.childId ?? "chaos-child-1";
  const seedEntities = opts?.seedEntities ?? DEFAULT_SEED;
  let rawStore: string | null = null;

  const persistence = {
    load(id: string): KnowledgeGraphDocument | null {
      if (!rawStore) return null;
      try {
        const parsed = JSON.parse(rawStore) as unknown;
        return repairKnowledgeGraphDocument(parsed, id, seedEntities).doc;
      } catch {
        return repairKnowledgeGraphDocument(null, id, seedEntities).doc;
      }
    },
    save(doc: KnowledgeGraphDocument): void {
      rawStore = JSON.stringify(doc);
    },
    corrupt(raw: string): void {
      rawStore = raw;
    },
    readRaw(): string | null {
      return rawStore;
    },
  };

  let kg = createKnowledgeGraphApi({
    childId,
    persistence,
    seedEntities,
  });

  const offlineStorage = createMemoryOfflineQueue();
  let online = true;
  const bus = createLearningEventBus({
    offlineStorage,
    isOnline: () => online,
    maxHistory: 200,
    maxOfflineQueue: 80,
    dedupeCapacity: 500,
  });

  let runtime = createLearningRuntime();
  const decisions: LearningDecision[] = [];
  const skills = [...DEFAULT_SKILLS];

  bus.subscribe((event: LearningEvent) => {
    if (event.type === "learning.decision") return;
    const snapshots: RuntimeInputSnapshots = {
      skills,
      knowledge: {
        forgottenNodeIds: [],
        strugglingNodeIds: [],
        topRecommendations: kg.recommend({ limit: 3 }).map((r) => ({
          nodeId: r.nodeId,
          label: r.label,
          reason: r.reason,
          score: r.score,
          links: r.links,
        })),
      },
      attention: {
        score: 70,
        classification: "focused",
      },
    };
    const { decision } = runtime.processEvent(event, snapshots);
    if (decision.ruleId === "runtime.ignore_echo") return;
    decisions.push(decision);
    // Apply KG observation for heard/recognized signals (simplified dual-write)
    if (
      event.type === "learning.item_heard" ||
      event.type === "learning.item_recognized" ||
      event.type === "learning.item_spoken"
    ) {
      const nodeId =
        event.payload.conceptId ??
        (event.payload.entityId ? `entity:${event.payload.entityId}` : null);
      if (nodeId) {
        const modality =
          event.type === "learning.item_heard"
            ? "heard"
            : event.type === "learning.item_spoken"
              ? "spoken"
              : "recognized";
        kg.recordObservations([
          {
            nodeId,
            modality,
            source: "discovery_worlds",
            score:
              typeof event.payload.confidence === "number"
                ? event.payload.confidence
                : undefined,
          },
        ]);
      }
    }
    bus.publish(toLearningDecisionEvent(decision));
  });

  return {
    childId,
    bus,
    getRuntime: () => runtime,
    getKg: () => kg,
    persistence,
    skills,
    decisions,
    seedEntities,
    publish(input) {
      bus.publish(input);
    },
    killAndReload() {
      runtime = createLearningRuntime();
      kg = createKnowledgeGraphApi({
        childId,
        persistence,
        seedEntities,
      });
      decisions.length = 0;
    },
    setOnline(next) {
      online = next;
      bus.setOnline(next);
    },
  };
}

export function baselinePlay(harness: PlatformHarness): void {
  harness.publish(
    learningItemEvent("learning.item_heard", {
      childId: harness.childId,
      module: "animal_world",
      entityId: "lion",
    }),
  );
  harness.publish(
    learningItemEvent("learning.item_recognized", {
      childId: harness.childId,
      module: "animal_world",
      entityId: "lion",
      confidence: 90,
    }),
  );
  harness.publish(
    speechPracticeEvent("completed", {
      childId: harness.childId,
      confidence: 85,
      metadata: { promptText: "Lion" },
    }),
  );
}
