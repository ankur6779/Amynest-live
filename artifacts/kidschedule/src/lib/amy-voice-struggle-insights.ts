/**
 * Struggle phrase insights — categorize issues and feed static/teaching improvements.
 */

import type { StrugglePhraseEntry } from "@/lib/amy-voice-analytics";
import { getTopStrugglePhrases } from "@/lib/amy-voice-analytics";
import { queueAmyVoiceLearning } from "@/lib/amy-voice-learning";

export type StruggleIssueCategory = "phonics" | "clarity" | "content";

export type StruggleImprovementAction =
  | "static_generation"
  | "teaching_simplify"
  | "teaching_pacing"
  | "content_review";

/** Product iteration actions mapped from struggle categories. */
export type ProductIterationAction =
  | "improve_sound_mapping"
  | "adjust_delivery"
  | "update_lesson_material"
  | "generate_static_audio";

export type ProductIterationItem = {
  phraseKey: string;
  text: string;
  category: StruggleIssueCategory;
  primaryAction: ProductIterationAction;
  secondaryActions: ProductIterationAction[];
  priority: number;
  pipelineStage: "insights" | "queued";
  reason: string;
};

export type ProductIterationPipeline = {
  generatedAt: number;
  items: ProductIterationItem[];
  byAction: Record<ProductIterationAction, number>;
};

export type CategorizedStrugglePhrase = StrugglePhraseEntry & {
  category: StruggleIssueCategory;
  actions: StruggleImprovementAction[];
  productAction: ProductIterationAction;
};

export type WeeklyStruggleReview = {
  generatedAt: number;
  windowDays: number;
  totalPhrases: number;
  byCategory: Record<StruggleIssueCategory, number>;
  topPhrases: CategorizedStrugglePhrase[];
  recommendedActions: StruggleImprovementAction[];
  productPipeline: ProductIterationPipeline;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
let lastInsightFlushAt = 0;
const INSIGHT_FLUSH_INTERVAL_MS = 15 * 60 * 1000;

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function categorizeStrugglePhrase(entry: StrugglePhraseEntry): StruggleIssueCategory {
  if (
    entry.speechMode === "phonics" ||
    entry.speechMode === "spelling" ||
    entry.pipelineMode === "phonics"
  ) {
    return "phonics";
  }

  if (entry.fallbackEvents > 0 || entry.misses > entry.replays) {
    return "clarity";
  }

  if (
    wordCount(entry.text) >= 8 ||
    entry.speechMode === "speech_coach" ||
    entry.speechMode === "mixed"
  ) {
    return "content";
  }

  if (entry.speechMode === "math" || entry.speechMode === "number") {
    return "content";
  }

  return "clarity";
}

export function mapCategoryToProductAction(
  category: StruggleIssueCategory,
): ProductIterationAction {
  switch (category) {
    case "phonics":
      return "improve_sound_mapping";
    case "clarity":
      return "adjust_delivery";
    default:
      return "update_lesson_material";
  }
}

export function buildStruggleImprovementActions(
  entry: StrugglePhraseEntry,
  category = categorizeStrugglePhrase(entry),
): StruggleImprovementAction[] {
  const actions = new Set<StruggleImprovementAction>();

  if (category === "phonics") {
    actions.add("static_generation");
    actions.add("teaching_pacing");
  } else if (category === "clarity") {
    actions.add("static_generation");
    actions.add("teaching_simplify");
  } else {
    actions.add("content_review");
    actions.add("teaching_simplify");
    if (entry.replays >= 2) actions.add("teaching_pacing");
  }

  if (entry.fallbackEvents > 0) actions.add("static_generation");
  if (entry.strugglingEvents >= 2) actions.add("teaching_pacing");

  return [...actions];
}

export function buildProductIterationPipeline(
  phrases: CategorizedStrugglePhrase[],
  now = Date.now(),
): ProductIterationPipeline {
  const items: ProductIterationItem[] = phrases.slice(0, 10).map((phrase) => {
    const primaryAction = mapCategoryToProductAction(phrase.category);
    const secondaryActions: ProductIterationAction[] = ["generate_static_audio"];
    if (phrase.actions.includes("teaching_simplify")) secondaryActions.push("adjust_delivery");
    if (phrase.actions.includes("teaching_pacing")) secondaryActions.push("adjust_delivery");
    if (phrase.actions.includes("content_review")) secondaryActions.push("update_lesson_material");

    return {
      phraseKey: phrase.key,
      text: phrase.text,
      category: phrase.category,
      primaryAction,
      secondaryActions: [...new Set(secondaryActions)],
      priority: phrase.score + phrase.staticAudioPriority,
      pipelineStage: "insights",
      reason: `Top ${phrase.category} struggle phrase`,
    };
  });

  const byAction: Record<ProductIterationAction, number> = {
    improve_sound_mapping: 0,
    adjust_delivery: 0,
    update_lesson_material: 0,
    generate_static_audio: 0,
  };
  for (const item of items) {
    byAction[item.primaryAction] += 1;
    for (const action of item.secondaryActions) {
      byAction[action] += 1;
    }
  }

  return { generatedAt: now, items, byAction };
}

/** Queue static audio and mark pipeline items for phonics/clarity hits. */
export function flushProductIterationPipeline(
  pipeline: ProductIterationPipeline,
): ProductIterationPipeline {
  const items = pipeline.items.map((item) => {
    if (
      item.primaryAction !== "improve_sound_mapping" &&
      item.primaryAction !== "adjust_delivery" &&
      !item.secondaryActions.includes("generate_static_audio")
    ) {
      return item;
    }
    if (item.priority < 20) return item;

    queueAmyVoiceLearning(
      item.text,
      item.category === "phonics" ? "phonics" : "default",
      item.category === "phonics" ? "phonics" : item.category === "content" ? "speech_coach" : "word",
      `product_${item.primaryAction}`,
    );
    return { ...item, pipelineStage: "queued" as const };
  });

  return { ...pipeline, items };
}

export function buildWeeklyStruggleReview(now = Date.now()): WeeklyStruggleReview {
  const phrases = getTopStrugglePhrases(30)
    .filter((entry) => now - entry.lastSeenAt <= WEEK_MS)
    .map((entry) => {
      const category = categorizeStrugglePhrase(entry);
      return {
        ...entry,
        category,
        actions: buildStruggleImprovementActions(entry, category),
        productAction: mapCategoryToProductAction(category),
      };
    });

  const byCategory: Record<StruggleIssueCategory, number> = {
    phonics: 0,
    clarity: 0,
    content: 0,
  };
  const actionCounts = new Map<StruggleImprovementAction, number>();

  for (const phrase of phrases) {
    byCategory[phrase.category] += 1;
    for (const action of phrase.actions) {
      actionCounts.set(action, (actionCounts.get(action) ?? 0) + 1);
    }
  }

  const recommendedActions = [...actionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([action]) => action);

  const productPipeline = buildProductIterationPipeline(phrases, now);

  return {
    generatedAt: now,
    windowDays: 7,
    totalPhrases: phrases.length,
    byCategory,
    topPhrases: phrases.slice(0, 10),
    recommendedActions,
    productPipeline,
  };
}

/** Queue static generation for high-impact phonics/clarity struggle phrases. */
export function applyStruggleInsightActions(review: WeeklyStruggleReview): number {
  let queued = 0;
  for (const phrase of review.topPhrases.slice(0, 5)) {
    if (!phrase.actions.includes("static_generation")) continue;
    if (phrase.category !== "phonics" && phrase.category !== "clarity") continue;
    if (phrase.score < 8) continue;

    queueAmyVoiceLearning(
      phrase.text,
      phrase.pipelineMode,
      phrase.speechMode,
      `struggle_${phrase.category}`,
    );
    queued += 1;
  }
  return queued;
}

/** Periodic flush — feeds insights back into static generation without spamming. */
export function maybeFlushStruggleInsights(now = Date.now()): WeeklyStruggleReview | null {
  if (now - lastInsightFlushAt < INSIGHT_FLUSH_INTERVAL_MS) return null;
  lastInsightFlushAt = now;

  const review = buildWeeklyStruggleReview(now);
  if (review.topPhrases.length === 0) return review;

  applyStruggleInsightActions(review);
  const piped = flushProductIterationPipeline(review.productPipeline);
  if (import.meta.env.DEV) {
    console.info("[AMY VOICE]", "weekly_struggle_review", {
      total: review.totalPhrases,
      byCategory: review.byCategory,
      recommendedActions: review.recommendedActions,
      productPipeline: piped.byAction,
    });
  }
  return { ...review, productPipeline: piped };
}

export function resetAmyVoiceStruggleInsightsSession(): void {
  lastInsightFlushAt = 0;
}
