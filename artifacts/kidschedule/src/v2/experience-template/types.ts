/**
 * Experience Template Engine.
 * Architecture Freeze v1.0 · Sprint A10.3.
 *
 * Definitions → Factory → ResolvedExperiencePackage.
 * IDs only. No UI. No routing. No rendering.
 */

import type {
  ExperiencePremiumState,
  ExperienceType,
  ResolvedExperience,
} from "@/v2/experience-resolver/types";

export const AMY_EXPERIENCE_TEMPLATE_ENGINE_VERSION =
  "amy_experience_template_engine.v1" as const;

export const DEFAULT_EXPERIENCE_TEMPLATE_ID =
  "amy_experience_template.default.v1" as const;

export type ExperienceSurfaceId =
  | "today"
  | "amy_coach"
  | "ask_amy"
  | "for_child";

/** Surface binding — IDs only. No components. */
export type ExperienceSurfaceBinding = Readonly<{
  surfaceId: ExperienceSurfaceId;
  role: string;
  surfaceSlotId: string;
  bindingId: string;
}>;

export type ExperienceSurfaceBindings = Readonly<{
  today: ExperienceSurfaceBinding;
  amyCoach: ExperienceSurfaceBinding;
  askAmy: ExperienceSurfaceBinding;
  forChild: ExperienceSurfaceBinding;
}>;

/**
 * Reusable template shape future packs instantiate.
 */
export type ExperienceTemplate = Readonly<{
  templateId: typeof DEFAULT_EXPERIENCE_TEMPLATE_ID | string;
  templateVersion: typeof AMY_EXPERIENCE_TEMPLATE_ENGINE_VERSION;
  requiredSurfaces: ReadonlyArray<ExperienceSurfaceId>;
  /** Allowed experienceType values for this template. */
  allowedExperienceTypes: ReadonlyArray<ExperienceType>;
}>;

/**
 * Declarative experience — future packs are definitions, not handwritten packs.
 */
export type ExperienceDefinition = Readonly<{
  experienceId: string;
  experienceType: ExperienceType;
  contentId: string;
  journeyId: string;
  surfaceBindings: ExperienceSurfaceBindings;
  premiumState: ExperiencePremiumState;
  capabilities: ReadonlyArray<string>;
  metadata: Readonly<Record<string, string>>;
  version: string;
}>;

/**
 * Immutable package produced by the factory.
 */
export type ResolvedExperiencePackage = Readonly<{
  experienceId: string;
  experienceType: ExperienceType;
  contentId: string;
  journeyId: string;
  surfaceBindings: ExperienceSurfaceBindings;
  premiumState: ExperiencePremiumState;
  capabilities: ReadonlyArray<string>;
  metadata: Readonly<Record<string, string>>;
  version: string;
  resolved: ResolvedExperience;
  templateId: string;
  templateVersion: string;
  engineVersion: typeof AMY_EXPERIENCE_TEMPLATE_ENGINE_VERSION;
  generatedAt: string;
}>;

export type CreateExperienceOptions = Readonly<{
  now?: Date;
  priority?: number;
  templateId?: string;
  recordHealth?: boolean;
}>;

export type ExperienceDefinitionValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type ExperienceDefinitionValidationResult = Readonly<{
  ok: boolean;
  issues: ReadonlyArray<ExperienceDefinitionValidationIssue>;
}>;

export type ExperienceDefinitionDiffEntry = Readonly<{
  path: string;
  before: unknown;
  after: unknown;
}>;

export type ExperienceFactoryHealth = Readonly<{
  createdPackages: number;
  invalidDefinitions: number;
  unknownDefinitions: number;
  engineVersion: typeof AMY_EXPERIENCE_TEMPLATE_ENGINE_VERSION;
}>;
