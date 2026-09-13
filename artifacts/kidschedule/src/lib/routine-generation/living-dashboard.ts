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
  return "Today's plan is not on the board yet.";
}

export function livingDashboardEmptyBody(childName = "your child"): string {
  return `Tap Build today's plan for ${childName}, or retry if it did not appear.`;
}

export function livingDashboardBuildingTitle(): string {
  return "We're getting today's plan ready.";
}

export function livingDashboardBuildingBody(childName = "your child"): string {
  return `Amy is shaping a clear day around ${childName}.`;
}

export function livingDashboardFailedTitle(): string {
  return "Today's plan did not finish.";
}

export function livingDashboardFailedBody(childName = "your child"): string {
  return `Amy could not place ${childName}'s day. Retry, or tap Build today's plan.`;
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
