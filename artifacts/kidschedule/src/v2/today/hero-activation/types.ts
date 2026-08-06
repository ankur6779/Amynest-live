/**
 * Today Hero Activation Gate.
 * Architecture Freeze v1.0 · Sprint A9.4.
 *
 * Brain may control Mission Hero card ONLY.
 * Coach / Ask Amy / Premium / For Child stay Legacy.
 */

import type { BrainValidationStatus } from "@/v2/brain-validation/types";
import type { TodayRecommendation } from "@/v2/today/recommendation-adapter/types";
import type { TodayRenderableRecommendation } from "@/v2/today/recommendation-resolver/types";

export const AMY_TODAY_HERO_ACTIVATION_VERSION =
  "amy_today_hero_activation.v1" as const;

export type TodayHeroSource = "brain" | "legacy";

export type TodayHeroActivationReason =
  | "BRAIN_HERO_ACTIVE"
  | "FLAG_OFF"
  | "FORCE_LEGACY"
  | "VALIDATION_NOT_MATCH"
  | "RESOLVER_FAILURE"
  | "HERO_NOT_MISSION"
  | "MISSING_INPUT";

export type TodayHeroActivationInput = Readonly<{
  recommendation: TodayRecommendation | null;
  renderable: TodayRenderableRecommendation | null;
  /** From BrainValidationReport.status — must be MATCH to activate. */
  validationStatus: BrainValidationStatus | "UNAVAILABLE" | null;
}>;

export type TodayHeroActivationResult = Readonly<{
  active: boolean;
  source: TodayHeroSource;
  /** Always mission card id when active; otherwise null. */
  heroCardId: string | null;
  reason: TodayHeroActivationReason;
  activationVersion: typeof AMY_TODAY_HERO_ACTIVATION_VERSION;
  generatedAt: string;
}>;

export type TodayHeroActivationOptions = Readonly<{
  now?: Date;
  enabled?: boolean;
  recordHealth?: boolean;
}>;

export type TodayActivationHealth = Readonly<{
  brainHeroActivations: number;
  legacyFallbacks: number;
  resolverFailures: number;
  validationFailures: number;
  activationVersion: typeof AMY_TODAY_HERO_ACTIVATION_VERSION;
}>;
