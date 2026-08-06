/**
 * validateSpeechExperience — pack shape + contract checks.
 */

import { validateResolvedExperience } from "@/v2/experience-resolver";
import {
  SPEECH_CONTENT_CONTRACT,
  SPEECH_EXPERIENCE_ID,
  SPEECH_EXPERIENCE_VERSION,
  SPEECH_JOURNEY_CONTRACT,
  SPEECH_PACK_VERSION,
  SPEECH_SHARED_EXPERIENCE_ID,
} from "./contracts";
import type {
  SpeechExperiencePack,
  SpeechExperienceValidationResult,
} from "./types";

function requireBinding(
  binding: unknown,
  path: string,
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
  if (typeof b.surfaceSlotId !== "string" || !b.surfaceSlotId) {
    issues.push({ path: `${path}.surfaceSlotId`, message: "required" });
  }
  if (typeof b.bindingId !== "string" || !b.bindingId) {
    issues.push({ path: `${path}.bindingId`, message: "required" });
  }
}

export function validateSpeechExperience(
  value: unknown,
): SpeechExperienceValidationResult {
  const issues: { path: string; message: string }[] = [];

  if (!value || typeof value !== "object") {
    return Object.freeze({
      ok: false,
      issues: Object.freeze([{ path: "", message: "must be an object" }]),
    });
  }

  const p = value as Partial<SpeechExperiencePack>;

  if (p.experienceId !== SPEECH_EXPERIENCE_ID) {
    issues.push({ path: "experienceId", message: "must be speech_mission" });
  }
  if (p.experienceVersion !== SPEECH_EXPERIENCE_VERSION) {
    issues.push({ path: "experienceVersion", message: "must be v1" });
  }
  if (p.sharedExperienceId !== SPEECH_SHARED_EXPERIENCE_ID) {
    issues.push({
      path: "sharedExperienceId",
      message: "must be speech_daily",
    });
  }
  if (p.packVersion !== SPEECH_PACK_VERSION) {
    issues.push({ path: "packVersion", message: "unexpected version" });
  }
  if (typeof p.generatedAt !== "string" || !p.generatedAt) {
    issues.push({ path: "generatedAt", message: "required" });
  }

  if (
    !p.content ||
    p.content.contentId !== SPEECH_CONTENT_CONTRACT.contentId ||
    p.content.sharedExperienceId !== SPEECH_SHARED_EXPERIENCE_ID
  ) {
    issues.push({ path: "content", message: "invalid SpeechContentContract" });
  }

  if (
    !p.journey ||
    p.journey.journeyId !== SPEECH_JOURNEY_CONTRACT.journeyId ||
    !Array.isArray(p.journey.stageIds)
  ) {
    issues.push({ path: "journey", message: "invalid SpeechJourneyContract" });
  }

  if (!p.surfaces) {
    issues.push({ path: "surfaces", message: "required" });
  } else {
    requireBinding(p.surfaces.today, "surfaces.today", issues);
    requireBinding(p.surfaces.amyCoach, "surfaces.amyCoach", issues);
    requireBinding(p.surfaces.askAmy, "surfaces.askAmy", issues);
    requireBinding(p.surfaces.forChild, "surfaces.forChild", issues);
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
    } else if (p.resolved.experienceId !== SPEECH_EXPERIENCE_ID) {
      issues.push({
        path: "resolved.experienceId",
        message: "must match speech_mission",
      });
    }
  }

  return Object.freeze({
    ok: issues.length === 0,
    issues: Object.freeze(issues),
  });
}
