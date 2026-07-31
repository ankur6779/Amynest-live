/**
 * Child learning knowledge graph — concept nodes + per-child learning state.
 * Distinct from Amy Operating's family knowledge graph (goals/habits).
 */

export const KNOWLEDGE_GRAPH_VERSION = 1 as const;

export type ConceptNodeKind =
  | "entity"
  | "category"
  | "habitat"
  | "attribute"
  | "sound"
  | "phoneme"
  | "word"
  | "story"
  | "speech"
  | "reading"
  | "game"
  | "skill";

export type ConceptEdgeKind =
  | "is_a"
  | "lives_in"
  | "has_attribute"
  | "makes_sound"
  | "starts_with"
  | "related"
  | "practices"
  | "links_to"
  | "part_of";

/** Product surfaces that emit or consume graph observations. */
export type LearningSource =
  | "discovery_worlds"
  | "speech_coach"
  | "stories"
  | "reading"
  | "games"
  | "analytics"
  | "system";

export type LearningModality =
  | "seen"
  | "heard"
  | "recognized"
  | "spoken"
  | "failed";

export type ReviewOutcome = "success" | "partial" | "fail";

export type ReviewEvent = {
  at: string;
  modality: LearningModality;
  source: LearningSource;
  outcome: ReviewOutcome;
  /** Optional 0–100 score from the producer (speech, quiz, etc.). */
  score?: number;
};

export type NodeLearningState = {
  seen: boolean;
  heard: boolean;
  recognized: boolean;
  spoken: boolean;
  mastered: boolean;
  forgotten: boolean;
  /** 0–100 rolling confidence. */
  confidence: number;
  lastReviewAt: string | null;
  /** Newest-first, capped. */
  reviewHistory: ReviewEvent[];
  counts: {
    seen: number;
    heard: number;
    recognized: number;
    spoken: number;
    failed: number;
  };
};

export type ConceptNode = {
  id: string;
  kind: ConceptNodeKind;
  label: string;
  /** Optional emoji / glyph for UI. */
  glyph?: string;
  /** Stable tags for filtering (world, category, locale…). */
  tags?: string[];
  /** Deep-link hints for product surfaces. */
  links?: {
    discoveryWorldId?: string;
    discoveryItemId?: string;
    speechRoute?: string;
    storyId?: string;
    readingId?: string;
    gameId?: string;
  };
};

export type ConceptEdge = {
  id: string;
  from: string;
  to: string;
  kind: ConceptEdgeKind;
  /** 0–1 association strength; default 1. */
  weight?: number;
};

export type KnowledgeGraphDocument = {
  version: typeof KNOWLEDGE_GRAPH_VERSION;
  childId: string;
  catalogVersion: number;
  updatedAt: string;
  nodes: Record<string, ConceptNode>;
  edges: ConceptEdge[];
  states: Record<string, NodeLearningState>;
};

export type LearningObservation = {
  nodeId: string;
  modality: LearningModality;
  source: LearningSource;
  /** ISO timestamp; defaults to now. */
  at?: string;
  score?: number;
  meta?: Record<string, unknown>;
};

export type RecommendationReason =
  | "related_to_known"
  | "same_habitat"
  | "same_sound"
  | "phoneme_practice"
  | "speech_coach"
  | "story_link"
  | "reading_link"
  | "due_review"
  | "forgotten"
  | "explore_new";

export type ConceptRecommendation = {
  nodeId: string;
  label: string;
  kind: ConceptNodeKind;
  reason: RecommendationReason;
  score: number;
  relatedTo?: string;
  links?: ConceptNode["links"];
};

export type KnowledgeGraphPersistence = {
  load(childId: string): KnowledgeGraphDocument | null;
  save(doc: KnowledgeGraphDocument): void;
};

/** Compact mastery snapshot for analytics / parent insights. */
export type KnowledgeGraphSummary = {
  childId: string;
  totalNodes: number;
  touchedNodes: number;
  masteredNodes: number;
  strugglingNodes: number;
  forgottenNodes: number;
  avgConfidence: number;
  topMastered: Array<{ nodeId: string; label: string; confidence: number }>;
  topStruggling: Array<{ nodeId: string; label: string; confidence: number }>;
};
