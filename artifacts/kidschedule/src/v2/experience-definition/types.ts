/**
 * Shared ExperienceDefinition — pack-owned contract.
 * Speech, Sleep, and future experiences implement this interface.
 * Resolver consumes definitions; it never authors them.
 *
 * Machine-only. No UI. No prompts. No LLM output.
 */

import type {
  ExperiencePremiumState,
  ExperienceType,
} from "@/v2/experience-resolver/catalog";

/** Machine-only shared definition schema version. */
export const EXPERIENCE_DEFINITION_VERSION =
  "experience_definition.v1" as const;

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
 * Canonical Experience Definition.
 * Owned by Experience Packs. Consumed by Experience Resolver.
 */
export type ExperienceDefinition = Readonly<{
  /** Machine-only schema version for this interface. */
  definitionVersion: typeof EXPERIENCE_DEFINITION_VERSION;
  experienceId: string;
  experienceType: ExperienceType;
  contentId: string;
  journeyId: string;
  surfaceBindings: ExperienceSurfaceBindings;
  premiumState: ExperiencePremiumState;
  capabilities: ReadonlyArray<string>;
  metadata: Readonly<Record<string, string>>;
  /** Experience content/journey version (e.g. v1) — not definitionVersion. */
  version: string;
}>;
