/**
 * Nutrition Hub growth analytics — achievements, discovery, premium funnel.
 * Uses client logs (same pattern as health-lab / math-playground). No PII in payloads.
 */

import { queueClientLog } from "@/lib/client-logs";
import type { AchievementId } from "@/features/nutrition/lib/nutrition-achievements";

export type NutritionHubAnalyticsEvent =
  | "achievement_viewed"
  | "achievement_unlocked"
  | "grocery_opened"
  | "grocery_generated"
  | "tiffin_opened"
  | "caregiver_share_created"
  | "premium_preview_viewed";

function emit(
  event: NutritionHubAnalyticsEvent,
  meta: Record<string, string | number | boolean | undefined>,
): void {
  queueClientLog({
    type: "info",
    message: `[nutrition-hub] ${event}`,
    meta: { feature: "nutrition_hub", event, ...meta },
  });
}

export function trackNutritionHubEvent(
  event: NutritionHubAnalyticsEvent,
  childId: number | null,
  meta?: Record<string, string | number | boolean | undefined>,
): void {
  emit(event, { childId: childId ?? undefined, ...meta });
}

export function trackAchievementViewed(childId: number | null, achievementId: AchievementId): void {
  trackNutritionHubEvent("achievement_viewed", childId, { achievementId });
}

export function trackAchievementUnlocked(childId: number | null, achievementId: AchievementId): void {
  trackNutritionHubEvent("achievement_unlocked", childId, { achievementId });
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

export function trackCaregiverShareCreated(childId: number | null, childCount: number): void {
  trackNutritionHubEvent("caregiver_share_created", childId, { childCount });
}

export function trackPremiumPreviewViewed(childId: number | null, source: string): void {
  trackNutritionHubEvent("premium_preview_viewed", childId, { source });
}
