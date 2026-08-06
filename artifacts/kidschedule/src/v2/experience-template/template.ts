/**
 * Default Experience Template — reusable for future packs.
 */

import { freezeDeep } from "./freeze";
import {
  AMY_EXPERIENCE_TEMPLATE_ENGINE_VERSION,
  DEFAULT_EXPERIENCE_TEMPLATE_ID,
  type ExperienceTemplate,
} from "./types";

export const DEFAULT_EXPERIENCE_TEMPLATE: ExperienceTemplate = freezeDeep({
  templateId: DEFAULT_EXPERIENCE_TEMPLATE_ID,
  templateVersion: AMY_EXPERIENCE_TEMPLATE_ENGINE_VERSION,
  requiredSurfaces: Object.freeze([
    "today",
    "amy_coach",
    "ask_amy",
    "for_child",
  ] as const),
  allowedExperienceTypes: Object.freeze([
    "speech",
    "coach",
    "guide",
    "treasury",
  ] as const),
});

const TEMPLATES = new Map<string, ExperienceTemplate>([
  [DEFAULT_EXPERIENCE_TEMPLATE.templateId, DEFAULT_EXPERIENCE_TEMPLATE],
]);

export function getExperienceTemplate(
  templateId: string = DEFAULT_EXPERIENCE_TEMPLATE_ID,
): ExperienceTemplate | null {
  return TEMPLATES.get(templateId) ?? null;
}

/** Register an additional template (developer / future packs). */
export function registerExperienceTemplate(
  template: ExperienceTemplate,
): ExperienceTemplate {
  const frozen = freezeDeep(template);
  TEMPLATES.set(frozen.templateId, frozen);
  return frozen;
}

export function clearExperienceTemplatesForTests(): void {
  TEMPLATES.clear();
  TEMPLATES.set(
    DEFAULT_EXPERIENCE_TEMPLATE.templateId,
    DEFAULT_EXPERIENCE_TEMPLATE,
  );
}
