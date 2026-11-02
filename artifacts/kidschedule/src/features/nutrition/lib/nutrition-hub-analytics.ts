/**
 * Nutrition Hub growth analytics — achievements, discovery, premium funnel.
 * Uses client logs (same pattern as health-lab / math-playground). No PII in payloads.
 */

import { queueClientLog } from "@/lib/client-logs";
import { safeProductTrack } from "@/lib/analytics/safe-product-track";
import type { AchievementId } from "@/features/nutrition/lib/nutrition-achievements";
import type { NutritionTab } from "@/features/nutrition/types/nutrition-hub.types";

export type NutritionHubAnalyticsEvent =
  | "nutrition_hub_open"
  | "today_tab_open"
  | "plan_tab_open"
  | "track_tab_open"
  | "family_tab_open"
  | "achievement_viewed"
  | "achievement_unlocked"
  | "grocery_opened"
  | "grocery_generated"
  | "tiffin_opened"
  | "tiffin_generated"
  | "caregiver_share_created"
  | "premium_preview_viewed"
  | "monthly_review_viewed";

const SESSION_KEY_PREFIX = "amynest:nutrition-hub-analytics:";
const sessionEmitted = new Set<string>();

const TAB_EVENT_MAP: Partial<Record<NutritionTab, NutritionHubAnalyticsEvent>> = {
  today: "today_tab_open",
  plan: "plan_tab_open",
  track: "track_tab_open",
  family: "family_tab_open",
};

function sessionDedupKey(event: NutritionHubAnalyticsEvent, childId: number | null): string {
  if (event === "nutrition_hub_open" || event.endsWith("_tab_open")) return event;
  return `${event}:${childId ?? "none"}`;
}

function shouldEmitSessionEvent(key: string): boolean {
  if (sessionEmitted.has(key)) return false;
  try {
    if (typeof sessionStorage !== "undefined") {
      const storageKey = SESSION_KEY_PREFIX + key;
      if (sessionStorage.getItem(storageKey)) {
        sessionEmitted.add(key);
        return false;
      }
      sessionStorage.setItem(storageKey, "1");
    }
  } catch {
    /* sessionStorage unavailable */
  }
  sessionEmitted.add(key);
  return true;
}

function countOf(meta: Record<string, string | number | boolean | undefined>, key: string): number | undefined {
  const value = meta[key];
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : undefined;
}

/** Counts and tool names only. Meal text stays out of the product spine. */
function bridgeNutritionProduct(
  event: NutritionHubAnalyticsEvent,
  meta: Record<string, string | number | boolean | undefined>,
): void {
  if (event === "nutrition_hub_open" || event === "plan_tab_open") {
    safeProductTrack("nutrition_tool_opened", {
      feature_name: "nutrition",
      tool: event === "plan_tab_open" ? "plan" : "hub",
    });
    return;
  }
  if (event === "grocery_generated" || event === "tiffin_generated") {
    const itemCount = countOf(meta, event === "grocery_generated" ? "itemCount" : "dayCount");
    safeProductTrack("nutrition_plan_generated", {
      feature_name: "nutrition",
      plan_kind: event === "grocery_generated" ? "grocery" : "tiffin",
      ...(itemCount !== undefined ? { item_count: itemCount } : {}),
    });
  }
}

function emit(
  event: NutritionHubAnalyticsEvent,
  meta: Record<string, string | number | boolean | undefined>,
): void {
  queueClientLog({
    type: "info",
    message: `[nutrition-hub] ${event}`,
    meta: { feature: "nutrition_hub", event, ...meta },
  });
  bridgeNutritionProduct(event, meta);
}

function emitOncePerSession(
  event: NutritionHubAnalyticsEvent,
  childId: number | null,
  meta?: Record<string, string | number | boolean | undefined>,
): void {
  const key = sessionDedupKey(event, childId);
  if (!shouldEmitSessionEvent(key)) return;
  emit(event, { childId: childId ?? undefined, ...meta });
}

/** Clears session-scoped dedup state (for unit tests). */
export function resetNutritionHubAnalyticsSession(): void {
  sessionEmitted.clear();
  try {
    if (typeof sessionStorage === "undefined") return;
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const storageKey = sessionStorage.key(i);
      if (storageKey?.startsWith(SESSION_KEY_PREFIX)) keys.push(storageKey);
    }
    for (const storageKey of keys) sessionStorage.removeItem(storageKey);
  } catch {
    /* silent */
  }
}

export function trackNutritionHubEvent(
  event: NutritionHubAnalyticsEvent,
  childId: number | null,
  meta?: Record<string, string | number | boolean | undefined>,
): void {
  emit(event, { childId: childId ?? undefined, ...meta });
}

export function trackNutritionHubOpen(childId: number | null): void {
  emitOncePerSession("nutrition_hub_open", childId);
}

export function trackNutritionTabOpen(tab: NutritionTab, childId: number | null): void {
  const event = TAB_EVENT_MAP[tab];
  if (!event) return;
  emitOncePerSession(event, childId);
}

export function trackAchievementViewed(childId: number | null, achievementId: AchievementId): void {
  trackNutritionHubEvent("achievement_viewed", childId, { achievementId });
}

export function trackAchievementUnlocked(childId: number | null, achievementId: AchievementId): void {
  trackNutritionHubEvent("achievement_unlocked", childId, { achievementId });
  import("@/lib/review-service").then(({ notifyReviewTrigger }) => {
    notifyReviewTrigger("nutrition_goal_completed", { achievementId });
  });
  import("@/lib/retention-engine").then(({ unlockBadge }) => {
    unlockBadge("nutrition_week", "nutrition_hub");
  });
}

export function trackGroceryOpened(childId: number | null): void {
  trackNutritionHubEvent("grocery_opened", childId);
}

export function trackGroceryGenerated(childId: number | null, itemCount: number): void {
  trackNutritionHubEvent("grocery_generated", childId, { itemCount });
}

export function trackTiffinOpened(childId: number | null): void {
  trackNutritionHubEvent("tiffin_opened", childId);
}

export function trackTiffinGenerated(childId: number | null, dayCount: number): void {
  emitOncePerSession("tiffin_generated", childId, { dayCount });
}

export function trackCaregiverShareCreated(childId: number | null, childCount: number): void {
  trackNutritionHubEvent("caregiver_share_created", childId, { childCount });
}

export function trackPremiumPreviewViewed(childId: number | null, source: string): void {
  trackNutritionHubEvent("premium_preview_viewed", childId, { source });
}

export function trackMonthlyReviewViewed(childId: number | null, monthLabel: string): void {
  trackNutritionHubEvent("monthly_review_viewed", childId, { monthLabel });
}
