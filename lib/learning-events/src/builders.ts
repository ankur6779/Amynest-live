import { createLearningEventId } from "./id.js";
import {
  DEFAULT_EVENT_PRIORITY,
  LEARNING_EVENT_SCHEMA_VERSION,
  type LearningEvent,
  type LearningEventInput,
  type LearningEventType,
  type LearningModule,
} from "./types.js";

export type BuildEventOptions = {
  seq: number;
  now?: () => Date;
  createId?: () => string;
};

/** Normalize and version an input into a full LearningEvent. */
export function buildLearningEvent(
  input: LearningEventInput,
  opts: BuildEventOptions,
): LearningEvent {
  const now = opts.now ?? (() => new Date());
  const createId = opts.createId ?? createLearningEventId;
  const timestamp = input.payload.timestamp ?? now().toISOString();

  return {
    schemaVersion: LEARNING_EVENT_SCHEMA_VERSION,
    id: input.id ?? createId(),
    type: input.type,
    seq: opts.seq,
    priority: input.priority ?? DEFAULT_EVENT_PRIORITY,
    busOrigin: input.busOrigin,
    payload: {
      childId: String(input.payload.childId),
      timestamp,
      module: input.payload.module,
      entityId: input.payload.entityId ?? null,
      conceptId: input.payload.conceptId ?? null,
      confidence:
        typeof input.payload.confidence === "number"
          ? clamp(input.payload.confidence, 0, 100)
          : (input.payload.confidence ?? null),
      difficulty: input.payload.difficulty ?? null,
      sessionId: input.payload.sessionId ?? null,
      metadata: input.payload.metadata ?? {},
    },
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Convenience builders for standard learning item modalities. */
export function learningItemEvent(
  type: Extract<
    LearningEventType,
    | "learning.item_seen"
    | "learning.item_heard"
    | "learning.item_recognized"
    | "learning.item_spoken"
    | "learning.item_mastered"
    | "learning.item_forgotten"
  >,
  args: {
    childId: string | number;
    module: LearningModule;
    entityId?: string;
    conceptId?: string;
    confidence?: number;
    difficulty?: number | string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
    priority?: LearningEventInput["priority"];
  },
): LearningEventInput {
  return {
    type,
    priority: args.priority,
    payload: {
      childId: String(args.childId),
      module: args.module,
      entityId: args.entityId,
      conceptId: args.conceptId ?? (args.entityId ? `entity:${args.entityId}` : undefined),
      confidence: args.confidence,
      difficulty: args.difficulty,
      sessionId: args.sessionId,
      metadata: args.metadata,
    },
  };
}

export function speechPracticeEvent(
  phase: "started" | "completed",
  args: {
    childId: string | number;
    entityId?: string;
    conceptId?: string;
    confidence?: number;
    difficulty?: number | string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
  },
): LearningEventInput {
  return {
    type:
      phase === "started"
        ? "speech.practice_started"
        : "speech.practice_completed",
    priority: phase === "completed" ? 7 : 5,
    payload: {
      childId: String(args.childId),
      module: "speech_coach",
      entityId: args.entityId,
      conceptId: args.conceptId,
      confidence: args.confidence,
      difficulty: args.difficulty,
      sessionId: args.sessionId,
      metadata: args.metadata,
    },
  };
}

export type StoryLearningEventPhase =
  | "session_started"
  | "chapter_started"
  | "chapter_completed"
  | "concept_discovered"
  | "vocabulary_learned"
  | "session_completed";

/** Story World learning events — narrative UI publishes; Runtime/KG consume. */
export function storyLearningEvent(
  phase: StoryLearningEventPhase,
  args: {
    childId: string | number;
    entityId?: string;
    conceptId?: string;
    confidence?: number;
    difficulty?: number | string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
  },
): LearningEventInput {
  const typeMap: Record<StoryLearningEventPhase, LearningEventInput["type"]> = {
    session_started: "story.session_started",
    chapter_started: "story.chapter_started",
    chapter_completed: "story.chapter_completed",
    concept_discovered: "story.concept_discovered",
    vocabulary_learned: "story.vocabulary_learned",
    session_completed: "story.session_completed",
  };
  const completed =
    phase === "chapter_completed" ||
    phase === "session_completed" ||
    phase === "vocabulary_learned" ||
    phase === "concept_discovered";
  return {
    type: typeMap[phase],
    priority: completed ? 7 : 5,
    payload: {
      childId: String(args.childId),
      module: "stories",
      entityId: args.entityId,
      conceptId: args.conceptId,
      confidence: args.confidence,
      difficulty: args.difficulty,
      sessionId: args.sessionId,
      metadata: args.metadata,
    },
  };
}

export type ReadingLearningEventPhase =
  | "session_started"
  | "page_started"
  | "word_completed"
  | "page_completed"
  | "session_completed"
  | "phoneme_practiced"
  | "new_word";

/** Reading World learning events — presentation UI publishes; Runtime/KG consume. */
export function readingLearningEvent(
  phase: ReadingLearningEventPhase,
  args: {
    childId: string | number;
    entityId?: string;
    conceptId?: string;
    confidence?: number;
    difficulty?: number | string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
  },
): LearningEventInput {
  const typeMap: Record<ReadingLearningEventPhase, LearningEventInput["type"]> = {
    session_started: "reading.session_started",
    page_started: "reading.page_started",
    word_completed: "reading.word_completed",
    page_completed: "reading.page_completed",
    session_completed: "reading.session_completed",
    phoneme_practiced: "reading.phoneme_practiced",
    new_word: "reading.new_word",
  };
  const completed =
    phase === "word_completed" ||
    phase === "page_completed" ||
    phase === "session_completed" ||
    phase === "phoneme_practiced" ||
    phase === "new_word";
  return {
    type: typeMap[phase],
    priority: completed ? 7 : 5,
    payload: {
      childId: String(args.childId),
      module: "reading",
      entityId: args.entityId,
      conceptId: args.conceptId,
      confidence: args.confidence,
      difficulty: args.difficulty,
      sessionId: args.sessionId,
      metadata: args.metadata,
    },
  };
}

export type GameLearningEventPhase =
  | "session_started"
  | "level_started"
  | "level_completed"
  | "challenge_completed"
  | "session_completed";

/** Educational games — gameplay UI publishes; Runtime/KG consume. */
export function gameLearningEvent(
  phase: GameLearningEventPhase,
  args: {
    childId: string | number;
    entityId?: string;
    conceptId?: string;
    confidence?: number;
    difficulty?: number | string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
  },
): LearningEventInput {
  const typeMap: Record<GameLearningEventPhase, LearningEventInput["type"]> = {
    session_started: "game.session_started",
    level_started: "game.level_started",
    level_completed: "game.level_completed",
    challenge_completed: "game.challenge_completed",
    session_completed: "game.session_completed",
  };
  const completed =
    phase === "level_completed" ||
    phase === "challenge_completed" ||
    phase === "session_completed";
  return {
    type: typeMap[phase],
    priority: completed ? 7 : 5,
    payload: {
      childId: String(args.childId),
      module: "games",
      entityId: args.entityId,
      conceptId: args.conceptId,
      confidence: args.confidence,
      difficulty: args.difficulty,
      sessionId: args.sessionId,
      metadata: args.metadata,
    },
  };
}

export function attentionStateEvent(args: {
  childId: string | number;
  sessionId?: string;
  classification: string;
  score: number;
  rhythm?: string;
  worldId?: string;
  metadata?: Record<string, unknown>;
}): LearningEventInput {
  return {
    type: "attention.state_changed",
    priority: 4,
    payload: {
      childId: String(args.childId),
      module: "attention",
      confidence: args.score,
      sessionId: args.sessionId,
      metadata: {
        classification: args.classification,
        rhythm: args.rhythm,
        worldId: args.worldId,
        ...args.metadata,
      },
    },
  };
}

export function knowledgeUpdatedEvent(args: {
  childId: string | number;
  conceptId?: string;
  entityId?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}): LearningEventInput {
  return {
    type: "knowledge.updated",
    priority: 3,
    busOrigin: true,
    payload: {
      childId: String(args.childId),
      module: "knowledge_graph",
      conceptId: args.conceptId,
      entityId: args.entityId,
      confidence: args.confidence,
      metadata: args.metadata,
    },
  };
}

export function isLearningEventType(value: string): value is LearningEventType {
  return (
    value.startsWith("learning.") ||
    value.startsWith("speech.") ||
    value.startsWith("story.") ||
    value.startsWith("game.") ||
    value === "daily_mission_completed" ||
    value === "attention.state_changed" ||
    value === "knowledge.updated"
  );
}
