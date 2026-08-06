/**
 * ExperienceFactory — createExperience(definition).
 * Returns immutable ResolvedExperiencePackage.
 * Never renders. Never routes.
 */

import { resolveExperience } from "@/v2/experience-resolver";
import { freezeDeep } from "./freeze";
import {
  recordFactoryCreated,
  recordInvalidDefinition,
  recordUnknownDefinition,
} from "./health-state";
import { getExperienceDefinition } from "./registry";
import { getExperienceTemplate } from "./template";
import {
  AMY_EXPERIENCE_TEMPLATE_ENGINE_VERSION,
  DEFAULT_EXPERIENCE_TEMPLATE_ID,
  type CreateExperienceOptions,
  type ExperienceDefinition,
  type ResolvedExperiencePackage,
} from "./types";
import { validateExperienceDefinition } from "./validate";

/**
 * Create an immutable experience package from a definition.
 * Invalid definitions return a safe unknown package (never throws).
 */
export function createExperience(
  definition: ExperienceDefinition | string,
  options: CreateExperienceOptions = {},
): ResolvedExperiencePackage {
  const now = options.now ?? new Date();
  const generatedAt = now.toISOString();
  const record = options.recordHealth ?? true;
  const templateId = options.templateId ?? DEFAULT_EXPERIENCE_TEMPLATE_ID;
  const template = getExperienceTemplate(templateId);

  let def: ExperienceDefinition | null =
    typeof definition === "string"
      ? getExperienceDefinition(definition)
      : definition;

  if (typeof definition === "string" && !def) {
    if (record) recordUnknownDefinition();
    def = null;
  }

  if (!def) {
    const pkg = unknownPackage(
      typeof definition === "string" ? definition : "unknown",
      generatedAt,
      templateId,
    );
    if (record) recordFactoryCreated(pkg);
    return pkg;
  }

  const validation = validateExperienceDefinition(def, { templateId });
  if (!validation.ok || !template) {
    if (record) recordInvalidDefinition();
    const pkg = unknownPackage(def.experienceId, generatedAt, templateId);
    if (record) recordFactoryCreated(pkg);
    return pkg;
  }

  const resolved = resolveExperience(
    {
      experienceId: def.experienceId,
      priority: options.priority ?? 1,
      recommendedJourney: def.journeyId,
      premiumState: def.premiumState,
    },
    { now, recordHealth: false },
  );

  const pkg = freezeDeep({
    experienceId: def.experienceId,
    experienceType: def.experienceType,
    contentId: def.contentId,
    journeyId: def.journeyId,
    surfaceBindings: def.surfaceBindings,
    premiumState: def.premiumState,
    capabilities: Object.freeze([...def.capabilities]),
    metadata: freezeDeep({ ...def.metadata }),
    version: def.version,
    resolved,
    templateId: template.templateId,
    templateVersion: template.templateVersion,
    engineVersion: AMY_EXPERIENCE_TEMPLATE_ENGINE_VERSION,
    generatedAt,
  }) satisfies ResolvedExperiencePackage;

  if (record) recordFactoryCreated(pkg);
  return pkg;
}

function unknownPackage(
  experienceId: string,
  generatedAt: string,
  templateId: string,
): ResolvedExperiencePackage {
  const resolved = resolveExperience(
    { experienceId, priority: 0 },
    { now: new Date(generatedAt), recordHealth: false },
  );
  const template = getExperienceTemplate(templateId);
  return freezeDeep({
    experienceId,
    experienceType: "unknown",
    contentId: "",
    journeyId: "none",
    surfaceBindings: freezeDeep({
      today: {
        surfaceId: "today",
        role: "unknown",
        surfaceSlotId: "",
        bindingId: "",
      },
      amyCoach: {
        surfaceId: "amy_coach",
        role: "unknown",
        surfaceSlotId: "",
        bindingId: "",
      },
      askAmy: {
        surfaceId: "ask_amy",
        role: "unknown",
        surfaceSlotId: "",
        bindingId: "",
      },
      forChild: {
        surfaceId: "for_child",
        role: "unknown",
        surfaceSlotId: "",
        bindingId: "",
      },
    }),
    premiumState: "unknown",
    capabilities: Object.freeze([] as string[]),
    metadata: freezeDeep({ status: "unknown_or_invalid" }),
    version: "unknown",
    resolved,
    templateId: template?.templateId ?? templateId,
    templateVersion:
      template?.templateVersion ?? AMY_EXPERIENCE_TEMPLATE_ENGINE_VERSION,
    engineVersion: AMY_EXPERIENCE_TEMPLATE_ENGINE_VERSION,
    generatedAt,
  });
}
