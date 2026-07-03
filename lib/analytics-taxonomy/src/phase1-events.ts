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
};
