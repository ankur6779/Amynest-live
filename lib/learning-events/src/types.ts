/**
 * Unified learning event bus — domain signals shared across AmyNest modules.
 * Pure types only. No React, fetch, or storage.
 */

/** Schema version for the envelope. Bump on breaking payload changes. */
export const LEARNING_EVENT_SCHEMA_VERSION = 1 as const;

export const LEARNING_EVENT_TYPES = [
  "learning.item_seen",
  "learning.item_heard",
  "learning.item_recognized",
  "learning.item_spoken",
  "learning.item_mastered",
  "learning.item_forgotten",
  "speech.practice_started",
  "speech.practice_completed",
  "story.session_started",
  "story.chapter_started",
  "story.chapter_completed",
  "story.concept_discovered",
  "story.vocabulary_learned",
  "story.session_completed",
  "reading.session_started",
  "reading.page_started",
  "reading.word_completed",
  "reading.page_completed",
  "reading.session_completed",
  "reading.phoneme_practiced",
  "reading.new_word",
  "game.session_started",
  "game.level_started",
  "game.level_completed",
  "game.challenge_completed",
  "game.session_completed",
  "daily_mission_completed",
  "attention.state_changed",
  "knowledge.updated",
  "learning.decision",
] as const;

export type LearningEventType = (typeof LEARNING_EVENT_TYPES)[number];

export const LEARNING_MODULES = [
  "discovery_worlds",
  "animal_world",
  "speech_coach",
  "stories",
  "reading",
  "games",
  "health_lab",
  "parent_hub",
  "knowledge_graph",
  "attention",
  "learning_runtime",
  "system",
] as const;

export type LearningModule = (typeof LEARNING_MODULES)[number];

/** Higher number = deliver / drain sooner. */
export type EventPriority = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const DEFAULT_EVENT_PRIORITY: EventPriority = 5;

export type LearningEventPayload = {
  childId: string;
  timestamp: string;
  module: LearningModule;
  /** World / catalog item id when applicable (lion, car…). */
  entityId?: string | null;
  /** Knowledge-graph concept node id when known (entity:lion). */
  conceptId?: string | null;
  confidence?: number | null;
  difficulty?: number | string | null;
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Versioned learning event envelope.
 * `schemaVersion` is always present for forward-compatible consumers.
 */
export type LearningEvent = {
  schemaVersion: typeof LEARNING_EVENT_SCHEMA_VERSION;
  /** Stable client id for deduplication. */
  id: string;
  type: LearningEventType;
  /** Monotonic per-bus sequence for ordered delivery. */
  seq: number;
  priority: EventPriority;
  payload: LearningEventPayload;
  /**
   * When true, sinks that would re-emit into the bus must no-op.
   * Used to break knowledge.updated ↔ KG cycles.
   */
  busOrigin?: boolean;
};

export type LearningEventInput = {
  type: LearningEventType;
  payload: Omit<LearningEventPayload, "timestamp"> & {
    timestamp?: string;
  };
  priority?: EventPriority;
  id?: string;
  busOrigin?: boolean;
};

export type SubscribeFilter = {
  types?: LearningEventType[];
  modules?: LearningModule[];
  childId?: string;
  /** Higher runs first on each publish. Default 5. */
  priority?: EventPriority;
};

export type LearningEventHandler = (event: LearningEvent) => void;

export type Subscription = {
  id: string;
  handler: LearningEventHandler;
  filter: SubscribeFilter;
  priority: EventPriority;
};

export type ReplayOptions = {
  childId?: string;
  types?: LearningEventType[];
  /** Inclusive lower bound ISO timestamp. */
  since?: string;
  /** Max events to re-dispatch (newest-last order preserved). */
  limit?: number;
  /** When true, mark replayed events so sinks can detect replay. */
  markReplay?: boolean;
};

export type OfflineQueueStorage = {
  load(): LearningEvent[];
  save(events: LearningEvent[]): void;
};

/** Optional bus telemetry — null/absent = zero overhead. */
export type LearningBusTelemetryEvent =
  | {
      kind: "publish";
      latencyMs: number;
      queued: boolean;
      queueDepth: number;
      eventType: string;
    }
  | { kind: "duplicate"; eventType?: string }
  | { kind: "replay"; count: number }
  | {
      kind: "flush";
      durationMs: number;
      delivered: number;
      queueDepth: number;
    }
  | { kind: "online"; online: boolean; queueDepth: number };

export type LearningEventBusOptions = {
  /** Durable offline buffer. When set + offline, publish queues instead of dropping. */
  offlineStorage?: OfflineQueueStorage;
  isOnline?: () => boolean;
  /** In-memory ordered history for replay(). */
  maxHistory?: number;
  /** Max offline queue length (drop lowest priority first when exceeded). */
  maxOfflineQueue?: number;
  /** Dedupe window size (recent ids). */
  dedupeCapacity?: number;
  now?: () => Date;
  /** Inject ids in tests. */
  createId?: () => string;
  /**
   * Observability sink. Invoked only when set — production collectors attach here.
   * Must never throw (bus swallows errors).
   */
  onTelemetry?: (event: LearningBusTelemetryEvent) => void;
};

export type AnalyticsCompatibleEvent = {
  name: string;
  childId: string;
  timestamp: string;
  module: LearningModule;
  entityId?: string | null;
  conceptId?: string | null;
  confidence?: number | null;
  sessionId?: string | null;
  properties: Record<string, unknown>;
};
