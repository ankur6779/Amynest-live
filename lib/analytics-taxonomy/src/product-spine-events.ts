import { z } from "zod";

/**
 * Product-spine events added for page, feature, and session continuity.
 * Existing names (screen_view, first_open, paywall_view, child_created, …)
 * stay valid. Do not emit both a legacy name and its alias for the same action.
 */
const pageContext = {
  screen: z.string().max(256).optional(),
  path: z.string().max(512).optional(),
  page_name: z.string().max(256).optional(),
  page_path: z.string().max(512).optional(),
  previous_page: z.string().max(256).optional(),
  next_page: z.string().max(256).optional(),
  referrer_page: z.string().max(256).optional(),
  route_transition_id: z.string().max(64).optional(),
  page_visit_id: z.string().max(64).optional(),
  feature_name: z.string().max(80).optional(),
  navigation_source: z.string().max(64).optional(),
};

export const PRODUCT_SPINE_EVENT_PROP_SCHEMAS = {
  page_view: z.object({
    ...pageContext,
    screen: z.string().max(256),
  }),
  page_exit: z.object({
    ...pageContext,
    screen: z.string().max(256),
    page_duration_ms: z.number().int().nonnegative().optional(),
    active_duration_ms: z.number().int().nonnegative().optional(),
    time_on_screen_ms: z.number().int().nonnegative().optional(),
  }),
  feature_viewed: z.object({
    feature_name: z.string().max(80),
    screen: z.string().max(256).optional(),
    path: z.string().max(512).optional(),
    page_visit_id: z.string().max(64).optional(),
    source: z.string().max(64).optional(),
  }),
  feature_started: z.object({
    feature_name: z.string().max(80),
    screen: z.string().max(256).optional(),
    path: z.string().max(512).optional(),
    source: z.string().max(64).optional(),
  }),
  feature_interaction: z.object({
    feature_name: z.string().max(80),
    interaction_type: z.string().max(64).optional(),
    screen: z.string().max(256).optional(),
    source: z.string().max(64).optional(),
  }),
  feature_completed: z.object({
    feature_name: z.string().max(80),
    duration_ms: z.number().int().nonnegative().optional(),
    success: z.boolean().optional(),
    screen: z.string().max(256).optional(),
  }),
  feature_abandoned: z.object({
    feature_name: z.string().max(80),
    duration_ms: z.number().int().nonnegative().optional(),
    screen: z.string().max(256).optional(),
    reason: z.string().max(64).optional(),
  }),
  feature_error: z.object({
    feature_name: z.string().max(80),
    error_class: z.string().max(64).optional(),
    screen: z.string().max(256).optional(),
  }),
  app_background: z.object({
    foreground_ms: z.number().int().nonnegative().optional(),
  }),
  app_foreground: z.object({
    background_ms: z.number().int().nonnegative().optional(),
  }),
  session_heartbeat: z.object({
    active_ms: z.number().int().nonnegative().optional(),
    interval_ms: z.number().int().positive().optional(),
  }),
  scroll_milestone: z.object({
    screen: z.string().max(256),
    depth_pct: z.union([
      z.literal(25),
      z.literal(50),
      z.literal(75),
      z.literal(100),
    ]),
    page_visit_id: z.string().max(64).optional(),
  }),
  onboarding_step_completed: z.object({
    onboarding_step: z.string().max(64).optional(),
    source: z.string().max(64).optional(),
  }),
  first_feature_used: z.object({
    feature_name: z.string().max(80),
    source: z.string().max(64).optional(),
  }),
  ask_amy_message_sent: z.object({
    message_chars: z.number().int().nonnegative().optional(),
    language: z.string().max(16).optional(),
    has_child_context: z.boolean().optional(),
  }),
  ask_amy_response_received: z.object({
    success: z.boolean(),
    latency_ms: z.number().int().nonnegative().optional(),
    status_code: z.number().int().optional(),
    error_class: z.string().max(64).optional(),
  }),
  story_opened: z.object({
    story_id: z.number().int().nonnegative().optional(),
    feature_name: z.string().max(80).optional(),
  }),
  video_started: z.object({
    story_id: z.number().int().nonnegative().optional(),
    feature_name: z.string().max(80).optional(),
  }),
  video_completed: z.object({
    story_id: z.number().int().nonnegative().optional(),
    feature_name: z.string().max(80).optional(),
    duration_ms: z.number().int().nonnegative().optional(),
  }),
  worksheet_opened: z.object({
    feature_name: z.string().max(80).optional(),
    source: z.string().max(64).optional(),
  }),
  worksheet_downloaded: z.object({
    feature_name: z.string().max(80).optional(),
    asset_type: z.string().max(64).optional(),
  }),
  coloring_activity_started: z.object({
    feature_name: z.string().max(80).optional(),
    source: z.string().max(64).optional(),
  }),
  coloring_activity_completed: z.object({
    feature_name: z.string().max(80).optional(),
    source: z.string().max(64).optional(),
  }),
  subscription_cancelled: z.object({
    source: z.string().max(32).optional(),
    provider: z.string().max(32).optional(),
    authoritative: z.boolean().optional(),
  }),
} as const;

export const PRODUCT_SPINE_EVENT_CATEGORY = {
  page_view: "navigation",
  page_exit: "navigation",
  feature_viewed: "navigation",
  feature_started: "navigation",
  feature_interaction: "navigation",
  feature_completed: "navigation",
  feature_abandoned: "navigation",
  feature_error: "error",
  app_background: "session",
  app_foreground: "session",
  session_heartbeat: "session",
  scroll_milestone: "navigation",
  onboarding_step_completed: "growth",
  first_feature_used: "growth",
  ask_amy_message_sent: "learning",
  ask_amy_response_received: "learning",
  story_opened: "learning",
  video_started: "learning",
  video_completed: "learning",
  worksheet_opened: "learning",
  worksheet_downloaded: "learning",
  coloring_activity_started: "learning",
  coloring_activity_completed: "learning",
  subscription_cancelled: "premium",
} as const satisfies Record<
  keyof typeof PRODUCT_SPINE_EVENT_PROP_SCHEMAS,
  "navigation" | "session" | "growth" | "learning" | "error" | "premium"
>;
