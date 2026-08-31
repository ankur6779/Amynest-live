import { z } from "zod";

/**
 * Phase 1 navigation, performance, error, and funnel events.
 * Imported into the main taxonomy registry.
 */
export const PHASE1_EVENT_PROP_SCHEMAS = {
  // ── navigation / screens ───────────────────────────────────────────
  screen_view: z.object({
    screen: z.string().max(256),
    path: z.string().max(256).optional(),
    navigation_source: z.string().max(256).optional(),
    feature: z.string().max(80).optional(),
    subscription_state: z.string().max(32).optional(),
  }),
  screen_leave: z.object({
    screen: z.string().max(256),
    path: z.string().max(256).optional(),
    time_on_screen_ms: z.number().int().nonnegative(),
    navigation_destination: z.string().max(256).optional(),
    feature: z.string().max(80).optional(),
  }),
  navigation: z.object({
    from_route: z.string().max(256),
    to_route: z.string().max(256),
    trigger: z.enum(["link", "back", "programmatic", "deep_link", "unknown"]).optional(),
    feature: z.string().max(80).optional(),
  }),
  button_click: z.object({
    button_id: z.string().max(128),
    screen: z.string().max(256).optional(),
    feature: z.string().max(80).optional(),
    subscription_state: z.string().max(32).optional(),
    label: z.string().max(128).optional(),
  }),
  feature_open: z.object({
    feature_id: z.string().max(64),
    screen: z.string().max(256).optional(),
    source: z.string().max(64).optional(),
    subscription_state: z.string().max(32).optional(),
  }),
  feature_complete: z.object({
    feature_id: z.string().max(64),
    screen: z.string().max(256).optional(),
    duration_ms: z.number().int().nonnegative().optional(),
    success: z.boolean().optional(),
  }),
  session_end: z.object({
    reason: z.enum(["timeout", "background", "logout", "manual", "recovery"]).optional(),
    duration_ms: z.number().int().nonnegative().optional(),
    event_count: z.number().int().nonnegative().optional(),
  }),
  first_open: z.object({
    cold: z.boolean().optional(),
    install_source: z.string().max(64).optional(),
  }),
  search_query: z.object({
    query: z.string().max(256),
    screen: z.string().max(256).optional(),
    result_count: z.number().int().nonnegative().optional(),
  }),
  search_no_results: z.object({
    query: z.string().max(256),
    screen: z.string().max(256).optional(),
  }),
  asset_download: z.object({
    asset_type: z.string().max(64),
    asset_id: z.string().max(128).optional(),
    feature: z.string().max(80).optional(),
  }),

  // ── funnel mirrors (persisted to analytics_events; replaces log-only funnels) ──
  subscription_funnel_event: z.object({
    step: z.string().max(64),
    reason: z.string().max(64).optional(),
    plan: z.string().max(32).optional(),
    source: z.string().max(64).optional(),
    country: z.string().max(8).optional(),
    platform: z.string().max(32).optional(),
  }),
  onboarding_funnel_event: z.object({
    step: z.string().max(64),
    onboarding_step: z.string().max(64).optional(),
    country: z.string().max(8).optional(),
    child_age_band: z.string().max(32).optional(),
    education_stage: z.string().max(64).optional(),
    child_age_years: z.number().optional(),
  }),
  growth_funnel_event: z.object({
    step: z.string().max(64),
    source: z.string().max(64).optional(),
  }),

  // ── performance ──────────────────────────────────────────────────────
  performance_metric: z.object({
    metric: z.enum([
      "api_duration",
      "screen_render",
      "ai_response",
      "startup_time",
      "cache_hit",
      "cache_miss",
    ]),
    duration_ms: z.number().nonnegative().optional(),
    path: z.string().max(256).optional(),
    screen: z.string().max(256).optional(),
    cache_key: z.string().max(128).optional(),
    success: z.boolean().optional(),
  }),

  // ── errors (no PII — message truncated, no stack in prod optional) ───
  error_captured: z.object({
    error_class: z.enum([
      "react",
      "api",
      "ai",
      "network",
      "database",
      "unhandled",
      "unknown",
    ]),
    message: z.string().max(500),
    route: z.string().max(256).optional(),
    screen: z.string().max(256).optional(),
    status_code: z.number().int().optional(),
    feature: z.string().max(80).optional(),
    /** Stable crash group id (client fingerprint). */
    fingerprint: z.string().max(64).optional(),
    /** Hash of top stack frames for grouping. */
    stack_hash: z.string().max(64).optional(),
    component: z.string().max(128).optional(),
    session_id: z.string().max(128).optional(),
  }),

  // ── retention / habit loop ───────────────────────────────────────────
  daily_checkin: z.object({
    streak_days: z.number().int().nonnegative().optional(),
    stars: z.number().int().nonnegative().optional(),
    coins: z.number().int().nonnegative().optional(),
    parent_xp: z.number().int().nonnegative().optional(),
  }),
  streak_started: z.object({
    streak_days: z.number().int().nonnegative().optional(),
  }),
  streak_extended: z.object({
    streak_days: z.number().int().nonnegative().optional(),
    milestone: z.number().int().optional(),
  }),
  streak_lost: z.object({
    previous_streak: z.number().int().nonnegative().optional(),
  }),
  reward_claimed: z.object({
    reward_type: z.enum(["stars", "coins", "parent_xp", "badge"]).optional(),
    amount: z.number().int().nonnegative().optional(),
    source: z.string().max(64).optional(),
  }),
  goal_completed: z.object({
    goal: z.enum(["routine", "story", "activity", "speech", "all"]).optional(),
  }),
  weekly_summary_viewed: z.object({
    week_key: z.string().max(16).optional(),
  }),
  resume_clicked: z.object({
    resume_type: z.string().max(32).optional(),
    href: z.string().max(256).optional(),
  }),
  notification_opened: z.object({
    category: z.string().max(64).optional(),
    campaign: z.string().max(64).optional(),
    notification_id: z.string().max(128).optional(),
    notification_type: z.string().max(64).optional(),
    destination: z.string().max(256).optional(),
    experiment_variant: z.string().max(32).optional(),
  }),
  notification_scheduled: z.object({
    notification_id: z.string().max(128).optional(),
    notification_type: z.string().max(64).optional(),
    campaign: z.string().max(64).optional(),
    destination: z.string().max(256).optional(),
    experiment_variant: z.string().max(32).optional(),
  }),
  notification_sent: z.object({
    notification_id: z.string().max(128).optional(),
    notification_type: z.string().max(64).optional(),
    campaign: z.string().max(64).optional(),
    destination: z.string().max(256).optional(),
    experiment_variant: z.string().max(32).optional(),
  }),
  notification_suppressed: z.object({
    reason: z.string().max(64).optional(),
    notification_type: z.string().max(64).optional(),
    campaign: z.string().max(64).optional(),
  }),
  notification_delivered: z.object({
    notification_id: z.string().max(128).optional(),
    notification_type: z.string().max(64).optional(),
    campaign: z.string().max(64).optional(),
  }),
  notification_dismissed: z.object({
    notification_id: z.string().max(128).optional(),
    notification_type: z.string().max(64).optional(),
    campaign: z.string().max(64).optional(),
  }),
  notification_action_clicked: z.object({
    notification_id: z.string().max(128).optional(),
    notification_type: z.string().max(64).optional(),
    campaign: z.string().max(64).optional(),
    destination: z.string().max(256).optional(),
  }),
  notification_deep_link_opened: z.object({
    notification_id: z.string().max(128).optional(),
    notification_type: z.string().max(64).optional(),
    campaign: z.string().max(64).optional(),
    destination: z.string().max(256).optional(),
    experiment_variant: z.string().max(32).optional(),
  }),
  return_after_push: z.object({
    category: z.string().max(64).optional(),
    hours_since_push: z.number().nonnegative().optional(),
  }),
  achievement_unlocked_retention: z.object({
    achievement_id: z.string().max(64).optional(),
  }),
  inactive_days: z.object({
    days: z.number().int().nonnegative().optional(),
  }),
  winback_opened: z.object({
    level: z.number().int().min(1).max(4).optional(),
  }),
} as const;

export type Phase1EventName = keyof typeof PHASE1_EVENT_PROP_SCHEMAS;

export const PHASE1_EVENT_CATEGORY: Record<
  Phase1EventName,
  | "session"
  | "navigation"
  | "premium"
  | "growth"
  | "performance"
  | "error"
> = {
  screen_view: "navigation",
  screen_leave: "navigation",
  navigation: "navigation",
  button_click: "navigation",
  feature_open: "navigation",
  feature_complete: "navigation",
  session_end: "session",
  first_open: "session",
  search_query: "navigation",
  search_no_results: "navigation",
  asset_download: "navigation",
  subscription_funnel_event: "premium",
  onboarding_funnel_event: "growth",
  growth_funnel_event: "growth",
  performance_metric: "performance",
  error_captured: "error",
  daily_checkin: "growth",
  streak_started: "growth",
  streak_extended: "growth",
  streak_lost: "growth",
  reward_claimed: "growth",
  goal_completed: "growth",
  weekly_summary_viewed: "growth",
  resume_clicked: "growth",
  notification_opened: "growth",
  notification_scheduled: "growth",
  notification_sent: "growth",
  notification_suppressed: "growth",
  notification_delivered: "growth",
  notification_dismissed: "growth",
  notification_action_clicked: "growth",
  notification_deep_link_opened: "growth",
  return_after_push: "growth",
  achievement_unlocked_retention: "growth",
  inactive_days: "growth",
  winback_opened: "growth",
};
