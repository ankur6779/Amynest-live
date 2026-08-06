/**
 * Today Recommendation Resolver.
 * Architecture Freeze v1.0 · Sprint A9.3.
 *
 * Maps TodayRecommendation → TodayRenderableRecommendation (card identities only).
 * Never renders. Never imports React. Never executes CTAs. Never changes routing.
 */

import type { TodayRecommendation } from "@/v2/today/recommendation-adapter/types";

export const AMY_TODAY_RECOMMENDATION_RESOLVER_VERSION =
  "amy_today_recommendation_resolver.v1" as const;

/** Identity of the renderable contract — machine only. */
export const AMY_TODAY_RENDER_VERSION = "amy_today_render.v1" as const;

export type TodayRenderableRecommendation = Readonly<{
  heroCardId: string | null;
  secondaryCardIds: ReadonlyArray<string>;
  passiveCardIds: ReadonlyArray<string>;
  ctaIds: ReadonlyArray<string>;
  /** Ordered card ids: hero → secondary → passive (resolved only). */
  priority: ReadonlyArray<string>;
  renderVersion: typeof AMY_TODAY_RENDER_VERSION;
  resolverVersion: typeof AMY_TODAY_RECOMMENDATION_RESOLVER_VERSION;
  generatedAt: string;
  /** True when resolver fell back (flag off / legacy-only / unavailable). */
  legacyFallback: boolean;
  /** Experience ids that had no existing Today card. */
  missingCards: ReadonlyArray<string>;
}>;

export type ResolveTodayRecommendationOptions = Readonly<{
  now?: Date;
  /**
   * Force flag evaluation. Default reads env flag.
   * Tests may pass true while global flag stays OFF.
   */
  enabled?: boolean;
  /** Count toward health (default true). */
  recordHealth?: boolean;
}>;

export type RenderableRecommendationValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type RenderableRecommendationValidationResult = Readonly<{
  ok: boolean;
  issues: ReadonlyArray<RenderableRecommendationValidationIssue>;
}>;

export type RenderableRecommendationCompareStatus =
  | "MATCH"
  | "PARTIAL_MATCH"
  | "MISMATCH"
  | "UNKNOWN";

export type RenderableRecommendationCompareEntry = Readonly<{
  path: string;
  status: RenderableRecommendationCompareStatus;
  before: unknown;
  after: unknown;
}>;

export type TodayResolverHealth = Readonly<{
  resolvedCards: number;
  missingCards: number;
  legacyFallbacks: number;
  resolverVersion: typeof AMY_TODAY_RECOMMENDATION_RESOLVER_VERSION;
}>;

export type { TodayRecommendation };
