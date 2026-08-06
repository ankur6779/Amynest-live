/**
 * Shared Experience Resolver.
 * Architecture Freeze v1.0 · Sprint A10.1.
 *
 * Surface-independent ResolvedExperience objects only.
 * Never UI. Never rendering. Never routing.
 */

import type {
  ExperienceAvailability,
  ExperiencePremiumState,
  ExperienceType,
} from "./catalog";

export const AMY_EXPERIENCE_RESOLVER_VERSION =
  "amy_experience_resolver.v1" as const;

export type ResolvedExperience = Readonly<{
  experienceId: string;
  experienceType: ExperienceType;
  /** Lower = higher priority (1 hero, 2 secondary, 3 passive). */
  priority: number;
  resolvedContentId: string | null;
  recommendedJourney: string;
  recommendedToolIds: ReadonlyArray<string>;
  recommendedFeatureIds: ReadonlyArray<string>;
  recommendedRouteIds: ReadonlyArray<string>;
  availability: ExperienceAvailability;
  premiumState: ExperiencePremiumState;
  resolverVersion: typeof AMY_EXPERIENCE_RESOLVER_VERSION;
  generatedAt: string;
  /** True when experienceId is not in the shared catalog. */
  unknown: boolean;
  /** True when catalog entry lacks a content id. */
  missingContent: boolean;
}>;

export type ResolveExperienceInput = Readonly<{
  experienceId: string;
  /** Default 0 when unspecified. */
  priority?: number;
  /** Optional overrides from Decision / Bridge. */
  recommendedJourney?: string | null;
  recommendedToolIds?: ReadonlyArray<string>;
  recommendedFeatureIds?: ReadonlyArray<string>;
  recommendedRouteIds?: ReadonlyArray<string>;
  availability?: ExperienceAvailability;
  premiumState?: ExperiencePremiumState;
}>;

export type ResolveExperienceOptions = Readonly<{
  now?: Date;
  /** Count toward health (default true). */
  recordHealth?: boolean;
}>;

export type ResolvedExperienceValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type ResolvedExperienceValidationResult = Readonly<{
  ok: boolean;
  issues: ReadonlyArray<ResolvedExperienceValidationIssue>;
}>;

export type ResolvedExperienceDiffEntry = Readonly<{
  path: string;
  before: unknown;
  after: unknown;
}>;

export type ExperienceResolverHealth = Readonly<{
  resolvedExperiences: number;
  missingContent: number;
  unknownExperience: number;
  resolverVersion: typeof AMY_EXPERIENCE_RESOLVER_VERSION;
}>;

export type {
  ExperienceAvailability,
  ExperiencePremiumState,
  ExperienceType,
};
