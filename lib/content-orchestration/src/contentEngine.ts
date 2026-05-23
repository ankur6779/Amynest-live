import { DEFAULT_ANTI_REPETITION } from "./config/global-defaults.js";
import { difficultyFitScore } from "./adaptiveEngine.js";
import { seededShuffle } from "./utils/seededShuffle.js";
import type {
  AntiRepetitionConfig,
  ContentHistoryEntry,
  ContentPool,
  ContentSelectionContext,
  DifficultyLevel,
  PoolContentItem,
  SelectedContent,
  VariationFlag,
} from "./types.js";
import type {
  ContentRankingWeights,
  LearningProfile,
  RankedContentItem,
} from "./types-v2.js";
import {
  computeGoalAlignmentScore,
  DEFAULT_GOAL_ALIGNMENT_WEIGHT,
} from "./ml/learningPathEngine.js";
import type { LearningPath, PersonalityProfile } from "./ml/types-personality.js";
import type { GlobalPlanContext } from "./ml/types-global.js";
import { computeGlobalContentBoost, pickExplorationRandomFromGlobal } from "./ml/globalContentBoost.js";
import { getGlobalGraph } from "./ml/globalGraphEngine.js";

function daysBetween(isoA: string, isoB: Date): number {
  const a = new Date(isoA).getTime();
  const b = isoB.getTime();
  return Math.floor(Math.abs(b - a) / (1000 * 60 * 60 * 24));
}

function flattenPool(pool: ContentPool[]): PoolContentItem[] {
  const seen = new Set<string>();
  const items: PoolContentItem[] = [];
  for (const p of pool) {
    for (const item of p.contentVariants) {
      if (!seen.has(item.contentId)) {
        seen.add(item.contentId);
        items.push(item);
      }
    }
  }
  return items;
}

function historyMap(history: ContentHistoryEntry[]) {
  return new Map(history.map((h) => [h.contentId, h]));
}

function isRecentlySeen(
  entry: ContentHistoryEntry | undefined,
  ref: Date,
  config: AntiRepetitionConfig,
): boolean {
  if (!entry) return false;
  const days = daysBetween(entry.lastSeenAt, ref);
  return days <= config.recentWindowDaysMax;
}

function shouldExclude(
  entry: ContentHistoryEntry | undefined,
  ref: Date,
  config: AntiRepetitionConfig,
): boolean {
  if (!entry) return false;
  if (isRecentlySeen(entry, ref, config)) return true;
  if (entry.seenCount >= config.maxSeenCountBeforeExclude) return true;
  return false;
}

function pickVariationFlags(
  entry: ContentHistoryEntry | undefined,
  item: PoolContentItem,
  allowReuse: boolean,
): VariationFlag[] {
  if (!entry || !allowReuse) return [];
  const flags: VariationFlag[] = [];
  if (item.variants.some((v) => v.speed === "slow")) flags.push("speed_slow");
  else if (item.variants.some((v) => v.speed === "fast")) flags.push("speed_fast");
  if (item.variants.some((v) => v.voiceId)) flags.push("voice_alt");
  if (entry.seenCount >= 2) flags.push("order_shuffled");
  return flags;
}

export type ScoredItem = {
  item: PoolContentItem;
  score: number;
  entry?: ContentHistoryEntry;
};

export function scoreContentItems(
  items: PoolContentItem[],
  history: ContentHistoryEntry[],
  ref: Date,
  config: AntiRepetitionConfig = DEFAULT_ANTI_REPETITION,
): ScoredItem[] {
  const map = historyMap(history);
  return items.map((item) => {
    const entry = map.get(item.contentId);
    let score = item.engagementWeight;

    if (!entry) {
      score += 100;
    } else {
      score -= entry.seenCount * 15;
      if (entry.engagementScore !== undefined) {
        score += entry.engagementScore * 0.5;
      }
      if (shouldExclude(entry, ref, config)) {
        score -= 200;
      }
    }

    return { item, score, entry };
  });
}

export function selectContent(ctx: ContentSelectionContext): SelectedContent[] {
  const ref = ctx.referenceDate ?? new Date();
  const config = ctx.antiRepetition;
  const items = flattenPool(ctx.pool);
  const allowReuse = ctx.allowReuseWithVariation ?? true;

  if (items.length === 0) return [];

  const scored = scoreContentItems(items, ctx.history, ref, config);
  const available = scored.filter((s) => !shouldExclude(s.entry, ref, config));
  const pool = available.length >= ctx.count ? available : scored;

  const sorted = [...pool].sort((a, b) => b.score - a.score);
  const seed = ctx.childId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const shuffled = seededShuffle(sorted, seed + ctx.moduleId.length);

  const newTarget = Math.ceil(ctx.count * config.newContentRatio);
  const neverSeen = shuffled.filter((s) => !s.entry);
  const lowSeen = shuffled.filter((s) => s.entry && s.entry.seenCount <= 1);
  const rest = shuffled.filter((s) => s.entry && s.entry.seenCount > 1);

  const picked: ScoredItem[] = [];
  const used = new Set<string>();

  const takeFrom = (list: ScoredItem[], max: number) => {
    for (const s of list) {
      if (picked.length >= ctx.count) break;
      if (used.has(s.item.contentId)) continue;
      picked.push(s);
      used.add(s.item.contentId);
      if (picked.filter((p) => !p.entry).length >= max && max > 0) break;
    }
  };

  takeFrom(neverSeen, newTarget);
  takeFrom(lowSeen, ctx.count);
  takeFrom(rest, ctx.count);

  for (const s of shuffled) {
    if (picked.length >= ctx.count) break;
    if (!used.has(s.item.contentId)) {
      picked.push(s);
      used.add(s.item.contentId);
    }
  }

  return picked.slice(0, ctx.count).map((s) => ({
    contentId: s.item.contentId,
    moduleId: ctx.moduleId,
    isNew: !s.entry,
    seenCount: s.entry?.seenCount ?? 0,
    variationFlags: pickVariationFlags(s.entry, s.item, allowReuse),
    engagementWeight: s.item.engagementWeight,
  }));
}

export function recordContentView(
  history: ContentHistoryEntry[],
  entry: Omit<ContentHistoryEntry, "seenCount"> & { seenCount?: number },
): ContentHistoryEntry[] {
  const idx = history.findIndex(
    (h) => h.contentId === entry.contentId && h.moduleId === entry.moduleId,
  );
  if (idx >= 0) {
    const existing = history[idx]!;
    const updated: ContentHistoryEntry = {
      ...existing,
      lastSeenAt: entry.lastSeenAt,
      seenCount: (entry.seenCount ?? existing.seenCount) + 1,
      completionStatus: entry.completionStatus,
      engagementScore: entry.engagementScore ?? existing.engagementScore,
    };
    return [...history.slice(0, idx), updated, ...history.slice(idx + 1)];
  }
  return [
    ...history,
    {
      ...entry,
      seenCount: entry.seenCount ?? 1,
    },
  ];
}

export const DEFAULT_RANKING_WEIGHTS: ContentRankingWeights = {
  noveltyWeight: 0.35,
  difficultyMatchWeight: 0.3,
  engagementWeight: 0.25,
  explorationWeight: 0.1,
};

/** freshnessScore = daysSinceLastSeen * A - seenCount * B */
export function computeFreshnessScore(
  entry: ContentHistoryEntry | undefined,
  ref: Date,
  repetitionTolerance = 0.5,
): number {
  const A = 2 + repetitionTolerance * 2;
  const B = 8 - repetitionTolerance * 4;
  if (!entry) return 50;
  const days = daysBetween(entry.lastSeenAt, ref);
  return Math.max(0, days * A - entry.seenCount * B);
}

export type ContentScoreContext = {
  learningPath?: LearningPath;
  personality?: PersonalityProfile;
  goalAlignmentWeight?: number;
  modulePriorityBoost?: Partial<Record<import("./types.js").ModuleId, number>>;
  /** V9: anonymous global success boost (child-first; small weight). */
  globalPlan?: GlobalPlanContext;
};

export function computeContentScore(
  item: PoolContentItem,
  entry: ContentHistoryEntry | undefined,
  ref: Date,
  targetDifficulty: DifficultyLevel,
  weights: ContentRankingWeights,
  profile: LearningProfile,
  explorationRandom: number,
  scoreCtx: ContentScoreContext = {},
  moduleId?: import("./types.js").ModuleId,
): number {
  const freshness = computeFreshnessScore(
    entry,
    ref,
    profile.adaptability.repetitionTolerance,
  );
  const freshnessNorm = Math.min(1, freshness / 50);
  const difficultyFit = difficultyFitScore(item.difficultyLevel, targetDifficulty);
  const pastPerf =
    entry?.engagementScore !== undefined
      ? entry.engagementScore / 100
      : item.engagementWeight / 100;

  const noveltyBoost = entry ? 0 : 1;
  const noveltyComponent =
    noveltyBoost * 0.6 + freshnessNorm * 0.4 + profile.adaptability.noveltyPreference * 0.2;

  let score =
    weights.noveltyWeight * noveltyComponent +
    weights.difficultyMatchWeight * difficultyFit +
    weights.engagementWeight * pastPerf +
    weights.explorationWeight * explorationRandom;

  if (scoreCtx.learningPath && moduleId) {
    const align = computeGoalAlignmentScore(moduleId, scoreCtx.learningPath);
    const goalW = scoreCtx.goalAlignmentWeight ?? DEFAULT_GOAL_ALIGNMENT_WEIGHT;
    score += goalW * align;
  }

  if (scoreCtx.personality?.traits.curiosity && !entry) {
    score += scoreCtx.personality.traits.curiosity * 0.06;
  }

  if (moduleId && scoreCtx.modulePriorityBoost?.[moduleId]) {
    score += scoreCtx.modulePriorityBoost[moduleId]! * 0.08;
  }

  if (scoreCtx.globalPlan) {
    const graph = getGlobalGraph();
    const w = scoreCtx.globalPlan.globalSuccessWeight;
    score += computeGlobalContentBoost(item, graph, scoreCtx.globalPlan, w);
  }

  return score;
}

export function rankContent(
  items: PoolContentItem[],
  history: ContentHistoryEntry[],
  ref: Date,
  targetDifficulty: DifficultyLevel,
  profile: LearningProfile,
  moduleId: import("./types.js").ModuleId,
  explorationRandom: number,
  weights: ContentRankingWeights = DEFAULT_RANKING_WEIGHTS,
  scoreCtx: ContentScoreContext = {},
): RankedContentItem[] {
  const map = historyMap(history);
  const ranked = items.map((item) => {
    const entry = map.get(item.contentId);
    const contentScore = computeContentScore(
      item,
      entry,
      ref,
      targetDifficulty,
      weights,
      profile,
      explorationRandom,
      scoreCtx,
      moduleId,
    );
    return {
      contentId: item.contentId,
      moduleId,
      contentScore,
      freshnessScore: computeFreshnessScore(
        entry,
        ref,
        profile.adaptability.repetitionTolerance,
      ),
      difficultyFit: difficultyFitScore(item.difficultyLevel, targetDifficulty),
      isNew: !entry,
      seenCount: entry?.seenCount ?? 0,
      difficultyLevel: item.difficultyLevel,
      variationFlags: pickVariationFlags(entry, item, true),
    };
  });
  return ranked.sort((a, b) => b.contentScore - a.contentScore);
}

/** Pick top N with template + module diversity (soft filtering, not hard exclude). */
export function pickRankedWithDiversity(
  ranked: RankedContentItem[],
  count: number,
  seed: number,
  recentContentIds: Set<string>,
): RankedContentItem[] {
  const shuffled = seededShuffle(ranked, seed);
  const picked: RankedContentItem[] = [];
  const usedTemplates = new Set<string>();

  for (const item of shuffled) {
    if (picked.length >= count) break;
    const templateKey = item.contentId.split("_").slice(0, 3).join("_");
    if (usedTemplates.has(templateKey) && picked.length < count - 1) continue;
    if (
      recentContentIds.has(item.contentId) &&
      item.seenCount >= 3 &&
      picked.length < count - 1
    ) {
      continue;
    }
    picked.push(item);
    usedTemplates.add(templateKey);
  }

  if (picked.length < count) {
    for (const item of shuffled) {
      if (picked.length >= count) break;
      if (!picked.some((p) => p.contentId === item.contentId)) {
        picked.push(item);
      }
    }
  }

  return picked.slice(0, count);
}

export type RankedSelectionContext = ContentSelectionContext & {
  profile: LearningProfile;
  targetDifficulty: DifficultyLevel;
  explorationMode: boolean;
  weights?: ContentRankingWeights;
  globalPlan?: GlobalPlanContext;
};

/** V2: score-based selection (replaces hard exclusion as primary path). */
export function selectContentRanked(ctx: RankedSelectionContext): SelectedContent[] {
  const ref = ctx.referenceDate ?? new Date();
  const items = flattenPool(ctx.pool);
  if (items.length === 0) return [];

  let explorationRandom = ctx.explorationMode ? 0.85 + Math.random() * 0.15 : Math.random() * 0.4;
  if (ctx.explorationMode && ctx.globalPlan) {
    explorationRandom = pickExplorationRandomFromGlobal(
      items,
      getGlobalGraph(),
      ctx.globalPlan,
      explorationRandom,
    );
  }
  const ranked = rankContent(
    items,
    ctx.history,
    ref,
    ctx.targetDifficulty,
    ctx.profile,
    ctx.moduleId,
    explorationRandom,
    ctx.weights,
    ctx.globalPlan ? { globalPlan: ctx.globalPlan } : undefined,
  );

  const recentIds = new Set(
    ctx.history
      .filter((h) => {
        const days = daysBetween(h.lastSeenAt, ref);
        return days <= 3;
      })
      .map((h) => h.contentId),
  );

  const seed =
    ctx.childId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + ctx.moduleId.length;
  const picked = pickRankedWithDiversity(ranked, ctx.count, seed, recentIds);

  return picked.map((r) => ({
    contentId: r.contentId,
    moduleId: r.moduleId,
    isNew: r.isNew,
    seenCount: r.seenCount,
    variationFlags: r.variationFlags,
    engagementWeight: r.contentScore * 100,
  }));
}

export function shouldTriggerExploration(
  profile: LearningProfile,
  countryExplorationBias: number,
  experimentRate: number,
  seed: number,
): boolean {
  const base =
    countryExplorationBias * 0.5 +
    profile.adaptability.noveltyPreference * 0.35 +
    experimentRate * 0.15;
  return seed % 100 < base * 100;
}

export function isPoolExhausted(
  pool: ContentPool[],
  history: ContentHistoryEntry[],
  ref: Date,
  config: AntiRepetitionConfig = DEFAULT_ANTI_REPETITION,
): boolean {
  const items = flattenPool(pool);
  const map = historyMap(history);
  const fresh = items.filter((i) => !shouldExclude(map.get(i.contentId), ref, config));
  return fresh.length === 0;
}
