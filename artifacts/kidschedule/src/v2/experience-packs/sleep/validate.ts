/**
 * validateSleepExperience — definition / journey / surface checks.
 */

import { validateResolvedExperience } from "@/v2/experience-resolver";
import {
  SLEEP_CONTENT_CONTRACT,
  SLEEP_EXPERIENCE_ID,
  SLEEP_EXPERIENCE_VERSION,
  SLEEP_JOURNEY_CONTRACT,
  SLEEP_PACK_VERSION,
  SLEEP_SHARED_EXPERIENCE_ID,
} from "./contracts";
import type {
  SleepExperiencePack,
  SleepExperienceValidationResult,
} from "./types";

function requireBinding(
  binding: unknown,
  path: string,
  expectedSlot: string,
  issues: { path: string; message: string }[],
): void {
  if (!binding || typeof binding !== "object") {
    issues.push({ path, message: "required binding" });
    return;
  }
  const b = binding as Record<string, unknown>;
  if (typeof b.surfaceId !== "string" || !b.surfaceId) {
    issues.push({ path: `${path}.surfaceId`, message: "required" });
  }
  if (typeof b.role !== "string" || !b.role) {
    issues.push({ path: `${path}.role`, message: "required" });
  }
  if (b.surfaceSlotId !== expectedSlot) {
    issues.push({
      path: `${path}.surfaceSlotId`,
      message: `expected ${expectedSlot}`,
    });
  }
  if (typeof b.bindingId !== "string" || !b.bindingId) {
    issues.push({ path: `${path}.bindingId`, message: "required" });
  }
}

export function validateSleepExperience(
  value: unknown,
): SleepExperienceValidationResult {
  const issues: { path: string; message: string }[] = [];

  if (!value || typeof value !== "object") {
    return Object.freeze({
      ok: false,
      issues: Object.freeze([{ path: "", message: "must be an object" }]),
    });
  }

  const p = value as Partial<SleepExperiencePack>;

  if (p.experienceId !== SLEEP_EXPERIENCE_ID) {
    issues.push({ path: "experienceId", message: "must be sleep_support" });
  }
  if (p.experienceVersion !== SLEEP_EXPERIENCE_VERSION) {
    issues.push({ path: "experienceVersion", message: "must be v1" });
  }
  if (p.sharedExperienceId !== SLEEP_SHARED_EXPERIENCE_ID) {
    issues.push({
      path: "sharedExperienceId",
      message: "must be sleep_daily",
    });
  }
  if (p.experienceType !== "sleep") {
    issues.push({ path: "experienceType", message: "must be sleep" });
  }
  if (p.packVersion !== SLEEP_PACK_VERSION) {
    issues.push({ path: "packVersion", message: "unexpected version" });
  }
  if (p.premiumState !== "supported") {
    issues.push({ path: "premiumState", message: "must be supported" });
  }
  if (typeof p.generatedAt !== "string" || !p.generatedAt) {
    issues.push({ path: "generatedAt", message: "required" });
  }
  if (!Array.isArray(p.capabilities) || p.capabilities.length === 0) {
    issues.push({ path: "capabilities", message: "required non-empty" });
  }

  if (
    !p.content ||
    p.content.contentId !== SLEEP_CONTENT_CONTRACT.contentId ||
    !Array.isArray(p.content.topicIds)
  ) {
    issues.push({ path: "content", message: "invalid SleepContentContract" });
  }

  if (
    !p.journey ||
    p.journey.journeyId !== SLEEP_JOURNEY_CONTRACT.journeyId ||
    !Array.isArray(p.journey.stageIds) ||
    p.journey.stageIds.length !== SLEEP_JOURNEY_CONTRACT.stageIds.length
  ) {
    issues.push({ path: "journey", message: "invalid SleepJourneyContract" });
  } else {
    for (const stage of SLEEP_JOURNEY_CONTRACT.stageIds) {
      if (!p.journey.stageIds.includes(stage)) {
        issues.push({
          path: "journey.stageIds",
          message: `missing stage ${stage}`,
        });
      }
    }
  }

  if (!p.surfaces) {
    issues.push({ path: "surfaces", message: "required" });
  } else {
    requireBinding(p.surfaces.today, "surfaces.today", "v2-today-sleep", issues);
    requireBinding(
      p.surfaces.amyCoach,
      "surfaces.amyCoach",
      "amy_coach_sleep_journey",
      issues,
    );
    requireBinding(
      p.surfaces.askAmy,
      "surfaces.askAmy",
      "ask_amy_sleep_context",
      issues,
    );
    requireBinding(
      p.surfaces.forChild,
      "surfaces.forChild",
      "for_child_sleep_activities",
      issues,
    );
  }

  if (!p.resolved) {
    issues.push({ path: "resolved", message: "required ResolvedExperience" });
  } else {
    const resolved = validateResolvedExperience(p.resolved);
    if (!resolved.ok) {
      for (const issue of resolved.issues) {
        issues.push({
          path: `resolved.${issue.path}`,
          message: issue.message,
        });
      }
    } else if (p.resolved.experienceId !== SLEEP_EXPERIENCE_ID) {
      issues.push({
        path: "resolved.experienceId",
        message: "must match sleep_support",
      });
    } else if (p.resolved.experienceType !== "sleep") {
      issues.push({
        path: "resolved.experienceType",
        message: "must be sleep",
      });
    }
  }

  return Object.freeze({
    ok: issues.length === 0,
    issues: Object.freeze(issues),
  });
}
