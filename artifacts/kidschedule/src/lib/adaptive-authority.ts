/**
 * Canonical adaptive authority projector.
 *
 * Learning Runtime owns difficulty / hints / nextActivity / recommendations /
 * reviewQueue for product surfaces. LPE keeps XP, unlocks, wallet, skill graph.
 *
 * This module projects Runtime decisions into hub UI shapes — it does not invent
 * adaptivity.
 */

import type { AdaptiveRecommendation } from "@workspace/learning-progress-engine";
import type {
  DifficultyDecision,
  LearningDecision,
} from "@workspace/learning-runtime";
import { guidanceFromGameDecision } from "@/lib/games-world-learning-adapter";
import { guidanceFromReadingDecision } from "@/lib/reading-world-learning-adapter";
import { installLearningRuntimeBridge } from "@/lib/learning-runtime-bridge";
import { subscribeLearningDecision } from "@/lib/learning-decision-bus";

const lastByChild = new Map<string, LearningDecision>();
let installed = false;

function ensureCache(): void {
  if (installed) return;
  installed = true;
  installLearningRuntimeBridge();
  subscribeLearningDecision((d) => {
    lastByChild.set(String(d.childId), d);
  });
}

/**
 * Latest Runtime decision for a child — bus cache only.
 * World adapters may lag; this projector is the hub/product authority.
 */
export function getCanonicalLearningDecision(
  childId: number | string,
): LearningDecision | null {
  ensureCache();
  return lastByChild.get(String(childId)) ?? null;
}

function emojiForHref(href: string): string {
  if (href.includes("speech")) return "🗣️";
  if (href.includes("phonics") || href.includes("reading")) return "📖";
  if (href.includes("games")) return "🎮";
  if (href.includes("story") || href.includes("parenting-hub")) return "📚";
  if (href.includes("study")) return "✏️";
  return "✨";
}

/**
 * Hub "Amy recommends" chips — Runtime only.
 * Empty when no decision yet (do not fall back to LPE adaptive-routing).
 */
export function hubRecommendationsFromRuntime(
  childId: number | string,
): AdaptiveRecommendation[] {
  const decision = getCanonicalLearningDecision(childId);
  if (!decision) return [];

  const out: AdaptiveRecommendation[] = [];
  const seen = new Set<string>();

  const push = (rec: AdaptiveRecommendation) => {
    if (seen.has(rec.id)) return;
    seen.add(rec.id);
    out.push(rec);
  };

  if (decision.recommendation) {
    const href = decision.recommendation.href ?? "/parenting-hub";
    push({
      id: decision.recommendation.id || "runtime_rec",
      title: decision.recommendation.title,
      reason: decision.recommendation.reason,
      emoji: emojiForHref(href),
      href,
      priority: decision.recommendation.priority,
      skillId: decision.recommendation.skillId ?? undefined,
    });
  }

  if (decision.nextActivity) {
    const href = decision.nextActivity.href ?? "/parenting-hub";
    const label =
      decision.nextActivity.label ??
      decision.nextActivity.entityId ??
      "Continue learning";
    push({
      id: `runtime_next_${decision.nextActivity.kind}`,
      title: label,
      reason: decision.reason,
      emoji: emojiForHref(href),
      href,
      priority: "high",
      skillId: decision.nextActivity.skillId ?? undefined,
    });
  }

  for (const item of decision.reviewQueue.slice(0, 2)) {
    const concept = item.conceptId ?? item.entityId ?? item.skillId;
    if (!concept) continue;
    const href = concept.includes("phoneme") || concept.includes("speech")
      ? "/speech-coach"
      : concept.includes("story")
        ? "/parenting-hub#tile-story-hub"
        : concept.includes("game")
          ? "/games"
          : "/phonics";
    push({
      id: `runtime_review_${concept}`,
      title: `Review ${concept.replace(/^[^:]+:/, "").replace(/-/g, " ")}`,
      reason: item.reason,
      emoji: "🔄",
      href,
      priority: "medium",
      skillId: item.skillId,
    });
  }

  return out.slice(0, 5);
}

/** Map Runtime difficulty delta → presentation band (no local mastery). */
export function uiBandFromRuntimeDifficulty(
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

/** Preferred game ids from Runtime (catalog filter only). */
export function preferredGameIdsFromRuntime(childId: number | string): string[] {
  const decision = getCanonicalLearningDecision(childId);
  return guidanceFromGameDecision(childId, decision).preferredGameIds;
}

/** Preferred reading letters from Runtime. */
export function preferredReadingLettersFromRuntime(
  childId: number | string,
): string[] {
  const decision = getCanonicalLearningDecision(childId);
  return guidanceFromReadingDecision(childId, decision).recommendedLetters;
}

/** Test helper */
export function __resetAdaptiveAuthorityForTests(): void {
  lastByChild.clear();
  installed = false;
}
