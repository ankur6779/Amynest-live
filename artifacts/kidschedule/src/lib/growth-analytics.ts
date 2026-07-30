/**
 * Unified growth analytics — dashboard-ready events for ASO, referrals,
 * reviews, attribution, and retention. Sends to product taxonomy, GA4, and
 * client logs for maximum observability.
 */

import { getAnalyticsService } from "@/lib/analytics/analytics-service";
import { track } from "@/lib/analytics";
import { trackMarketingEvent } from "@/lib/marketing/ga4-analytics";
import type { AnalyticsEventName, AnalyticsEventProps } from "@workspace/analytics-taxonomy";

export type GrowthEventName =
  | "install_source"
  | "review_prompt_shown"
  | "review_completed"
  | "review_prompt_dismissed"
  | "review_prompt_blocked"
  | "referral_sent"
  | "referral_accepted"
  | "play_store_click"
  | "premium_conversion"
  | "growth_milestone_reached"
  | "streak_updated"
  | "achievement_unlocked"
  | "onboarding_milestone"
  | "signup_completed"
  | "first_routine_generated"
  | "first_routine_created"
  | "first_amy_chat"
  | "pre_signup_notification_scheduled"
  | "pre_signup_notification_delivered"
  | "pre_signup_notification_opened"
  | "pre_signup_notification_dismissed"
  | "pre_signup_signup_started"
  | "pre_signup_signup_completed"
  | "pre_signup_login_completed"
  | "pre_signup_signup_conversion";

export type GrowthEventParams = Record<string, string | number | boolean | undefined>;

const GROWTH_TO_TAXONOMY: Partial<Record<GrowthEventName, AnalyticsEventName>> = {
  review_prompt_shown: "review_prompt_shown",
  review_completed: "review_completed",
  review_prompt_dismissed: "review_prompt_dismissed",
  referral_sent: "referral_sent",
  referral_accepted: "referral_accepted",
  play_store_click: "play_store_click",
  premium_conversion: "premium_conversion",
  install_source: "install_source",
  growth_milestone_reached: "growth_milestone_reached",
  streak_updated: "streak_updated",
  achievement_unlocked: "achievement_unlocked",
  onboarding_milestone: "onboarding_milestone",
  pre_signup_notification_scheduled: "pre_signup_notification_scheduled",
  pre_signup_notification_delivered: "pre_signup_notification_delivered",
  pre_signup_notification_opened: "pre_signup_notification_opened",
  pre_signup_notification_dismissed: "pre_signup_notification_dismissed",
  pre_signup_signup_started: "pre_signup_signup_started",
  pre_signup_signup_completed: "pre_signup_signup_completed",
  pre_signup_login_completed: "pre_signup_login_completed",
  pre_signup_signup_conversion: "pre_signup_signup_conversion",
};

const GA4_GROWTH_EVENTS = new Set<GrowthEventName>([
  "install_source",
  "review_prompt_shown",
  "review_completed",
  "referral_sent",
  "referral_accepted",
  "play_store_click",
  "premium_conversion",
  "signup_completed",
  "first_routine_generated",
  "first_routine_created",
  "first_amy_chat",
  "pre_signup_notification_scheduled",
  "pre_signup_notification_delivered",
  "pre_signup_notification_opened",
  "pre_signup_notification_dismissed",
  "pre_signup_signup_started",
  "pre_signup_signup_completed",
  "pre_signup_login_completed",
  "pre_signup_signup_conversion",
]);

export function trackGrowthEvent(
  event: GrowthEventName,
  params: GrowthEventParams = {},
): void {
  const at = new Date().toISOString();
  const payload = { ...params, at };

  const taxonomyEvent = GROWTH_TO_TAXONOMY[event];
  if (taxonomyEvent) {
    track(taxonomyEvent, params as AnalyticsEventProps<typeof taxonomyEvent>);
  } else {
    getAnalyticsService().trackFunnel("growth", event, params);
  }

  if (GA4_GROWTH_EVENTS.has(event)) {
    trackMarketingEvent(event as Parameters<typeof trackMarketingEvent>[0], payload);
  }

  // Google Ads in-app conversion signal (Firebase sign_up).
  if (event === "signup_completed") {
    void import("@/lib/firebase-subscription-attribution").then(({ trackFirebaseSignUp }) => {
      trackFirebaseSignUp({
        method: typeof params.method === "string" ? params.method : "app",
        source: typeof params.source === "string" ? params.source : "growth",
      });
    });
  }

  if (import.meta.env.DEV) {
    console.info("[growth]", event, payload);
  }
}
