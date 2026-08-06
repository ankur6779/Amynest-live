/**
 * Experience Template Engine (Sprint A10.3).
 * Definitions → Factory → ResolvedExperiencePackage.
 * Future experiences = new definitions only.
 */

export {
  AMY_EXPERIENCE_TEMPLATE_ENGINE_VERSION,
  DEFAULT_EXPERIENCE_TEMPLATE_ID,
  type CreateExperienceOptions,
  type ExperienceDefinition,
  type ExperienceDefinitionDiffEntry,
  type ExperienceDefinitionValidationIssue,
  type ExperienceDefinitionValidationResult,
  type ExperienceFactoryHealth,
  type ExperienceSurfaceBinding,
  type ExperienceSurfaceBindings,
  type ExperienceSurfaceId,
  type ExperienceTemplate,
  type ResolvedExperiencePackage,
} from "./types";

export {
  DEFAULT_EXPERIENCE_TEMPLATE,
  clearExperienceTemplatesForTests,
  getExperienceTemplate,
  registerExperienceTemplate,
} from "./template";

export {
  clearExperienceRegistryForTests,
  getExperienceDefinition,
  getExperienceRegistry,
  registerExperienceDefinition,
} from "./registry";

export { createExperience } from "./factory";
export { validateExperienceDefinition } from "./validate";
export { compareExperienceDefinitions } from "./compare";
export { getExperienceFactoryHealth } from "./health";
export {
  clearExperienceFactoryStateForTests,
  getLastResolvedPackage,
} from "./health-state";
export { isAmyExperienceTemplateEngineEnabled } from "./flags";
