/**
 * Speech Coach ↔ Learning Platform adapter.
 *
 * Speech Coach does NOT compute difficulty / recommendations / mastery / review.
 * It consumes Learning Runtime decisions + KG / skills / attention / profile
 * snapshots supplied by the host bridges, and publishes learning events only.
 */

import {
  getPromptsPool,
  seededShuffle,
  type PronouncePrompt,
  type PronouncePromptDifficulty,
  type PronouncePromptKind,
} from "@workspace/speech-coach";
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
  publishSpeechPracticeStarted,
} from "@/lib/learning-events-bridge";
import {
  getKnowledgeRecommendations,
  getKnowledgeSummary,
  getKnowledgeWeakPhonemes,
  recordSpeechCoachLearning,
} from "@/lib/knowledge-graph-client";
import { subscribeLearningDecision } from "@/lib/learning-decision-bus";
import {
  getAttentionSnapshot,
  recordAttentionEvent,
} from "@/lib/sound-world-attention-store";
import { installLearningRuntimeBridge } from "@/lib/learning-runtime-bridge";

export type SpeechCoachRuntimeGuidance = {
  childId: string;
  difficulty: PronouncePromptDifficulty;
  difficultyDelta: DifficultyDecision;
  hints: HintsDecision;
  narrationLength: NarrationLength;
  celebrationLevel: CelebrationLevel;
  targetPhonemes: string[];
  reviewQueue: ReviewQueueItem[];
  recommendation: RecommendationDecision | null;
  breakSuggestion: boolean;
  nextActivity: NextActivity | null;
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

export function getLastSpeechRuntimeDecision(
  childId: number | string,
): LearningDecision | null {
  ensureDecisionCache();
  return lastDecisionByChild.get(String(childId)) ?? null;
}

/** Map Runtime difficulty delta → catalog prompt band (no local mastery math). */
export function mapRuntimeDifficultyToPrompt(
  delta: DifficultyDecision | null | undefined,
  base: PronouncePromptDifficulty = "medium",
): PronouncePromptDifficulty {
  if (delta === "easier") return "easy";
  if (delta === "harder") return "advanced";
  return base;
}

function phonemeLabelFromConceptId(conceptId: string | undefined): string | null {
  if (!conceptId) return null;
  if (conceptId.startsWith("phoneme:")) {
    return conceptId.slice("phoneme:".length).trim() || null;
  }
  // Bare letter / digraph node ids
  if (/^[a-zA-Z]{1,3}$/.test(conceptId)) return conceptId.toLowerCase();
  return null;
}

function collectTargetPhonemes(
  childId: string,
  decision: LearningDecision | null,
): string[] {
  const out: string[] = [];
  const push = (raw: string | null | undefined) => {
    if (!raw) return;
    const v = raw.trim().toLowerCase();
    if (v && !out.includes(v)) out.push(v);
  };

  for (const item of decision?.reviewQueue ?? []) {
    push(phonemeLabelFromConceptId(item.conceptId));
    if (item.conceptId?.startsWith("phoneme:")) {
      /* already handled */
    }
  }
  push(phonemeLabelFromConceptId(decision?.recommendation?.conceptId ?? undefined));
  push(phonemeLabelFromConceptId(decision?.nextActivity?.conceptId ?? undefined));

  try {
    for (const p of getKnowledgeWeakPhonemes(childId, 5)) {
      push(p.label);
      push(phonemeLabelFromConceptId(p.nodeId));
    }
  } catch {
    /* optional */
  }

  return out;
}

export function guidanceFromDecision(
  childId: number | string,
  decision: LearningDecision | null,
  baseDifficulty: PronouncePromptDifficulty = "medium",
): SpeechCoachRuntimeGuidance {
  const id = String(childId);
  const delta = decision?.difficulty ?? "same";
  return {
    childId: id,
    difficulty: mapRuntimeDifficultyToPrompt(delta, baseDifficulty),
    difficultyDelta: delta,
    hints: decision?.hints ?? "none",
    narrationLength: decision?.narrationLength ?? "medium",
    celebrationLevel: decision?.celebrationLevel ?? 1,
    targetPhonemes: collectTargetPhonemes(id, decision),
    reviewQueue: decision?.reviewQueue ?? [],
    recommendation: decision?.recommendation ?? null,
    breakSuggestion: decision?.breakSuggestion ?? false,
    nextActivity: decision?.nextActivity ?? null,
    reason: decision?.reason ?? "Awaiting runtime decision",
    ruleId: decision?.ruleId ?? "runtime.pending",
    decisionId: decision?.id ?? null,
  };
}

function promptMatchesPhoneme(prompt: PronouncePrompt, phoneme: string): boolean {
  const p = phoneme.toLowerCase();
  const text = prompt.text.toLowerCase();
  const speak = (prompt.speakText ?? "").toLowerCase();
  if (text === p || speak === p) return true;
  if (text.includes(p)) return true;
  // letter prompts often use "A" / "a"
  if (prompt.kind === "letter" || prompt.kind === "phonic") {
    return text.replace(/[^a-z]/g, "") === p.replace(/[^a-z]/g, "");
  }
  return false;
}

/**
 * Build a practice list from Runtime guidance + catalog pools.
 * Prefers review/target phonemes from Runtime/KG; does not score mastery.
 */
export function buildSpeechSessionFromRuntime(opts: {
  ageMonths: number;
  kind: PronouncePromptKind;
  sessionSize: number;
  seed: number;
  guidance: SpeechCoachRuntimeGuidance | null;
  baseDifficulty?: PronouncePromptDifficulty;
}): PronouncePrompt[] {
  const base = opts.baseDifficulty ?? "medium";
  const difficulty = opts.guidance?.difficulty ?? base;
  const pool = [...getPromptsPool(opts.ageMonths, opts.kind, difficulty)];
  const size = Math.max(1, Math.min(opts.sessionSize, Math.max(pool.length, 1)));
  const targets = opts.guidance?.targetPhonemes ?? [];

  const preferred: PronouncePrompt[] = [];
  const rest: PronouncePrompt[] = [];
  for (const prompt of pool) {
    if (targets.some((t) => promptMatchesPhoneme(prompt, t))) {
      preferred.push(prompt);
    } else {
      rest.push(prompt);
    }
  }

  const ordered = [
    ...seededShuffle(preferred, opts.seed),
    ...seededShuffle(rest, opts.seed + 17),
  ];
  const unique = Array.from(new Map(ordered.map((p) => [p.id, p])).values());
  if (unique.length >= size) return unique.slice(0, size);

  // Fallback across kinds if pool thin for age band
  const altKind: PronouncePromptKind =
    opts.kind === "sentence" ? "word" : opts.kind === "word" ? "phonic" : "word";
  const alt = getPromptsPool(opts.ageMonths, altKind, difficulty);
  for (const p of seededShuffle([...alt], opts.seed + 31)) {
    if (!unique.find((u) => u.id === p.id)) unique.push(p);
    if (unique.length >= size) break;
  }
  return unique.slice(0, size);
}

export type BeginSpeechCoachSessionArgs = {
  childId: number;
  sessionId?: string;
  ageMonths: number;
  kind: PronouncePromptKind;
  sessionSize: number;
  /** Catalog band when Runtime has not yet emitted a difficulty delta. */
  baseDifficulty?: PronouncePromptDifficulty;
  seed?: number;
};

export type BeginSpeechCoachSessionResult = {
  sessionId: string;
  guidance: SpeechCoachRuntimeGuidance;
  tasks: PronouncePrompt[];
  decision: LearningDecision | null;
};

/** Session start → events + attention + Runtime-guided task list. */
export function beginSpeechCoachSession(
  args: BeginSpeechCoachSessionArgs,
): BeginSpeechCoachSessionResult {
  ensureDecisionCache();
  const sessionId =
    args.sessionId ?? `speech_${args.childId}_${Date.now().toString(36)}`;
  const base = args.baseDifficulty ?? "medium";
  const prior = getLastSpeechRuntimeDecision(args.childId);

  publishSpeechPracticeStarted({
    childId: args.childId,
    sessionId,
    difficulty: prior?.difficulty ?? base,
  });

  try {
    recordAttentionEvent(args.childId, "session_start", {
      itemId: "speech_coach",
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
    /* attention optional */
  }

  // Started event is processed by runtime bridge → may refresh last decision.
  const decision = getLastSpeechRuntimeDecision(args.childId) ?? prior;
  const guidance = guidanceFromDecision(args.childId, decision, base);
  const seed = args.seed ?? Date.now();
  const tasks = buildSpeechSessionFromRuntime({
    ageMonths: args.ageMonths,
    kind: args.kind,
    sessionSize: args.sessionSize,
    seed,
    guidance,
    baseDifficulty: base,
  });

  return { sessionId, guidance, tasks, decision };
}

export type SpeechCoachAttemptArgs = {
  childId: number;
  promptText: string;
  score: number;
  sessionId?: string;
  soundHints?: string[];
  correct?: boolean;
};

/** Practice result → learning events (KG + Runtime adapt). Returns fresh guidance. */
export function recordSpeechCoachAttempt(
  args: SpeechCoachAttemptArgs,
): SpeechCoachRuntimeGuidance {
  ensureDecisionCache();
  const correct = args.correct ?? args.score >= 70;

  recordSpeechCoachLearning(args.childId, {
    promptText: args.promptText,
    score: args.score,
    soundHints: args.soundHints,
    sessionId: args.sessionId,
  });

  try {
    recordAttentionEvent(
      args.childId,
      correct ? "answer_correct" : "answer_incorrect",
      { itemId: args.promptText.slice(0, 32) },
    );
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

  const decision = getLastSpeechRuntimeDecision(args.childId);
  return guidanceFromDecision(args.childId, decision);
}

export function endSpeechCoachSession(args: {
  childId: number;
  sessionId?: string;
}): SpeechCoachRuntimeGuidance {
  ensureDecisionCache();
  try {
    recordAttentionEvent(args.childId, "task_complete", {
      itemId: "speech_coach",
    });
    recordAttentionEvent(args.childId, "session_end", {
      itemId: "speech_coach",
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
  return guidanceFromDecision(
    args.childId,
    getLastSpeechRuntimeDecision(args.childId),
  );
}

/** Rebuild remaining session tasks when Runtime changes difficulty / review targets. */
export function adaptSpeechTasksFromRuntime(opts: {
  ageMonths: number;
  kind: PronouncePromptKind;
  remainingSize: number;
  seed: number;
  guidance: SpeechCoachRuntimeGuidance;
  excludeIds?: ReadonlySet<string>;
  baseDifficulty?: PronouncePromptDifficulty;
}): PronouncePrompt[] {
  const built = buildSpeechSessionFromRuntime({
    ageMonths: opts.ageMonths,
    kind: opts.kind,
    sessionSize: Math.max(1, opts.remainingSize + (opts.excludeIds?.size ?? 0)),
    seed: opts.seed,
    guidance: opts.guidance,
    baseDifficulty: opts.baseDifficulty,
  });
  if (!opts.excludeIds?.size) return built.slice(0, opts.remainingSize);
  return built
    .filter((p) => !opts.excludeIds!.has(p.id))
    .slice(0, opts.remainingSize);
}

/** Parent / profile read model — aggregates existing surfaces, no new mastery math. */
export function getSpeechCoachParentInsights(childId: number | string): {
  knowledgeSummary: ReturnType<typeof getKnowledgeSummary>;
  weakPhonemes: ReturnType<typeof getKnowledgeWeakPhonemes>;
  recommendations: ReturnType<typeof getKnowledgeRecommendations>;
  latestDecision: LearningDecision | null;
  timelineLabels: string[];
} {
  const summary = getKnowledgeSummary(childId);
  const weakPhonemes = getKnowledgeWeakPhonemes(childId, 5);
  const recommendations = getKnowledgeRecommendations(childId, 5).filter(
    (r) =>
      r.links?.speechRoute ||
      r.nodeId.startsWith("phoneme:") ||
      r.nodeId.startsWith("word:"),
  );
  const latestDecision = getLastSpeechRuntimeDecision(childId);
  const timelineLabels: string[] = [];
  if (weakPhonemes[0]) {
    timelineLabels.push(`Speech: practice ${weakPhonemes[0].label}`);
  } else if (latestDecision?.recommendation?.title) {
    timelineLabels.push(latestDecision.recommendation.title);
  } else if (summary && summary.touchedNodes > 0) {
    timelineLabels.push("Speech practice");
  }
  return {
    knowledgeSummary: summary,
    weakPhonemes,
    recommendations,
    latestDecision,
    timelineLabels,
  };
}

/** Test helper */
export function __resetSpeechCoachLearningAdapterForTests(): void {
  lastDecisionByChild.clear();
}
