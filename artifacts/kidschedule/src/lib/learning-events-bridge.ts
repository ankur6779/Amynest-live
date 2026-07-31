/**
 * Host bridge for @workspace/learning-events.
 *
 * Producers publish domain events on the bus.
 * Sinks are one-way (no KG → bus → KG loops):
 *   learning.* / speech.*  → knowledge graph (registered sink)
 *   all events             → analytics-compatible client logs
 *   knowledge.updated      → fan-out only (busOrigin; ignored by KG mapper)
 */

import {
  attentionStateEvent,
  createLearningEventBus,
  createLocalStorageOfflineQueue,
  knowledgeUpdatedEvent,
  learningItemEvent,
  masteryDeltaToLearningInputs,
  setDefaultLearningEventBus,
  speechPracticeEvent,
  gameLearningEvent,
  readingLearningEvent,
  storyLearningEvent,
  toAnalyticsCompatible,
  toKnowledgeObservations,
  type GameLearningEventPhase,
  type LearningBusTelemetryEvent,
  type LearningEvent,
  type LearningEventBus,
  type LearningEventInput,
  type LearningModule,
  type LearningObservationLike,
  type ReadingLearningEventPhase,
  type StoryLearningEventPhase,
} from "@workspace/learning-events";
import type { ItemMasteryLike } from "@workspace/knowledge-graph";
import { observationsFromMasteryDelta } from "@workspace/knowledge-graph";
import { queueClientLog } from "@/lib/client-logs";

const OFFLINE_KEY = "amynest:learning-events:offline:v1";
const APPLIED_KEY = "amynest:learning-events:applied:v1";
const APPLIED_CAP = 3000;

let bus: LearningEventBus | null = null;
let installed = false;
const appliedIds = new Set<string>();

/** Mutable sink — telemetry host attaches without recreating the bus. */
let busTelemetrySink: ((event: LearningBusTelemetryEvent) => void) | null = null;

export function setLearningBusTelemetrySink(
  sink: ((event: LearningBusTelemetryEvent) => void) | null,
): void {
  busTelemetrySink = sink;
}

type KgWriter = (
  childId: string,
  observations: LearningObservationLike[],
) => void;

let kgWriter: KgWriter | null = null;

/** Register the knowledge-graph sink (call from knowledge-graph-client bootstrap). */
export function registerKnowledgeGraphEventSink(writer: KgWriter | null): void {
  kgWriter = writer;
}

function rememberApplied(id: string): boolean {
  if (appliedIds.has(id)) return false;
  appliedIds.add(id);
  if (appliedIds.size > APPLIED_CAP) {
    const first = appliedIds.values().next().value;
    if (first) appliedIds.delete(first);
  }
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        APPLIED_KEY,
        JSON.stringify([...appliedIds].slice(-APPLIED_CAP)),
      );
    }
  } catch {
    /* ignore */
  }
  return true;
}

function loadApplied(): void {
  try {
    if (typeof localStorage === "undefined") return;
    const raw = localStorage.getItem(APPLIED_KEY);
    if (!raw) return;
    const ids = JSON.parse(raw) as string[];
    if (!Array.isArray(ids)) return;
    for (const id of ids) appliedIds.add(id);
  } catch {
    /* ignore */
  }
}

function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

function kgSink(event: LearningEvent): void {
  if (!kgWriter) return;
  if (!rememberApplied(`kg:${event.id}`)) return;
  const obs = toKnowledgeObservations(event);
  if (!obs.length) return;
  const childId = event.payload.childId;
  try {
    kgWriter(childId, obs);
  } catch {
    /* never break bus */
  }

  // Fan-out for UI / analytics — busOrigin blocks KG re-entry.
  if (
    event.type.startsWith("learning.item_") ||
    event.type === "speech.practice_completed" ||
    event.type === "story.chapter_completed" ||
    event.type === "story.vocabulary_learned" ||
    event.type === "story.concept_discovered" ||
    event.type === "story.session_completed" ||
    event.type === "reading.word_completed" ||
    event.type === "reading.page_completed" ||
    event.type === "reading.phoneme_practiced" ||
    event.type === "reading.new_word" ||
    event.type === "reading.session_completed" ||
    event.type === "game.level_completed" ||
    event.type === "game.challenge_completed" ||
    event.type === "game.session_completed"
  ) {
    getLearningEventBus().publish(
      knowledgeUpdatedEvent({
        childId,
        conceptId: event.payload.conceptId ?? obs[0]?.nodeId,
        entityId: event.payload.entityId ?? undefined,
        confidence: event.payload.confidence ?? undefined,
        metadata: {
          fromEvent: event.type,
          fromEventId: event.id,
        },
      }),
    );
  }
}

function analyticsSink(event: LearningEvent): void {
  if (!rememberApplied(`an:${event.id}`)) return;
  try {
    const flat = toAnalyticsCompatible(event);
    queueClientLog({
      type: `learning_events_${flat.name.replace(/\./g, "_")}`,
      message: flat.name,
      meta: {
        ...flat.properties,
        childId: flat.childId,
        module: flat.module,
        entityId: flat.entityId,
        conceptId: flat.conceptId,
        confidence: flat.confidence,
        sessionId: flat.sessionId,
        timestamp: flat.timestamp,
      },
    });
  } catch {
    /* never break producers */
  }
}

/**
 * Install the process-wide learning event bus + sinks.
 * Idempotent — safe from GrowthBootstrap.
 */
export function installLearningEventBus(): LearningEventBus {
  if (bus && installed) return bus;

  loadApplied();
  bus = createLearningEventBus({
    offlineStorage: createLocalStorageOfflineQueue(OFFLINE_KEY),
    isOnline: isBrowserOnline,
    maxHistory: 400,
    maxOfflineQueue: 1000,
    onTelemetry: (event) => {
      try {
        busTelemetrySink?.(event);
      } catch {
        /* never break bus */
      }
    },
  });
  setDefaultLearningEventBus(bus);

  bus.subscribe(kgSink, {
    types: [
      "learning.item_seen",
      "learning.item_heard",
      "learning.item_recognized",
      "learning.item_spoken",
      "speech.practice_completed",
      "story.chapter_completed",
      "story.concept_discovered",
      "story.vocabulary_learned",
      "story.session_completed",
      "reading.word_completed",
      "reading.page_completed",
      "reading.phoneme_practiced",
      "reading.new_word",
      "reading.session_completed",
      "game.level_completed",
      "game.challenge_completed",
      "game.session_completed",
    ],
    priority: 9,
  });
  bus.subscribe(analyticsSink, { priority: 2 });

  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      bus?.setOnline(true);
    });
    window.addEventListener("offline", () => {
      bus?.setOnline(false);
    });
  }

  installed = true;
  return bus;
}

export function getLearningEventBus(): LearningEventBus {
  return bus ?? installLearningEventBus();
}

export function publishLearning(input: LearningEventInput): LearningEvent | null {
  try {
    return getLearningEventBus().publish(input);
  } catch {
    return null;
  }
}

export function publishLearningBatch(
  inputs: LearningEventInput[],
): LearningEvent[] {
  try {
    return getLearningEventBus().batch(inputs);
  } catch {
    return [];
  }
}

/** Discovery / Animal mastery deltas → learning events (KG via sink). */
export function publishMasteryDeltaEvents(args: {
  childId: number;
  module: Extract<LearningModule, "discovery_worlds" | "animal_world">;
  worldId: string;
  prevMap?: Record<string, ItemMasteryLike>;
  nextMap: Record<string, ItemMasteryLike>;
  sessionId?: string;
}): void {
  const inputs: LearningEventInput[] = [];
  for (const [entityId, next] of Object.entries(args.nextMap)) {
    const prev = args.prevMap?.[entityId];
    const deltaObs = observationsFromMasteryDelta(
      entityId,
      prev,
      next,
      "discovery_worlds",
    );
    if (!deltaObs.length) continue;

    let heardDelta = 0;
    let recognizedDelta = 0;
    let failedDelta = 0;
    for (const o of deltaObs) {
      if (o.modality === "heard") heardDelta += 1;
      else if (o.modality === "recognized") recognizedDelta += 1;
      else if (o.modality === "failed") failedDelta += 1;
    }

    inputs.push(
      ...masteryDeltaToLearningInputs({
        childId: args.childId,
        module: args.module,
        entityId,
        heardDelta,
        recognizedDelta,
        failedDelta,
        sessionId: args.sessionId,
        worldId: args.worldId,
      }),
    );
  }
  if (inputs.length) publishLearningBatch(inputs);
}

export function publishSpeechPracticeCompleted(args: {
  childId: number;
  promptText: string;
  score: number;
  sessionId?: string;
  soundHints?: string[];
}): void {
  publishLearning(
    speechPracticeEvent("completed", {
      childId: args.childId,
      confidence: args.score,
      sessionId: args.sessionId,
      entityId: args.promptText.trim().toLowerCase().split(/\s+/)[0],
      metadata: {
        promptText: args.promptText,
        soundHints: args.soundHints,
      },
    }),
  );
}

export function publishSpeechPracticeStarted(args: {
  childId: number;
  sessionId?: string;
  difficulty?: string;
}): void {
  publishLearning(
    speechPracticeEvent("started", {
      childId: args.childId,
      sessionId: args.sessionId,
      difficulty: args.difficulty,
    }),
  );
}

export function publishAttentionStateChanged(args: {
  childId: number;
  classification: string;
  score: number;
  rhythm?: string;
  worldId?: string;
  sessionId?: string;
}): void {
  publishLearning(attentionStateEvent(args));
}

export function publishStoryLearningEvent(
  phase: StoryLearningEventPhase,
  args: {
    childId: number;
    entityId?: string;
    conceptId?: string;
    confidence?: number;
    difficulty?: string | number;
    sessionId?: string;
    metadata?: Record<string, unknown>;
  },
): void {
  publishLearning(
    storyLearningEvent(phase, {
      childId: args.childId,
      entityId: args.entityId,
      conceptId: args.conceptId,
      confidence: args.confidence,
      difficulty: args.difficulty,
      sessionId: args.sessionId,
      metadata: args.metadata,
    }),
  );
}

/** @deprecated Prefer publishStoryLearningEvent("chapter_completed", …) */
export function publishStoryChapterCompleted(args: {
  childId: number;
  entityId: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}): void {
  publishStoryLearningEvent("chapter_completed", {
    childId: args.childId,
    entityId: args.entityId,
    conceptId: `story:${args.entityId}`,
    sessionId: args.sessionId,
    metadata: args.metadata,
  });
}

export function publishReadingLearningEvent(
  phase: ReadingLearningEventPhase,
  args: {
    childId: number;
    entityId?: string;
    conceptId?: string;
    confidence?: number;
    difficulty?: string | number;
    sessionId?: string;
    metadata?: Record<string, unknown>;
  },
): void {
  publishLearning(
    readingLearningEvent(phase, {
      childId: args.childId,
      entityId: args.entityId,
      conceptId: args.conceptId,
      confidence: args.confidence,
      difficulty: args.difficulty,
      sessionId: args.sessionId,
      metadata: args.metadata,
    }),
  );
}

export function publishGameLearningEvent(
  phase: GameLearningEventPhase,
  args: {
    childId: number;
    entityId?: string;
    conceptId?: string;
    confidence?: number;
    difficulty?: string | number;
    sessionId?: string;
    metadata?: Record<string, unknown>;
  },
): void {
  publishLearning(
    gameLearningEvent(phase, {
      childId: args.childId,
      entityId: args.entityId,
      conceptId: args.conceptId,
      confidence: args.confidence,
      difficulty: args.difficulty,
      sessionId: args.sessionId,
      metadata: args.metadata,
    }),
  );
}

/** @deprecated Prefer publishGameLearningEvent("level_completed", …) */
export function publishGameLevelCompleted(args: {
  childId: number;
  entityId: string;
  confidence?: number;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}): void {
  publishGameLearningEvent("level_completed", {
    childId: args.childId,
    entityId: args.entityId,
    conceptId: `game:${args.entityId}`,
    confidence: args.confidence,
    sessionId: args.sessionId,
    metadata: args.metadata,
  });
}

export function publishDailyMissionCompleted(args: {
  childId: number;
  entityId?: string;
  module?: LearningModule;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}): void {
  publishLearning({
    type: "daily_mission_completed",
    priority: 8,
    payload: {
      childId: String(args.childId),
      module: args.module ?? "system",
      entityId: args.entityId,
      sessionId: args.sessionId,
      metadata: args.metadata,
    },
  });
}

export function publishItemLearning(args: {
  childId: number;
  module: LearningModule;
  entityId: string;
  modality: "seen" | "heard" | "recognized" | "spoken" | "mastered" | "forgotten";
  confidence?: number;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}): void {
  const type = `learning.item_${args.modality}` as const;
  publishLearning(
    learningItemEvent(type, {
      childId: args.childId,
      module: args.module,
      entityId: args.entityId,
      conceptId: `entity:${args.entityId}`,
      confidence: args.confidence,
      sessionId: args.sessionId,
      metadata: args.metadata,
    }),
  );
}

/** Test helper — resets singleton wiring. */
export function resetLearningEventBusForTests(): void {
  bus?.clear();
  bus = null;
  installed = false;
  appliedIds.clear();
  kgWriter = null;
  setDefaultLearningEventBus(null);
}
