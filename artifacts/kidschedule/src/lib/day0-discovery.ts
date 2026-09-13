/**
 * Staged discovery — first value stays first.
 *
 * DAY_0_BEFORE_PLAN  → Today / child / plan CTA only
 * DAY_0_PLAN_VISIBLE → small age-aware discovery (Play / Care / Grow / Talk)
 * DAY_0_FIRST_ACTION → Rooms + broader More (Birth Sky, Progress, Insights, …)
 *
 * Does not delete features. Does not restore the old Home catalog.
 */
import { hasFirstRoutineActivationProgress } from "@/lib/activation-gate";
import { loadFirstExperienceState } from "@/lib/first-experience/storage";
import { hasFirstPlanActionStarted } from "@/lib/subscription-funnel-storage";

export type DiscoveryStage = "before_plan" | "plan_visible" | "first_action";

/** Last routine count seen on Home — keeps the tab bar on the same stage. */
let rememberedRoutineCount = 0;

export function rememberDiscoveryRoutineCount(count: number): void {
  if (!Number.isFinite(count) || count < 0) return;
  rememberedRoutineCount = count;
}

export function resetRememberedDiscoveryRoutineCount(): void {
  rememberedRoutineCount = 0;
}

/** Hidden until a real plan exists. */
const BEFORE_PLAN_HIDDEN_HREFS = new Set([
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
  "/rewards",
]);

/**
 * Hidden while the plan is only visible — shown after first meaningful action.
 * Games / Study / Nutrition stay available at plan_visible (limited discovery).
 */
const FIRST_ACTION_ONLY_HREFS = new Set([
  "/birth-sky",
  "/health-lab",
  "/insights",
  "/behavior",
  "/recipes",
  "/amy-ai-tutor",
  "/rewards",
]);

export function hasGuestFirstPlan(): boolean {
  try {
    const state = loadFirstExperienceState();
    return Boolean(state.nextThing && (state.nextThing.blocks?.length ?? 0) >= 4);
  } catch {
    return false;
  }
}

export function resolveDiscoveryStage(routineCount = rememberedRoutineCount): DiscoveryStage {
  if (hasFirstPlanActionStarted()) return "first_action";
  if (hasFirstRoutineActivationProgress(routineCount) || hasGuestFirstPlan()) {
    return "plan_visible";
  }
  return "before_plan";
}

/**
 * Rooms tab + limited discovery. True once a plan is visible
 * (generated, activated, or guest plan with real blocks).
 */
export function shouldShowDay0SecondarySurfaces(routineCount = 0): boolean {
  return resolveDiscoveryStage(routineCount) !== "before_plan";
}

/** Alias — Rooms CTA and Rooms tab share this rule. */
export function shouldShowRoomsNavigation(routineCount = 0): boolean {
  return shouldShowDay0SecondarySurfaces(routineCount);
}

export function shouldShowFullDiscoverySurfaces(routineCount = 0): boolean {
  return resolveDiscoveryStage(routineCount) === "first_action";
}

export function isDay0SecondaryHref(href: string): boolean {
  const path = href.split("#")[0] ?? href;
  if (path.startsWith("/parenting-hub")) return true;
  return BEFORE_PLAN_HIDDEN_HREFS.has(path);
}

export function isFirstActionOnlyHref(href: string): boolean {
  const path = href.split("#")[0] ?? href;
  return FIRST_ACTION_ONLY_HREFS.has(path);
}

export function isHrefAllowedForStage(href: string, stage: DiscoveryStage): boolean {
  if (stage === "first_action") return true;
  if (stage === "before_plan") return !isDay0SecondaryHref(href);
  return !isFirstActionOnlyHref(href);
}
