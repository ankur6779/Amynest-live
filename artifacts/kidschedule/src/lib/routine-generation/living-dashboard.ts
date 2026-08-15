/**
 * Routine dashboard living face — presentation copy only.
 * Does not change R2/R3 helpers, engine, APIs, or entitlements.
 *
 * Emotional target: "This is AmyNest helping me know what to do today."
 */

import {
  livingRoutineBuildCta,
  livingRoutineBuildSubtext,
  livingRoutineProductName,
  routineLivingOpen,
} from "@/lib/routine-generation/living-entry";
import { livingResultBeginCta } from "@/lib/routine-generation/living-result";

export function livingDashboardProductName(): string {
  return livingRoutineProductName();
}

export function livingDashboardOpen(childName = "your child") {
  return routineLivingOpen(childName);
}

export function livingDashboardEmptyTitle(): string {
  return "No plan for today yet.";
}

export function livingDashboardEmptyBody(childName = "your child"): string {
  return `Amy can shape one around ${childName} and this day.`;
}

export function livingDashboardBuildCta(): string {
  return livingRoutineBuildCta(false);
}

export function livingDashboardBuildSubtext(childName = "your child"): string {
  return livingRoutineBuildSubtext(childName);
}

export function livingDashboardContinueCta(): string {
  return livingResultBeginCta();
}

export function livingDashboardContinueSubtext(childName = "your child"): string {
  return `Open ${childName}'s plan and begin the first right step.`;
}

export function livingDashboardRebuildCta(): string {
  return livingRoutineBuildCta(true);
}

export function livingDashboardFamilyHint(): string {
  return "Who today is for";
}

export function livingDashboardMoreHint(): string {
  return "Forecast, household, why, and safety — quietly here if you need them.";
}
