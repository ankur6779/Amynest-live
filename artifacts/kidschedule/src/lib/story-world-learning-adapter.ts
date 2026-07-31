/**
 * Story World ↔ Learning Platform adapter.
 *
 * Story World does NOT compute difficulty / recommendations / mastery / review /
 * attention adaptation. Narrative engine only tells stories; this adapter
 * publishes learning events and applies Runtime guidance to queue order.
 */

import type {
  CelebrationLevel,
  DifficultyDecision,
  HintsDecision,
  LearningDecision,
  NarrationLength,
  NextActivity,
  RecommendationDecision,
  ReviewQueueItem,
} from "@workspace/learning-runtime";
import {
  publishAttentionStateChanged,
  publishStoryLearningEvent,
} from "@/lib/learning-events-bridge";
import {
  ensureStoryLearningNodes,
  getKnowledgeRecommendations,
  getKnowledgeSummary,
} from "@/lib/knowledge-graph-client";
import { subscribeLearningDecision } from "@/lib/learning-decision-bus";
import {
  getAttentionSnapshot,
  recordAttentionEvent,
} from "@/lib/sound-world-attention-store";
import { installLearningRuntimeBridge } from "@/lib/learning-runtime-bridge";

export type StoryRuntimeGuidance = {
  childId: string;
  difficulty: DifficultyDecision;
  hints: HintsDecision;
  narrationLength: NarrationLength;
  celebrationLevel: CelebrationLevel;
  reviewQueue: ReviewQueueItem[];
  recommendation: RecommendationDecision | null;
  breakSuggestion: boolean;
  nextActivity: NextActivity | null;
  /** Prefer these story entity ids next (from Runtime/KG). */
  preferredStoryIds: string[];
  /** Optional speech practice opportunity from Runtime/KG. */
  speechOpportunityHref: string | null;
  reason: string;
  ruleId: string;
  decisionId: string | null;
};

export type StoryChapterInput = {
  storyId: string;
  title: string;
  category?: string;
  /** Optional chapter index within a multi-part story (defaults to 0). */
  chapterIndex?: number;
  vocabulary?: string[];
  concepts?: string[];
};

const lastDecisionByChild = new Map<string, LearningDecision>();
let decisionSubInstalled = false;

function ensureDecisionCache(): void {
  if (decisionSubInstalled) return;
  decisionSubInstalled = true;
  installLearningRuntimeBridge();
  subscribeLearningDecision((decision) => {
    lastDecisionByChild.set(String(decision.childId), decision);
  });
}

export function getLastStoryRuntimeDecision(
  childId: number | string,
): LearningDecision | null {
  ensureDecisionCache();
  return lastDecisionByChild.get(String(childId)) ?? null;
}

/** Extract simple vocabulary tokens from a title (structure only — not mastery). */
export function extractStoryVocabulary(title: string, limit = 4): string[] {
  const stop = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "of",
    "to",
    "in",
    "on",
    "for",
    "with",
    "my",
    "your",
    "is",
    "are",
    "at",
  ]);
  const words = title
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stop.has(w));
  return [...new Set(words)].slice(0, limit);
}

function preferredIdsFromDecision(
  decision: LearningDecision | null,
  childId: string,
): string[] {
  const ids: string[] = [];
  const push = (raw: string | null | undefined) => {
    if (!raw) return;
    const id = raw.startsWith("story:") ? raw.slice("story:".length) : raw;
    if (id && !ids.includes(id)) ids.push(id);
  };
  push(decision?.nextActivity?.entityId ?? undefined);
  push(decision?.recommendation?.conceptId ?? undefined);
  for (const item of decision?.reviewQueue ?? []) {
    push(item.entityId);
    push(item.conceptId);
  }
  try {
    for (const r of getKnowledgeRecommendations(childId, 5)) {
      if (r.links?.storyId) push(String(r.links.storyId));
      if (r.nodeId.startsWith("story:")) push(r.nodeId);
    }
  } catch {
    /* optional */
  }
  return ids;
}

export function guidanceFromStoryDecision(
  childId: number | string,
  decision: LearningDecision | null,
): StoryRuntimeGuidance {
  const id = String(childId);
  const speechHref =
    decision?.recommendation?.href?.includes("speech")
      ? decision.recommendation.href
      : decision?.nextActivity?.kind === "speech_practice"
        ? decision.nextActivity.href ?? "/speech-coach"
        : null;

  return {
    childId: id,
    difficulty: decision?.difficulty ?? "same",
    hints: decision?.hints ?? "none",
    narrationLength: decision?.narrationLength ?? "medium",
    celebrationLevel: decision?.celebrationLevel ?? 1,
    reviewQueue: decision?.reviewQueue ?? [],
    recommendation: decision?.recommendation ?? null,
    breakSuggestion: decision?.breakSuggestion ?? false,
    nextActivity: decision?.nextActivity ?? null,
    preferredStoryIds: preferredIdsFromDecision(decision, id),
    speechOpportunityHref: speechHref,
    reason: decision?.reason ?? "Awaiting runtime decision",
    ruleId: decision?.ruleId ?? "runtime.pending",
    decisionId: decision?.id ?? null,
  };
}

/**
 * Reorder a story catalog using Runtime preferred ids / review targets.
 * Does not score mastery — stable sort with preferred first.
 */
export function adaptStoryQueueFromRuntime<T extends { id: string | number }>(
  catalog: readonly T[],
  guidance: StoryRuntimeGuidance | null,
): T[] {
  if (!guidance?.preferredStoryIds.length) return [...catalog];
  const rank = new Map(
    guidance.preferredStoryIds.map((id, i) => [String(id), i]),
  );
  return [...catalog].sort((a, b) => {
    const ra = rank.has(String(a.id)) ? rank.get(String(a.id))! : 9999;
    const rb = rank.has(String(b.id)) ? rank.get(String(b.id))! : 9999;
    return ra - rb;
  });
}

export type BeginStorySessionArgs = {
  childId: number;
  sessionId?: string;
  /** Optional catalog to reorder from Runtime guidance. */
  catalog?: Array<{ id: string | number; title?: string; category?: string }>;
};

export type BeginStorySessionResult = {
  sessionId: string;
  guidance: StoryRuntimeGuidance;
  orderedCatalog: Array<{ id: string | number; title?: string; category?: string }>;
  decision: LearningDecision | null;
};

export function beginStorySession(
  args: BeginStorySessionArgs,
): BeginStorySessionResult {
  ensureDecisionCache();
  const sessionId =
    args.sessionId ?? `story_${args.childId}_${Date.now().toString(36)}`;
  const prior = getLastStoryRuntimeDecision(args.childId);

  publishStoryLearningEvent("session_started", {
    childId: args.childId,
    sessionId,
    difficulty: prior?.difficulty,
    metadata: { surface: "story_world" },
  });

  try {
    recordAttentionEvent(args.childId, "session_start", {
      itemId: "story_world",
    });
    const snap = getAttentionSnapshot(args.childId);
    publishAttentionStateChanged({
      childId: args.childId,
      classification: snap.classification,
      score: snap.score,
      rhythm: snap.rhythm,
      sessionId,
    });
  } catch {
    /* optional */
  }

  const decision = getLastStoryRuntimeDecision(args.childId) ?? prior;
  const guidance = guidanceFromStoryDecision(args.childId, decision);
  const orderedCatalog = adaptStoryQueueFromRuntime(
    args.catalog ?? [],
    guidance,
  );

  return { sessionId, guidance, orderedCatalog, decision };
}

export function recordStoryChapterStarted(args: {
  childId: number;
  sessionId?: string;
  chapter: StoryChapterInput;
}): StoryRuntimeGuidance {
  ensureDecisionCache();
  publishStoryLearningEvent("chapter_started", {
    childId: args.childId,
    entityId: args.chapter.storyId,
    conceptId: `story:${args.chapter.storyId}`,
    sessionId: args.sessionId,
    metadata: {
      title: args.chapter.title,
      category: args.chapter.category,
      chapterIndex: args.chapter.chapterIndex ?? 0,
    },
  });
  try {
    recordAttentionEvent(args.childId, "object_open", {
      itemId: args.chapter.storyId,
    });
  } catch {
    /* optional */
  }
  return guidanceFromStoryDecision(
    args.childId,
    getLastStoryRuntimeDecision(args.childId),
  );
}

export function recordStoryChapterCompleted(args: {
  childId: number;
  sessionId?: string;
  chapter: StoryChapterInput;
  /** When true, also emit vocabulary + concept discovery events. */
  emitDiscoveries?: boolean;
}): StoryRuntimeGuidance {
  ensureDecisionCache();
  const vocab =
    args.chapter.vocabulary ??
    extractStoryVocabulary(args.chapter.title);
  const concepts =
    args.chapter.concepts ??
    (args.chapter.category ? [args.chapter.category] : []);

  ensureStoryLearningNodes(args.childId, {
    storyId: args.chapter.storyId,
    title: args.chapter.title,
    category: args.chapter.category,
    vocabulary: vocab,
    concepts,
  });

  publishStoryLearningEvent("chapter_completed", {
    childId: args.childId,
    entityId: args.chapter.storyId,
    conceptId: `story:${args.chapter.storyId}`,
    confidence: 85,
    sessionId: args.sessionId,
    metadata: {
      title: args.chapter.title,
      category: args.chapter.category,
      chapterIndex: args.chapter.chapterIndex ?? 0,
      vocabulary: vocab,
      concepts,
    },
  });

  if (args.emitDiscoveries !== false) {
    if (concepts.length) {
      publishStoryLearningEvent("concept_discovered", {
        childId: args.childId,
        entityId: args.chapter.storyId,
        conceptId: `story:${args.chapter.storyId}`,
        sessionId: args.sessionId,
        metadata: { concepts, category: args.chapter.category },
      });
    }
    if (vocab.length) {
      publishStoryLearningEvent("vocabulary_learned", {
        childId: args.childId,
        entityId: args.chapter.storyId,
        conceptId: `word:${vocab[0]}`,
        confidence: 80,
        sessionId: args.sessionId,
        metadata: {
          vocabulary: vocab,
          title: args.chapter.title,
          speechOpportunity: true,
        },
      });
    }
  }

  try {
    recordAttentionEvent(args.childId, "task_complete", {
      itemId: args.chapter.storyId,
    });
    const snap = getAttentionSnapshot(args.childId);
    publishAttentionStateChanged({
      childId: args.childId,
      classification: snap.classification,
      score: snap.score,
      rhythm: snap.rhythm,
      sessionId: args.sessionId,
    });
  } catch {
    /* optional */
  }

  return guidanceFromStoryDecision(
    args.childId,
    getLastStoryRuntimeDecision(args.childId),
  );
}

export function endStorySession(args: {
  childId: number;
  sessionId?: string;
  storiesCompleted?: number;
}): StoryRuntimeGuidance {
  ensureDecisionCache();
  publishStoryLearningEvent("session_completed", {
    childId: args.childId,
    sessionId: args.sessionId,
    confidence: 90,
    metadata: {
      storiesCompleted: args.storiesCompleted ?? 0,
      surface: "story_world",
    },
  });
  try {
    recordAttentionEvent(args.childId, "session_end", {
      itemId: "story_world",
    });
    const snap = getAttentionSnapshot(args.childId);
    publishAttentionStateChanged({
      childId: args.childId,
      classification: snap.classification,
      score: snap.score,
      rhythm: snap.rhythm,
      sessionId: args.sessionId,
    });
  } catch {
    /* optional */
  }
  return guidanceFromStoryDecision(
    args.childId,
    getLastStoryRuntimeDecision(args.childId),
  );
}

export function getStoryWorldParentInsights(childId: number | string): {
  knowledgeSummary: ReturnType<typeof getKnowledgeSummary>;
  recommendations: ReturnType<typeof getKnowledgeRecommendations>;
  latestDecision: LearningDecision | null;
  timelineLabels: string[];
  speechOpportunityHref: string | null;
} {
  const summary = getKnowledgeSummary(childId);
  const recommendations = getKnowledgeRecommendations(childId, 5).filter(
    (r) =>
      r.nodeId.startsWith("story:") ||
      r.nodeId.startsWith("word:") ||
      Boolean(r.links?.storyId),
  );
  const latestDecision = getLastStoryRuntimeDecision(childId);
  const guidance = guidanceFromStoryDecision(childId, latestDecision);
  const timelineLabels: string[] = [];
  if (recommendations[0]) {
    timelineLabels.push(`Story: ${recommendations[0].label}`);
  } else if (latestDecision?.recommendation?.title) {
    timelineLabels.push(latestDecision.recommendation.title);
  } else if (summary && summary.touchedNodes > 0) {
    timelineLabels.push("Story time");
  }
  return {
    knowledgeSummary: summary,
    recommendations,
    latestDecision,
    timelineLabels,
    speechOpportunityHref: guidance.speechOpportunityHref,
  };
}

/** Test helper */
export function __resetStoryWorldLearningAdapterForTests(): void {
  lastDecisionByChild.clear();
}
