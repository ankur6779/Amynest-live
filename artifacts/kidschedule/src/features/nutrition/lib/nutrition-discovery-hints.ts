import type { AgeGroupId } from "@/lib/nutrition-data";
import type { NutritionTab } from "@/features/nutrition/types/nutrition-hub.types";
import { isSchoolAgeBand } from "@/features/nutrition/lib/tiffin-planner";

export type DiscoveryHintId = "grocery" | "tiffin" | "caregiver_share" | "meal_memory";

export interface DiscoveryHint {
  id: DiscoveryHintId;
  messageKey: string;
  ctaKey: string;
  targetTab: NutritionTab;
}

const DISMISS_PREFIX = "nutrition:discovery-dismissed:";

export function discoveryDismissKey(hintId: DiscoveryHintId, childId: number | null): string {
  return `${DISMISS_PREFIX}${childId ?? "anon"}:${hintId}`;
}

export function isHintDismissed(hintId: DiscoveryHintId, childId: number | null): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(discoveryDismissKey(hintId, childId)) === "1";
}

export function dismissDiscoveryHint(hintId: DiscoveryHintId, childId: number | null): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(discoveryDismissKey(hintId, childId), "1");
  } catch {
    /* quota */
  }
}

export interface DiscoveryHintContext {
  activeTab: NutritionTab;
  childId: number | null;
  ageGroupId: AgeGroupId;
  hasMealPlan: boolean;
  memoryEntryCount: number;
  childrenCount: number;
}

const HINT_CATALOG: Record<DiscoveryHintId, Omit<DiscoveryHint, "id">> = {
  meal_memory: {
    messageKey: "nutrition_hub.discovery.meal_memory",
    ctaKey: "nutrition_hub.discovery.meal_memory_cta",
    targetTab: "plan",
  },
  grocery: {
    messageKey: "nutrition_hub.discovery.grocery",
    ctaKey: "nutrition_hub.discovery.grocery_cta",
    targetTab: "plan",
  },
  tiffin: {
    messageKey: "nutrition_hub.discovery.tiffin",
    ctaKey: "nutrition_hub.discovery.tiffin_cta",
    targetTab: "plan",
  },
  caregiver_share: {
    messageKey: "nutrition_hub.discovery.caregiver_share",
    ctaKey: "nutrition_hub.discovery.caregiver_share_cta",
    targetTab: "family",
  },
};

function isEligible(hintId: DiscoveryHintId, ctx: DiscoveryHintContext): boolean {
  if (isHintDismissed(hintId, ctx.childId)) return false;

  switch (hintId) {
    case "meal_memory":
      return ctx.hasMealPlan && ctx.memoryEntryCount < 3;
    case "grocery":
      return ctx.hasMealPlan && (ctx.activeTab === "plan" || ctx.activeTab === "today");
    case "tiffin":
      return (
        ctx.hasMealPlan &&
        isSchoolAgeBand(ctx.ageGroupId) &&
        (ctx.activeTab === "plan" || ctx.activeTab === "today")
      );
    case "caregiver_share":
      return (
        ctx.childrenCount > 0 &&
        (ctx.activeTab === "family" || ctx.activeTab === "today")
      );
    default:
      return false;
  }
}

const HINT_PRIORITY: DiscoveryHintId[] = [
  "meal_memory",
  "grocery",
  "tiffin",
  "caregiver_share",
];

export function resolveDiscoveryHints(ctx: DiscoveryHintContext): DiscoveryHint[] {
  return HINT_PRIORITY.filter((id) => isEligible(id, ctx)).map((id) => ({
    id,
    ...HINT_CATALOG[id],
  }));
}

export function pickPrimaryDiscoveryHint(ctx: DiscoveryHintContext): DiscoveryHint | null {
  const hints = resolveDiscoveryHints(ctx);
  return hints[0] ?? null;
}
