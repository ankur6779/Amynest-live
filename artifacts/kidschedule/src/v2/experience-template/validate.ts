/**
 * validateExperienceDefinition — shape + template compatibility.
 */

import { getExperienceTemplate } from "./template";
import {
  DEFAULT_EXPERIENCE_TEMPLATE_ID,
  type ExperienceDefinition,
  type ExperienceDefinitionValidationResult,
  type ExperienceSurfaceBindings,
} from "./types";

function validateBinding(
  binding: unknown,
  path: string,
  expectedSurface: string,
  issues: { path: string; message: string }[],
): void {
  if (!binding || typeof binding !== "object") {
    issues.push({ path, message: "required" });
    return;
  }
  const b = binding as Record<string, unknown>;
  if (b.surfaceId !== expectedSurface) {
    issues.push({
      path: `${path}.surfaceId`,
      message: `expected ${expectedSurface}`,
    });
  }
  if (typeof b.role !== "string" || !b.role) {
    issues.push({ path: `${path}.role`, message: "required" });
  }
  if (typeof b.surfaceSlotId !== "string" || !b.surfaceSlotId) {
    issues.push({ path: `${path}.surfaceSlotId`, message: "required" });
  }
  if (typeof b.bindingId !== "string" || !b.bindingId) {
    issues.push({ path: `${path}.bindingId`, message: "required" });
  }
}

function validateSurfaces(
  surfaces: ExperienceSurfaceBindings | undefined,
  issues: { path: string; message: string }[],
): void {
  if (!surfaces) {
    issues.push({ path: "surfaceBindings", message: "required" });
    return;
  }
  validateBinding(surfaces.today, "surfaceBindings.today", "today", issues);
  validateBinding(
    surfaces.amyCoach,
    "surfaceBindings.amyCoach",
    "amy_coach",
    issues,
  );
  validateBinding(
    surfaces.askAmy,
    "surfaceBindings.askAmy",
    "ask_amy",
    issues,
  );
  validateBinding(
    surfaces.forChild,
    "surfaceBindings.forChild",
    "for_child",
    issues,
  );
}

export function validateExperienceDefinition(
  value: unknown,
  options: { templateId?: string } = {},
): ExperienceDefinitionValidationResult {
  const issues: { path: string; message: string }[] = [];

  if (!value || typeof value !== "object") {
    return Object.freeze({
      ok: false,
      issues: Object.freeze([{ path: "", message: "must be an object" }]),
    });
  }

  const d = value as Partial<ExperienceDefinition>;
  const template = getExperienceTemplate(
    options.templateId ?? DEFAULT_EXPERIENCE_TEMPLATE_ID,
  );

  if (!template) {
    issues.push({ path: "templateId", message: "unknown template" });
  }

  if (typeof d.experienceId !== "string" || !d.experienceId) {
    issues.push({ path: "experienceId", message: "required" });
  }
  if (typeof d.experienceType !== "string" || !d.experienceType) {
    issues.push({ path: "experienceType", message: "required" });
  } else if (
    template &&
    !template.allowedExperienceTypes.includes(d.experienceType)
  ) {
    issues.push({
      path: "experienceType",
      message: `not allowed by template ${template.templateId}`,
    });
  }
  if (typeof d.contentId !== "string" || !d.contentId) {
    issues.push({ path: "contentId", message: "required" });
  }
  if (typeof d.journeyId !== "string" || !d.journeyId) {
    issues.push({ path: "journeyId", message: "required" });
  }
  if (typeof d.version !== "string" || !d.version) {
    issues.push({ path: "version", message: "required" });
  }
  if (typeof d.premiumState !== "string" || !d.premiumState) {
    issues.push({ path: "premiumState", message: "required" });
  }
  if (!Array.isArray(d.capabilities)) {
    issues.push({ path: "capabilities", message: "required array" });
  }
  if (!d.metadata || typeof d.metadata !== "object") {
    issues.push({ path: "metadata", message: "required object" });
  }

  validateSurfaces(d.surfaceBindings, issues);

  return Object.freeze({
    ok: issues.length === 0,
    issues: Object.freeze(issues),
  });
}
