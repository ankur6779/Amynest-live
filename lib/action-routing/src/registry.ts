import type { ActionTarget, RouteDefinition } from "./types.js";

/** Canonical SPA routes — validated against AppCore at CI time. */
export const SPA_ROUTE_PATTERNS: readonly string[] = [
  "/dashboard",
  "/routines",
  "/routines/generate",
  "/routines/:id",
  "/nutrition",
  "/study",
  "/parenting-hub",
  "/parenting-hub#tile-:tileId",
  "/speech-coach",
  "/parenting-hub/speech-coach",
  "/phonics",
  "/progress",
  "/assistant",
  "/amy-coach",
  "/rewards",
  "/games",
  "/event-prep",
  "/pricing",
  "/subscription-trial",
  "/referrals",
  "/insights",
  "/notification-settings",
  "/behavior",
] as const;

export const ACTION_ROUTE_REGISTRY: Record<ActionTarget, RouteDefinition> = {
  learning_lesson: {
    target: "learning_lesson",
    path: "/study",
    requiredParams: ["lessonId"],
    fallbackTarget: "learning_subject",
    label: "Learning lesson",
  },
  learning_subject: {
    target: "learning_subject",
    path: "/parenting-hub",
    fallbackTarget: "parent_hub",
    label: "Learning zone",
  },
  routine: {
    target: "routine",
    path: "/routines",
    fallbackTarget: "parent_hub",
    label: "Routines hub",
  },
  routine_task: {
    target: "routine_task",
    path: "/routines/:routineId",
    requiredParams: ["routineId"],
    fallbackTarget: "routine",
    label: "Routine detail",
  },
  campaign: {
    target: "campaign",
    path: "/parenting-hub",
    requiredParams: ["campaignId"],
    fallbackTarget: "parent_hub",
    label: "Active campaign",
  },
  reward: {
    target: "reward",
    path: "/rewards",
    fallbackTarget: "parent_hub",
    label: "Rewards",
  },
  event: {
    target: "event",
    path: "/event-prep",
    fallbackTarget: "parent_hub",
    label: "Event prep",
  },
  parent_hub: {
    target: "parent_hub",
    path: "/parenting-hub",
    fallbackTarget: "parent_hub",
    label: "Parent hub",
  },
  amy_chat: {
    target: "amy_chat",
    path: "/assistant",
    fallbackTarget: "parent_hub",
    label: "Amy assistant",
  },
  goal: {
    target: "goal",
    path: "/assistant",
    requiredParams: ["goalId"],
    fallbackTarget: "amy_chat",
    label: "Goal detail",
  },
  subscription: {
    target: "subscription",
    path: "/pricing",
    fallbackTarget: "parent_hub",
    label: "Subscription",
  },
  milestone: {
    target: "milestone",
    path: "/progress",
    fallbackTarget: "parent_hub",
    label: "Milestones",
  },
  weekly_review: {
    target: "weekly_review",
    path: "/progress",
    fallbackTarget: "parent_hub",
    label: "Weekly review",
  },
  family_health: {
    target: "family_health",
    path: "/parenting-hub",
    fallbackTarget: "parent_hub",
    label: "Family health",
  },
  nutrition: {
    target: "nutrition",
    path: "/nutrition",
    fallbackTarget: "parent_hub",
    label: "Nutrition hub",
  },
  phonics: {
    target: "phonics",
    path: "/speech-coach",
    fallbackTarget: "parent_hub",
    label: "Phonics coach",
  },
  story_time: {
    target: "story_time",
    path: "/parenting-hub#tile-story-hub",
    fallbackTarget: "parent_hub",
    label: "Story time",
  },
  progress: {
    target: "progress",
    path: "/progress",
    fallbackTarget: "parent_hub",
    label: "Progress",
  },
  referral: {
    target: "referral",
    path: "/referrals",
    fallbackTarget: "parent_hub",
    label: "Referrals",
  },
  notification_settings: {
    target: "notification_settings",
    path: "/notification-settings",
    fallbackTarget: "parent_hub",
    label: "Notification settings",
  },
};

/** Legacy server / engine paths → ActionTarget (no hardcoded client links). */
export const LEGACY_PATH_TO_TARGET: Record<string, ActionTarget> = {
  "/hub": "parent_hub",
  "/dashboard": "parent_hub",
  "/routine": "routine",
  "/routines": "routine",
  "/meals": "nutrition",
  "/nutrition": "nutrition",
  "/study-zone": "learning_subject",
  "/study": "learning_subject",
  "/learn-with-amy": "learning_subject",
  "/story-time": "story_time",
  "/parenting-hub": "parent_hub",
  "/speech-coach": "phonics",
  "/parenting-hub/speech-coach": "phonics",
  "/phonics": "phonics",
  "/assistant": "amy_chat",
  "/amy-coach": "amy_chat",
  "/insights": "amy_chat",
  "/progress": "progress",
  "/rewards": "reward",
  "/games": "reward",
  "/event-prep": "event",
  "/subscription": "subscription",
  "/pricing": "subscription",
  "/subscription-trial": "subscription",
  "/referrals": "referral",
  "/notification-settings": "notification_settings",
};

/** ProductSurface → ActionTarget (family intelligence layer). */
export const SURFACE_TO_TARGET: Record<string, ActionTarget> = {
  notifications: "notification_settings",
  amy_ai: "amy_chat",
  parent_hub: "parent_hub",
  rewards: "reward",
  learning_zone: "learning_subject",
  events: "event",
  subscriptions: "subscription",
  routine: "routine",
};

/** ActionCategory → ActionTarget for hub cards. */
export const ACTION_CATEGORY_TO_TARGET: Record<string, ActionTarget> = {
  routine_problem: "routine",
  learning_problem: "learning_subject",
  retention_problem: "amy_chat",
  subscription_opportunity: "subscription",
};

/** Campaign id → default step target. */
export const CAMPAIGN_TARGET_MAP: Record<string, ActionTarget> = {
  healthy_eating_7d: "nutrition",
  reading_7d: "story_time",
  phonics_14d: "phonics",
  screen_free_3d: "parent_hub",
  routine_consistency_30d: "routine",
};

/** Playbook id → ActionTarget */
export const PLAYBOOK_TARGET_MAP: Record<string, ActionTarget> = {
  routine_collapse: "routine",
  parent_churn: "amy_chat",
  learning_disengagement: "learning_subject",
  sleep_inconsistency: "routine",
};

export function getRouteDefinition(target: ActionTarget): RouteDefinition {
  return ACTION_ROUTE_REGISTRY[target];
}
