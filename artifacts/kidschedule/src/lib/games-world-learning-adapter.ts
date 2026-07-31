/**
 * Educational Games ↔ Learning Platform adapter.
 *
 * Games own gameplay, physics, animations, rewards, and rendering.
 * They do NOT own difficulty / mastery / recommendations / review /
 * learning adaptation — those come from Runtime.
 */

import type {
  CelebrationLevel,
  DifficultyDecision,
  HintsDecision,
  LearningDecision,
  NextActivity,
  RecommendationDecision,
  ReviewQueueItem,
  RewardPriority,
} from "@workspace/learning-runtime";
import type { SectionKey } from "@workspace/learning-progress-engine";
import {
  publishAttentionStateChanged,
  publishGameLearningEvent,
} from "@/lib/learning-events-bridge";
import {
  ensureGameLearningNodes,
  getKnowledgeRecommendations,
  getKnowledgeSummary,
} from "@/lib/knowledge-graph-client";
import { subscribeLearningDecision } from "@/lib/learning-decision-bus";
import {
  getAttentionSnapshot,
  recordAttentionEvent,
} from "@/lib/sound-world-attention-store";
import { installLearningRuntimeBridge } from "@/lib/learning-runtime-bridge";
import type { GameCategory } from "@/lib/games";

export type GameRuntimeGuidance = {
  childId: string;
  difficulty: DifficultyDecision;
  hints: HintsDecision;
  celebrationLevel: CelebrationLevel;
  rewardPriority: RewardPriority;
  reviewQueue: ReviewQueueItem[];
  recommendation: RecommendationDecision | null;
  breakSuggestion: boolean;
  nextActivity: NextActivity | null;
  /** Prefer these game ids next (from Runtime/KG). */
  preferredGameIds: string[];
  reason: string;
  ruleId: string;
  decisionId: string | null;
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

export function getLastGameRuntimeDecision(
  childId: number | string,
): LearningDecision | null {
  ensureDecisionCache();
  return lastDecisionByChild.get(String(childId)) ?? null;
}

/** Map game category → progress-engine SectionKey (no "games" section — BC). */
export function sectionKeyForGameCategory(category: GameCategory): SectionKey {
  switch (category) {
    case "memory":
      return "memory";
    case "math":
      return "math";
    case "creativity":
      return "creativity";
    case "brain":
    case "puzzle":
    case "focus":
    case "action":
    case "behavior":
    default:
      return "puzzles";
  }
}

export function skillsForGameCategory(category: GameCategory): string[] {
  switch (category) {
    case "memory":
      return ["working-memory", "recall"];
    case "math":
      return ["number-sense", "counting"];
    case "creativity":
      return ["shape-matching", "visual-design"];
    case "focus":
      return ["attention", "observation"];
    case "behavior":
      return ["self-control", "kind-choices"];
    case "action":
      return ["planning", "coordination"];
    case "brain":
    case "puzzle":
    default:
      return ["logic", "pattern-recognition"];
  }
}

/** Map Runtime difficulty onto local Easy/Normal/Hard presentation (no mastery math). */
export function mapRuntimeDifficultyToGameUi(
  difficulty: DifficultyDecision,
  current: "easy" | "normal" | "hard" = "normal",
): "easy" | "normal" | "hard" {
  if (difficulty === "easier") {
    return current === "hard" ? "normal" : "easy";
  }
  if (difficulty === "harder") {
    return current === "easy" ? "normal" : "hard";
  }
  return current;
}

function preferredIdsFromDecision(
  decision: LearningDecision | null,
  childId: string,
): string[] {
  const ids: string[] = [];
  const push = (raw: string | null | undefined) => {
    if (!raw) return;
    const id = raw.startsWith("game:") ? raw.slice("game:".length) : raw;
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
      if (r.links?.gameId) push(String(r.links.gameId));
      if (r.nodeId.startsWith("game:")) push(r.nodeId);
    }
  } catch {
    /* optional */
  }
  return ids;
}

export function guidanceFromGameDecision(
  childId: number | string,
  decision: LearningDecision | null,
): GameRuntimeGuidance {
  const id = String(childId);
  return {
    childId: id,
    difficulty: decision?.difficulty ?? "same",
    hints: decision?.hints ?? "none",
    celebrationLevel: decision?.celebrationLevel ?? 1,
    rewardPriority: decision?.rewardPriority ?? "normal",
    reviewQueue: decision?.reviewQueue ?? [],
    recommendation: decision?.recommendation ?? null,
    breakSuggestion: decision?.breakSuggestion ?? false,
    nextActivity: decision?.nextActivity ?? null,
    preferredGameIds: preferredIdsFromDecision(decision, id),
    reason: decision?.reason ?? "Awaiting runtime decision",
    ruleId: decision?.ruleId ?? "runtime.pending",
    decisionId: decision?.id ?? null,
  };
}

/**
 * Reorder game catalog by Runtime preferred ids.
 * Does not score mastery — stable sort with preferred first.
 */
export function adaptGameQueueFromRuntime<T extends { id: string | number }>(
  catalog: readonly T[],
  guidance: GameRuntimeGuidance | null,
): T[] {
  if (!guidance?.preferredGameIds.length) return [...catalog];
  const rank = new Map(
    guidance.preferredGameIds.map((id, i) => [String(id), i]),
  );
  return [...catalog].sort((a, b) => {
    const ra = rank.has(String(a.id)) ? rank.get(String(a.id))! : 9999;
    const rb = rank.has(String(b.id)) ? rank.get(String(b.id))! : 9999;
    return ra - rb;
  });
}

export type BeginGameSessionArgs = {
  childId: number;
  sessionId?: string;
  gameId: string;
  title?: string;
  category?: GameCategory;
};

export type BeginGameSessionResult = {
  sessionId: string;
  guidance: GameRuntimeGuidance;
  decision: LearningDecision | null;
  uiDifficulty: "easy" | "normal" | "hard";
};

export function beginGameSession(
  args: BeginGameSessionArgs,
): BeginGameSessionResult {
  ensureDecisionCache();
  const sessionId =
    args.sessionId ??
    `game_${args.gameId}_${args.childId}_${Date.now().toString(36)}`;
  const prior = getLastGameRuntimeDecision(args.childId);
  const skills = args.category ? skillsForGameCategory(args.category) : [];

  ensureGameLearningNodes(args.childId, {
    gameId: args.gameId,
    title: args.title,
    category: args.category,
    skills,
    concepts: args.category ? [args.category] : undefined,
  });

  publishGameLearningEvent("session_started", {
    childId: args.childId,
    sessionId,
    entityId: args.gameId,
    conceptId: `game:${args.gameId}`,
    difficulty: prior?.difficulty,
    metadata: {
      surface: "games_hub",
      category: args.category,
      title: args.title,
      skills,
    },
  });

  try {
    recordAttentionEvent(args.childId, "session_start", {
      itemId: args.gameId,
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

  const decision = getLastGameRuntimeDecision(args.childId) ?? prior;
  const guidance = guidanceFromGameDecision(args.childId, decision);
  return {
    sessionId,
    guidance,
    decision,
    uiDifficulty: mapRuntimeDifficultyToGameUi(guidance.difficulty),
  };
}

export function recordGameLevelStarted(args: {
  childId: number;
  sessionId?: string;
  gameId: string;
  levelId?: string;
  category?: GameCategory;
}): GameRuntimeGuidance {
  ensureDecisionCache();
  publishGameLearningEvent("level_started", {
    childId: args.childId,
    sessionId: args.sessionId,
    entityId: args.gameId,
    conceptId: `game:${args.gameId}`,
    metadata: {
      levelId: args.levelId ?? "1",
      category: args.category,
    },
  });
  try {
    recordAttentionEvent(args.childId, "object_open", {
      itemId: args.gameId,
    });
  } catch {
    /* optional */
  }
  return guidanceFromGameDecision(
    args.childId,
    getLastGameRuntimeDecision(args.childId),
  );
}

export function recordGameLevelCompleted(args: {
  childId: number;
  sessionId?: string;
  gameId: string;
  title?: string;
  category?: GameCategory;
  score: number;
  total: number;
  perfect?: boolean;
  /** When true, also emit challenge_completed. */
  isChallenge?: boolean;
}): GameRuntimeGuidance {
  ensureDecisionCache();
  const ratio = args.total <= 0 ? 0 : args.score / args.total;
  const confidence = Math.round(Math.max(0, Math.min(100, ratio * 100)));
  const skills = args.category ? skillsForGameCategory(args.category) : [];

  ensureGameLearningNodes(args.childId, {
    gameId: args.gameId,
    title: args.title,
    category: args.category,
    skills,
  });

  publishGameLearningEvent("level_completed", {
    childId: args.childId,
    sessionId: args.sessionId,
    entityId: args.gameId,
    conceptId: `game:${args.gameId}`,
    confidence,
    metadata: {
      score: args.score,
      total: args.total,
      perfect: args.perfect ?? confidence >= 95,
      failed: confidence < 50,
      category: args.category,
      skills,
      concepts: args.category ? [args.category] : undefined,
    },
  });

  if (args.isChallenge || args.perfect || confidence >= 90) {
    publishGameLearningEvent("challenge_completed", {
      childId: args.childId,
      sessionId: args.sessionId,
      entityId: args.gameId,
      conceptId: `game:${args.gameId}`,
      confidence,
      metadata: {
        score: args.score,
        total: args.total,
        category: args.category,
        skills,
      },
    });
  }

  try {
    recordAttentionEvent(args.childId, "task_complete", {
      itemId: args.gameId,
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

  return guidanceFromGameDecision(
    args.childId,
    getLastGameRuntimeDecision(args.childId),
  );
}

export function endGameSession(args: {
  childId: number;
  sessionId?: string;
  gameId?: string;
  levelsCompleted?: number;
}): GameRuntimeGuidance {
  ensureDecisionCache();
  publishGameLearningEvent("session_completed", {
    childId: args.childId,
    sessionId: args.sessionId,
    entityId: args.gameId,
    conceptId: args.gameId ? `game:${args.gameId}` : "game:hub",
    confidence: 90,
    metadata: {
      levelsCompleted: args.levelsCompleted ?? 1,
      surface: "games_hub",
    },
  });
  try {
    recordAttentionEvent(args.childId, "session_end", {
      itemId: args.gameId ?? "games_hub",
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
  return guidanceFromGameDecision(
    args.childId,
    getLastGameRuntimeDecision(args.childId),
  );
}

export function getGamesWorldParentInsights(childId: number | string): {
  knowledgeSummary: ReturnType<typeof getKnowledgeSummary>;
  recommendations: ReturnType<typeof getKnowledgeRecommendations>;
  latestDecision: LearningDecision | null;
  timelineLabels: string[];
} {
  const summary = getKnowledgeSummary(childId);
  const recommendations = getKnowledgeRecommendations(childId, 5).filter(
    (r) =>
      r.nodeId.startsWith("game:") ||
      r.nodeId.startsWith("entity:skill-") ||
      Boolean(r.links?.gameId),
  );
  const latestDecision = getLastGameRuntimeDecision(childId);
  const timelineLabels: string[] = [];
  if (recommendations[0]) {
    timelineLabels.push(`Game: ${recommendations[0].label}`);
  } else if (latestDecision?.recommendation?.title) {
    timelineLabels.push(latestDecision.recommendation.title);
  } else if (summary && summary.touchedNodes > 0) {
    timelineLabels.push("Game practice");
  }
  return {
    knowledgeSummary: summary,
    recommendations,
    latestDecision,
    timelineLabels,
  };
}

/** Test helper */
export function __resetGamesWorldLearningAdapterForTests(): void {
  lastDecisionByChild.clear();
}
