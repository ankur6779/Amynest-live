/**
 * Day-0 sequencing: hide secondary discovery until the parent has
 * experienced their first real plan. Does not delete features.
 */
import { hasFirstRoutineActivationProgress } from "@/lib/activation-gate";
import { loadFirstExperienceState } from "@/lib/first-experience/storage";

const DAY0_SECONDARY_HREFS = new Set([
  "/parenting-hub",
  "/games",
  "/birth-sky",
  "/health-lab",
  "/nutrition",
  "/study",
  "/amy-ai-tutor",
  "/insights",
  "/behavior",
  "/recipes",
  "/kids-control-center",
]);

export function hasGuestFirstPlan(): boolean {
  try {
    const state = loadFirstExperienceState();
    return Boolean(state.nextThing && (state.nextThing.blocks?.length ?? 0) >= 4);
  } catch {
    return false;
  }
}

/**
 * Secondary Hub / Rooms / Games / Birth Sky / Health Lab may show only after
 * the first plan has been generated (or a guest plan with real blocks exists
 * and the parent has started it).
 */
export function shouldShowDay0SecondarySurfaces(routineCount = 0): boolean {
  return hasFirstRoutineActivationProgress(routineCount);
}

export function isDay0SecondaryHref(href: string): boolean {
  const path = href.split("#")[0] ?? href;
  if (path.startsWith("/parenting-hub")) return true;
  return DAY0_SECONDARY_HREFS.has(path);
}
