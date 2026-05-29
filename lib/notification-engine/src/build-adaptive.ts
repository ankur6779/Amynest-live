import type { NotificationCategory } from "@workspace/db";
import type { AdaptiveBuildResult, UserContentHistory } from "./types.js";
import { buildContentContext, contentHash } from "./personalization/context.js";
import { getContentPool } from "./content-pools/pools.js";
import { buildDedupKey, selectBestContent } from "./personalization/selector.js";
import { HIGH_VALUE_CATEGORIES } from "./types.js";
import type { OutcomeContext } from "./outcomes/types.js";
import { buildOutcomeContextForCategory } from "./outcomes/strategy.js";
import type { OutcomeSignals } from "./outcomes/types.js";

export interface AdaptiveBuildInput {
  userId: string;
  category: NotificationCategory;
  timezone: string;
  locale?: string | null;
  countryCode?: string | null;
  allergies?: string[];
  child: {
    id: number;
    name: string;
    age: number;
    ageMonths: number;
    foodType: string;
  };
  history: UserContentHistory;
  now?: Date;
  outcomeSignals?: OutcomeSignals;
  outcomeContext?: OutcomeContext;
}

/**
 * Build adaptive notification content for pool-backed categories.
 * Returns null when no candidate passes quality + anti-repetition gates.
 */
export function buildAdaptiveNotification(input: AdaptiveBuildInput): AdaptiveBuildResult | null {
  const pool = getContentPool(input.category);
  if (pool.length === 0) return null;

  const ctx = buildContentContext({
    userId: input.userId,
    childId: input.child.id,
    childName: input.child.name,
    age: input.child.age,
    ageMonths: input.child.ageMonths,
    foodType: input.child.foodType,
    timezone: input.timezone,
    category: input.category,
    engagementScore: input.history.engagementScore,
    locale: input.locale,
    countryCode: input.countryCode,
    allergies: input.allergies,
    now: input.now,
  });

  if (
    input.history.fatigue.highValueOnly &&
    !HIGH_VALUE_CATEGORIES.has(input.category)
  ) {
    return null;
  }

  const outcomeContext =
    input.outcomeContext ??
    (input.outcomeSignals
      ? buildOutcomeContextForCategory(input.userId, input.category, input.outcomeSignals)
      : undefined);

  const selected = selectBestContent(pool, ctx, input.history, { outcomeContext });
  if (!selected) return null;

  const hash = contentHash(selected.title, selected.body);
  const impact = selected.businessImpact;

  return {
    notification: {
      title: selected.title,
      body: selected.body,
      deepLink: selected.item.deepLink,
      dedupKey: buildDedupKey(input.category, ctx.localDate, selected.item.recommendationKey),
      recommendationKey: selected.item.recommendationKey,
      topicKey: selected.item.topicKey,
      theme: selected.item.theme,
      contentType: selected.item.contentType,
      contentHash: hash,
      data: {
        childId: input.child.id,
        recommendationKey: selected.item.recommendationKey,
        topicKey: selected.item.topicKey,
        theme: selected.item.theme,
        contentType: selected.item.contentType,
        qualityScore: impact.composite,
        businessImpactScore: impact.composite,
        engine: "outcome-v3",
        locale: ctx.locale,
        countryCode: ctx.countryCode,
        culturalRegion: ctx.culturalRegion,
        rtl: ctx.rtl,
        goal: outcomeContext?.goal,
        childLifecycleStage: outcomeContext?.childLifecycleStage,
        experimentId: outcomeContext?.experimentId,
        experimentVariant: outcomeContext?.experimentVariant,
      },
    },
    scores: selected.scores,
    businessImpact: impact,
  };
}

/** Categories routed through the adaptive content engine. */
export const ADAPTIVE_CATEGORIES = new Set<NotificationCategory>([
  "nutrition",
  "parenting_tips",
  "learning_activity",
  "story_time",
  "engagement",
]);
