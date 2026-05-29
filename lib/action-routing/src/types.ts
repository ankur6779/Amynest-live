/** Universal action targets — every notification, recommendation, and card maps to one. */
export type ActionTarget =
  | "learning_lesson"
  | "learning_subject"
  | "routine"
  | "routine_task"
  | "campaign"
  | "reward"
  | "event"
  | "parent_hub"
  | "amy_chat"
  | "goal"
  | "subscription"
  | "milestone"
  | "weekly_review"
  | "family_health"
  | "nutrition"
  | "phonics"
  | "story_time"
  | "progress"
  | "referral"
  | "notification_settings";

export interface RoutedAction {
  actionTarget: ActionTarget;
  /** Primary entity id (routineId, lessonId, campaignId, goalId, …) */
  entityId?: string | number | null;
  params?: Record<string, string | number | boolean | null | undefined>;
  fallbackTarget?: ActionTarget;
  fallbackParams?: Record<string, string | number | boolean | null | undefined>;
}

export interface ResolvedRoute {
  path: string;
  actionTarget: ActionTarget;
  usedFallback: boolean;
  entityId?: string | number | null;
}

export interface RouteDefinition {
  target: ActionTarget;
  /** Path template — `:id` segments filled from params */
  path: string;
  requiredParams?: readonly string[];
  fallbackTarget: ActionTarget;
  /** Human label for analytics dashboards */
  label: string;
}

/** Notification categories (DB + outcome engine extensions). */
export type NotificationCategoryRoute =
  | "nutrition"
  | "parenting_tips"
  | "learning_activity"
  | "story_time"
  | "routine"
  | "routine_item"
  | "engagement"
  | "milestone"
  | "weekly"
  | "good_night"
  | "phonics"
  | "insights"
  | "learning_activity"
  | "campaigns"
  | "streak_recovery"
  | "retention_intervention";

export type DeepLinkAnalyticsEvent =
  | "notification_clicked"
  | "deep_link_opened"
  | "destination_loaded"
  | "action_completed"
  | "deep_link_fallback";

export interface DeepLinkAnalyticsPayload {
  event: DeepLinkAnalyticsEvent;
  actionTarget?: ActionTarget;
  category?: string;
  entityId?: string | number | null;
  path?: string;
  usedFallback?: boolean;
  source?: "notification" | "amy_recommendation" | "hub_card" | "campaign" | "pwa_sw" | "android" | "ios";
  notificationId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
