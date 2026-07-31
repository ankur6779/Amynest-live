/**
 * Reading World ↔ Learning Platform adapter.
 *
 * Reading World owns rendering, interactions, pronunciation UI, animations,
 * and page progression only. Adaptive difficulty / mastery / recommendations /
 * review / attention adaptation come from Runtime.
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
  publishReadingLearningEvent,
} from "@/lib/learning-events-bridge";
import {
  ensureReadingLearningNodes,
  getKnowledgeRecommendations,
  getKnowledgeSummary,
  getKnowledgeWeakPhonemes,
} from "@/lib/knowledge-graph-client";
import { subscribeLearningDecision } from "@/lib/learning-decision-bus";
import {
  getAttentionSnapshot,
  recordAttentionEvent,
} from "@/lib/sound-world-attention-store";
import { installLearningRuntimeBridge } from "@/lib/learning-runtime-bridge";

export type ReadingAttentionProfile = {
  classification: string;
  score: number;
  rhythm: string | null;
};

export type ReadingRuntimeGuidance = {
  childId: string;
  difficulty: DifficultyDecision;
  /** Alias of Runtime hints — presentation hint level. */
  hintLevel: HintsDecision;
  /** @deprecated Prefer hintLevel */
  hints: HintsDecision;
  narrationLength: NarrationLength;
  celebrationLevel: CelebrationLevel;
  reviewQueue: ReviewQueueItem[];
  recommendation: RecommendationDecision | null;
  breakSuggestion: boolean;
  nextActivity: NextActivity | null;
  /** Preferred graphemes / reading ids for next lesson order. */
  preferredGraphemes: string[];
  /** Preferred decodable book ids from Runtime (book:…). */
  preferredBookIds: string[];
  /** Recommended letters (graphemes) from Runtime/KG. */
  recommendedLetters: string[];
  /** Recommended phoneme labels from Runtime/KG. */
  recommendedPhonemes: string[];
  /** Recommended vocabulary words from Runtime/KG. */
  recommendedWords: string[];
  /** @deprecated Prefer recommendedWords */
  recommendedVocabulary: string[];
  /** Live attention snapshot for presentation pacing (not local adaptation). */
  attentionProfile: ReadingAttentionProfile | null;
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

export function getLastReadingRuntimeDecision(
  childId: number | string,
): LearningDecision | null {
  ensureDecisionCache();
  return lastDecisionByChild.get(String(childId)) ?? null;
}

function stripPrefix(raw: string, prefix: string): string {
  return raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
}

function preferredGraphemesFromDecision(
  decision: LearningDecision | null,
  childId: string,
): string[] {
  const ids: string[] = [];
  const push = (raw: string | null | undefined) => {
    if (!raw) return;
    let id = stripPrefix(raw, "reading:");
    id = stripPrefix(id, "phoneme:");
    id = stripPrefix(id, "word:");
    id = id.toLowerCase().replace(/[^a-z]/g, "");
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
      if (r.links?.readingId) push(String(r.links.readingId));
      if (r.nodeId.startsWith("reading:") || r.nodeId.startsWith("phoneme:")) {
        push(r.nodeId);
      }
    }
  } catch {
    /* optional */
  }
  return ids;
}

function preferredBooksFromDecision(
  decision: LearningDecision | null,
): string[] {
  const ids: string[] = [];
  const push = (raw: string | null | undefined) => {
    if (!raw) return;
    const id = raw.startsWith("book:") ? raw.slice("book:".length) : raw;
    if (
      id.startsWith("book-") &&
      !ids.includes(id)
    ) {
      ids.push(id);
    }
  };
  push(decision?.nextActivity?.entityId ?? undefined);
  push(decision?.recommendation?.conceptId ?? undefined);
  for (const item of decision?.reviewQueue ?? []) {
    push(item.entityId);
    push(item.conceptId);
  }
  return ids;
}

function vocabularyFromDecision(
  decision: LearningDecision | null,
  childId: string,
): string[] {
  const words: string[] = [];
  const push = (raw: string | null | undefined) => {
    if (!raw) return;
    const w = stripPrefix(raw, "word:")
      .toLowerCase()
      .replace(/[^a-z]/g, "");
    if (w.length >= 2 && !words.includes(w)) words.push(w);
  };
  push(decision?.nextActivity?.entityId ?? undefined);
  push(decision?.recommendation?.conceptId ?? undefined);
  for (const item of decision?.reviewQueue ?? []) {
    push(item.entityId);
    push(item.conceptId);
  }
  try {
    for (const r of getKnowledgeRecommendations(childId, 8)) {
      if (r.nodeId.startsWith("word:")) push(r.nodeId);
    }
  } catch {
    /* optional */
  }
  return words;
}

export function guidanceFromReadingDecision(
  childId: number | string,
  decision: LearningDecision | null,
): ReadingRuntimeGuidance {
  const id = String(childId);
  let recommendedPhonemes: string[] = [];
  try {
    recommendedPhonemes = getKnowledgeWeakPhonemes(id, 5).map((p) =>
      stripPrefix(p.nodeId, "phoneme:"),
    );
  } catch {
    recommendedPhonemes = [];
  }
  for (const item of decision?.reviewQueue ?? []) {
    const c = item.conceptId ?? item.entityId;
    if (c?.startsWith("phoneme:")) {
      const p = stripPrefix(c, "phoneme:");
      if (p && !recommendedPhonemes.includes(p)) recommendedPhonemes.push(p);
    }
  }

  const preferredGraphemes = preferredGraphemesFromDecision(decision, id);
  const preferredBookIds = preferredBooksFromDecision(decision);
  const recommendedWords = vocabularyFromDecision(decision, id);
  const hintLevel = decision?.hints ?? "none";

  let attentionProfile: ReadingAttentionProfile | null = null;
  try {
    const snap = getAttentionSnapshot(Number(childId) || 0);
    if (Number(childId) > 0) {
      attentionProfile = {
        classification: snap.classification,
        score: snap.score,
        rhythm: snap.rhythm ?? null,
      };
    }
  } catch {
    attentionProfile = null;
  }

  return {
    childId: id,
    difficulty: decision?.difficulty ?? "same",
    hintLevel,
    hints: hintLevel,
    narrationLength: decision?.narrationLength ?? "medium",
    celebrationLevel: decision?.celebrationLevel ?? 1,
    reviewQueue: decision?.reviewQueue ?? [],
    recommendation: decision?.recommendation ?? null,
    breakSuggestion: decision?.breakSuggestion ?? false,
    nextActivity: decision?.nextActivity ?? null,
    preferredGraphemes,
    preferredBookIds,
    recommendedLetters: preferredGraphemes,
    recommendedPhonemes,
    recommendedWords,
    recommendedVocabulary: recommendedWords,
    attentionProfile,
    reason: decision?.reason ?? "Awaiting runtime decision",
    ruleId: decision?.ruleId ?? "runtime.pending",
    decisionId: decision?.id ?? null,
  };
}

/**
 * Reorder grapheme/lesson catalog by Runtime preferred ids.
 * Does not score mastery — stable sort with preferred first.
 */
export function adaptReadingOrderFromRuntime<T extends { id: string | number }>(
  catalog: readonly T[],
  guidance: ReadingRuntimeGuidance | null,
): T[] {
  if (!guidance?.preferredGraphemes.length) return [...catalog];
  const rank = new Map(
    guidance.preferredGraphemes.map((id, i) => [String(id).toLowerCase(), i]),
  );
  return [...catalog].sort((a, b) => {
    const ra = rank.has(String(a.id).toLowerCase())
      ? rank.get(String(a.id).toLowerCase())!
      : 9999;
    const rb = rank.has(String(b.id).toLowerCase())
      ? rank.get(String(b.id).toLowerCase())!
      : 9999;
    return ra - rb;
  });
}

/** Map Runtime difficulty delta onto presentation bands (no local engine). */
export function mapRuntimeDifficultyToReadingBand(
  difficulty: DifficultyDecision,
  current: "easy" | "medium" | "hard" = "medium",
): "easy" | "medium" | "hard" {
  if (difficulty === "easier") {
    return current === "hard" ? "medium" : "easy";
  }
  if (difficulty === "harder") {
    return current === "easy" ? "medium" : "hard";
  }
  return current;
}

export type BeginReadingSessionArgs = {
  childId: number;
  sessionId?: string;
  grapheme?: string;
  focusWord?: string;
  practiceWords?: string[];
};

export type BeginReadingSessionResult = {
  sessionId: string;
  guidance: ReadingRuntimeGuidance;
  decision: LearningDecision | null;
};

export function beginReadingSession(
  args: BeginReadingSessionArgs,
): BeginReadingSessionResult {
  ensureDecisionCache();
  const sessionId =
    args.sessionId ?? `reading_${args.childId}_${Date.now().toString(36)}`;
  const prior = getLastReadingRuntimeDecision(args.childId);

  if (args.grapheme || args.focusWord || args.practiceWords?.length) {
    const blend =
      args.grapheme && args.grapheme.length >= 2 ? [args.grapheme] : undefined;
    ensureReadingLearningNodes(args.childId, {
      grapheme: args.grapheme,
      focusWord: args.focusWord,
      words: args.practiceWords,
      phonemes: args.grapheme ? [args.grapheme] : undefined,
      blends: blend,
      sentencePatterns: ["cvc"],
      concepts: ["blending", "letter-sounds"],
    });
  }

  publishReadingLearningEvent("session_started", {
    childId: args.childId,
    sessionId,
    entityId: args.grapheme,
    conceptId: args.grapheme ? `reading:${args.grapheme}` : "reading:phonics",
    difficulty: prior?.difficulty,
    metadata: {
      surface: "reading_world",
      grapheme: args.grapheme,
      focusWord: args.focusWord,
      words: args.practiceWords,
    },
  });

  try {
    recordAttentionEvent(args.childId, "session_start", {
      itemId: "reading_world",
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

  const decision = getLastReadingRuntimeDecision(args.childId) ?? prior;
  return {
    sessionId,
    guidance: guidanceFromReadingDecision(args.childId, decision),
    decision,
  };
}

export function recordReadingPageStarted(args: {
  childId: number;
  sessionId?: string;
  pageId: string;
  grapheme?: string;
  focusWord?: string;
}): ReadingRuntimeGuidance {
  ensureDecisionCache();
  publishReadingLearningEvent("page_started", {
    childId: args.childId,
    sessionId: args.sessionId,
    entityId: args.pageId,
    conceptId: args.grapheme
      ? `reading:${args.grapheme.toLowerCase()}`
      : undefined,
    metadata: {
      pageId: args.pageId,
      grapheme: args.grapheme,
      focusWord: args.focusWord,
    },
  });
  try {
    recordAttentionEvent(args.childId, "object_open", { itemId: args.pageId });
  } catch {
    /* optional */
  }
  return guidanceFromReadingDecision(
    args.childId,
    getLastReadingRuntimeDecision(args.childId),
  );
}

export function recordReadingWordCompleted(args: {
  childId: number;
  sessionId?: string;
  word: string;
  grapheme?: string;
  correct?: boolean;
  confidence?: number;
  isNew?: boolean;
}): ReadingRuntimeGuidance {
  ensureDecisionCache();
  const word = args.word.toLowerCase().replace(/[^a-z]/g, "");
  ensureReadingLearningNodes(args.childId, {
    grapheme: args.grapheme,
    focusWord: word,
    words: [word],
  });

  publishReadingLearningEvent("word_completed", {
    childId: args.childId,
    sessionId: args.sessionId,
    entityId: word,
    conceptId: `word:${word}`,
    confidence: args.confidence ?? (args.correct === false ? 40 : 85),
    metadata: {
      word,
      grapheme: args.grapheme,
      failed: args.correct === false,
    },
  });

  if (args.isNew !== false) {
    publishReadingLearningEvent("new_word", {
      childId: args.childId,
      sessionId: args.sessionId,
      entityId: word,
      conceptId: `word:${word}`,
      confidence: 75,
      metadata: { word, grapheme: args.grapheme },
    });
  }

  return guidanceFromReadingDecision(
    args.childId,
    getLastReadingRuntimeDecision(args.childId),
  );
}

export function recordReadingPageCompleted(args: {
  childId: number;
  sessionId?: string;
  pageId: string;
  grapheme?: string;
  focusWord?: string;
  words?: string[];
  phonemes?: string[];
  confidence?: number;
}): ReadingRuntimeGuidance {
  ensureDecisionCache();
  ensureReadingLearningNodes(args.childId, {
    grapheme: args.grapheme,
    focusWord: args.focusWord,
    words: args.words,
    phonemes: args.phonemes ?? (args.grapheme ? [args.grapheme] : undefined),
    sentencePatterns: ["cvc"],
  });

  publishReadingLearningEvent("page_completed", {
    childId: args.childId,
    sessionId: args.sessionId,
    entityId: args.pageId,
    conceptId: args.grapheme
      ? `reading:${args.grapheme.toLowerCase()}`
      : "reading:phonics",
    confidence: args.confidence ?? 85,
    metadata: {
      pageId: args.pageId,
      grapheme: args.grapheme,
      focusWord: args.focusWord,
      words: args.words,
      phoneme: args.phonemes?.[0] ?? args.grapheme,
    },
  });

  try {
    recordAttentionEvent(args.childId, "task_complete", {
      itemId: args.pageId,
    });
  } catch {
    /* optional */
  }

  return guidanceFromReadingDecision(
    args.childId,
    getLastReadingRuntimeDecision(args.childId),
  );
}

export function recordReadingPhonemePracticed(args: {
  childId: number;
  sessionId?: string;
  phoneme: string;
  word?: string;
  correct?: boolean;
  confidence?: number;
}): ReadingRuntimeGuidance {
  ensureDecisionCache();
  const p = args.phoneme.toLowerCase().replace(/[^a-z]/g, "");
  if (!p) {
    return guidanceFromReadingDecision(
      args.childId,
      getLastReadingRuntimeDecision(args.childId),
    );
  }
  ensureReadingLearningNodes(args.childId, {
    grapheme: p,
    phonemes: [p],
    focusWord: args.word,
  });
  publishReadingLearningEvent("phoneme_practiced", {
    childId: args.childId,
    sessionId: args.sessionId,
    entityId: p,
    conceptId: `phoneme:${p[0]}`,
    confidence: args.confidence ?? (args.correct === false ? 45 : 82),
    metadata: {
      phoneme: p,
      grapheme: p,
      word: args.word,
      failed: args.correct === false,
    },
  });
  return guidanceFromReadingDecision(
    args.childId,
    getLastReadingRuntimeDecision(args.childId),
  );
}

export function endReadingSession(args: {
  childId: number;
  sessionId?: string;
  wordsCompleted?: number;
  grapheme?: string;
}): ReadingRuntimeGuidance {
  ensureDecisionCache();
  publishReadingLearningEvent("session_completed", {
    childId: args.childId,
    sessionId: args.sessionId,
    confidence: 90,
    entityId: args.grapheme,
    conceptId: args.grapheme
      ? `reading:${args.grapheme.toLowerCase()}`
      : "reading:phonics",
    metadata: {
      wordsCompleted: args.wordsCompleted ?? 0,
      grapheme: args.grapheme,
      surface: "reading_world",
    },
  });
  try {
    recordAttentionEvent(args.childId, "session_end", {
      itemId: "reading_world",
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
  return guidanceFromReadingDecision(
    args.childId,
    getLastReadingRuntimeDecision(args.childId),
  );
}

export function getReadingWorldParentInsights(childId: number | string): {
  knowledgeSummary: ReturnType<typeof getKnowledgeSummary>;
  recommendations: ReturnType<typeof getKnowledgeRecommendations>;
  weakPhonemes: ReturnType<typeof getKnowledgeWeakPhonemes>;
  latestDecision: LearningDecision | null;
  guidance: ReadingRuntimeGuidance;
  /** Reading Timeline labels for Learning Journey. */
  timelineLabels: string[];
  /** Reading Skills chips (letters / phonemes / words). */
  readingSkills: string[];
  /** Short journey line for Learning Journey card. */
  journeyLine: string | null;
} {
  const summary = getKnowledgeSummary(childId);
  const recommendations = getKnowledgeRecommendations(childId, 5).filter(
    (r) =>
      r.nodeId.startsWith("reading:") ||
      r.nodeId.startsWith("word:") ||
      r.nodeId.startsWith("phoneme:") ||
      r.nodeId.startsWith("entity:blend-") ||
      Boolean(r.links?.readingId),
  );
  const weakPhonemes = getKnowledgeWeakPhonemes(childId, 5);
  const latestDecision = getLastReadingRuntimeDecision(childId);
  const guidance = guidanceFromReadingDecision(childId, latestDecision);

  const timelineLabels: string[] = [];
  if (weakPhonemes[0]) {
    timelineLabels.push(`Reading: practice ${weakPhonemes[0].label}`);
  }
  if (guidance.recommendedWords[0]) {
    timelineLabels.push(`Reading word: ${guidance.recommendedWords[0]}`);
  }
  if (recommendations[0] && timelineLabels.length < 2) {
    timelineLabels.push(`Reading: ${recommendations[0].label}`);
  } else if (latestDecision?.recommendation?.title && timelineLabels.length === 0) {
    timelineLabels.push(latestDecision.recommendation.title);
  } else if (summary && summary.touchedNodes > 0 && timelineLabels.length === 0) {
    timelineLabels.push("Reading practice");
  }

  const readingSkills = [
    ...guidance.recommendedLetters.slice(0, 3).map((l) => `Letter ${l.toUpperCase()}`),
    ...guidance.recommendedPhonemes.slice(0, 3).map((p) => `${p.toUpperCase()} sound`),
    ...guidance.recommendedWords.slice(0, 3).map((w) => `Word ${w}`),
  ].slice(0, 6);

  const journeyLine =
    guidance.decisionId != null
      ? `Runtime: ${guidance.difficulty} · hints ${guidance.hintLevel} · ${guidance.reason}`
      : summary && summary.touchedNodes > 0
        ? "Reading journey is growing from shared Knowledge Graph evidence."
        : null;

  return {
    knowledgeSummary: summary,
    recommendations,
    weakPhonemes,
    latestDecision,
    guidance,
    timelineLabels,
    readingSkills,
    journeyLine,
  };
}

/** Test helper */
export function __resetReadingWorldLearningAdapterForTests(): void {
  lastDecisionByChild.clear();
}
