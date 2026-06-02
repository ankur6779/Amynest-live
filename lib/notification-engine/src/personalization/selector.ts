import type { ContentContext, PoolContentItem } from "../types.js";
import { filterPoolForContext, renderPoolItem } from "../content-pools/pools.js";
import { checkAntiRepetition, hasSimilarRecentBody } from "../memory/anti-repetition.js";
import { scoreCandidate, shouldSkipForFatigue } from "../scoring/quality-scorer.js";
import { scoreBusinessImpact } from "../outcomes/business-impact-scorer.js";
import type { OutcomeContext } from "../outcomes/types.js";
import { BUSINESS_IMPACT_THRESHOLD } from "../constants.js";
import { contentHash } from "../personalization/context.js";
import type { UserContentHistory } from "../types.js";
import type { BusinessImpactScores } from "../outcomes/types.js";
import { enhanceWithAiCopy } from "../ai/content-generator.js";
import { passesCulturalQualityGate } from "../global/cultural-quality.js";
import { localizeNotificationCopy } from "../global/i18n/messages.js";
import { weatherActivityHint } from "../global/weather.js";
import { coachifyCopy } from "../outcomes/coach-copy.js";

export interface SelectionResult {
  item: PoolContentItem;
  title: string;
  body: string;
  scores: ReturnType<typeof scoreCandidate>;
  businessImpact: BusinessImpactScores;
}

/**
 * Pick the highest-scoring eligible item from the pool.
 * Evaluates up to `maxCandidates` shuffled items for performance.
 */
export function selectBestContent(
  pool: PoolContentItem[],
  ctx: ContentContext,
  history: UserContentHistory,
  options: { maxCandidates?: number; seed?: number; useAi?: boolean; outcomeContext?: OutcomeContext } = {},
): SelectionResult | null {
  const maxCandidates = options.maxCandidates ?? 48;
  const seed = options.seed ?? deterministicSeed(ctx);

  const filtered = filterPoolForContext(pool, ctx);
  if (filtered.length === 0) return null;

  if (
    shouldSkipForFatigue(
      history.fatigue,
      false,
      pseudoRandom(seed, ctx.category),
    )
  ) {
    const highValue = filtered.filter((i) => i.highValue);
    if (highValue.length === 0) return null;
  }

  const shuffled = shuffleDeterministic(filtered, seed);
  const slice = shuffled.slice(0, maxCandidates);

  let best: SelectionResult | null = null;

  for (const item of slice) {
    if (history.fatigue.highValueOnly && !item.highValue) continue;

    let { title, body } = renderPoolItem(item, ctx);

    if (options.useAi !== false) {
      const enhanced = enhanceWithAiCopy({
        ctx,
        title,
        body,
        contentType: item.contentType,
        topicKey: item.topicKey,
      });
      title = enhanced.title;
      body = enhanced.body;
    }

    const foodMatch = /(?:Try |)([^—]+?)(?: for | —)/i.exec(body);
    const localized = localizeNotificationCopy({
      locale: ctx.locale,
      category: ctx.category,
      title,
      body,
      childName: ctx.childName,
      foodLabel: foodMatch?.[1]?.trim(),
    });
    title = localized.title;
    body = localized.body;

    const weatherHint = weatherActivityHint(ctx.weather);
    if (weatherHint && ctx.category === "learning_activity") {
      body = `${body} ${weatherHint}`;
    }

    if (!passesCulturalQualityGate(title, body, ctx.culturalRegion, item)) continue;

    const violation = checkAntiRepetition(
      {
        title,
        body,
        recommendationKey: item.recommendationKey,
        topicKey: item.topicKey,
        theme: item.theme,
        category: ctx.category,
      },
      history.entries,
      ctx.localDate,
    );
    if (violation) continue;

    if (hasSimilarRecentBody(body, history.entries)) continue;

    const scores = scoreCandidate(
      ctx,
      {
        title,
        body,
        topicKey: item.topicKey,
        theme: item.theme,
        contentType: item.contentType,
        highValue: item.highValue,
      },
      history.entries,
    );

    const outcomeCtx = options.outcomeContext;
    const businessImpact = outcomeCtx
      ? scoreBusinessImpact(
          ctx,
          {
            title,
            body,
            topicKey: item.topicKey,
            contentType: item.contentType,
            highValue: item.highValue,
          },
          outcomeCtx,
          history.entries,
        )
      : {
          routineCompletionProb: scores.relevance,
          learningCompletionProb: scores.relevance,
          retentionProb: scores.engagementPrediction,
          subscriptionProb: 30,
          engagementProb: scores.engagementPrediction,
          composite: scores.composite,
        };

    if (outcomeCtx?.experimentVariant === "coach") {
      const coached = coachifyCopy({
        title,
        body,
        childName: ctx.childName,
        goal: outcomeCtx.goal,
        signals: outcomeCtx.signals,
      });
      title = coached.title;
      body = coached.body;
    }

    const impactScore = businessImpact.composite;
    if (impactScore < BUSINESS_IMPACT_THRESHOLD) continue;

    if (!best || impactScore > best.businessImpact.composite) {
      best = { item, title, body, scores, businessImpact };
    }
  }

  return best;
}

function deterministicSeed(ctx: ContentContext): number {
  let h = 0;
  const s = `${ctx.userId}:${ctx.localDate}:${ctx.category}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pseudoRandom(seed: number, salt: string): number {
  let h = seed;
  for (let i = 0; i < salt.length; i++) h = (h * 31 + salt.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

function shuffleDeterministic<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function buildDedupKey(category: string, localDate: string, recommendationKey: string): string {
  return `${category}:${localDate}:${contentHash(recommendationKey, category)}`;
}
