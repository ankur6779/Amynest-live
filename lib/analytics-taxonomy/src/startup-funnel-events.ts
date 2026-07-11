import { z } from "zod";
import { CHILD_JOURNEY_EVENT_NAMES } from "./child-journey-events.js";

/** Milestone events along the install → signup funnel. */
export const STARTUP_FUNNEL_MILESTONE_EVENTS = [
  "app_install_first_open",
  "app_open",
  "native_splash_started",
  "native_splash_finished",
  "webview_created",
  "webview_page_started",
  "webview_page_finished",
  "react_bundle_started",
  "react_bundle_loaded",
  "react_first_render",
  "firebase_init_started",
  "firebase_init_finished",
  "auth_started",
  "auth_finished",
  "version_check_started",
  "version_check_finished",
  "appcore_started",
  "appcore_loaded",
  "router_ready",
  "login_screen_visible",
  "signup_screen_visible",
  "signup_started",
  "account_created",
  "home_visible",
  "onboarding_complete",
  "routine_generated",
] as const;

/** Failure and anomaly events during startup. */
export const STARTUP_FUNNEL_FAILURE_EVENTS = [
  "startup_timeout",
  "firebase_failed",
  "auth_timeout",
  "auth_failed",
  "chunk_load_failed",
  "webview_error",
  "dns_failure",
  "api_timeout",
  "offline_launch",
  "network_lost",
  "cache_recovery",
  "reload_triggered",
  "permission_denied",
  "blank_screen_detected",
  "white_screen_detected",
  "javascript_exception",
  "react_render_failed",
] as const;

export const STARTUP_FUNNEL_EVENT_NAMES = [
  ...STARTUP_FUNNEL_MILESTONE_EVENTS,
  ...CHILD_JOURNEY_EVENT_NAMES,
  ...STARTUP_FUNNEL_FAILURE_EVENTS,
] as const;

export type StartupFunnelEventName = (typeof STARTUP_FUNNEL_EVENT_NAMES)[number];

export type StartupFunnelEventType = "milestone" | "failure" | "performance";

export function classifyStartupFunnelEvent(name: string): StartupFunnelEventType {
  if ((STARTUP_FUNNEL_FAILURE_EVENTS as readonly string[]).includes(name)) {
    return "failure";
  }
  return "milestone";
}

const metaSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
  .optional();

export const startupFunnelEventBodySchema = z.object({
  event_name: z.enum(STARTUP_FUNNEL_EVENT_NAMES),
  event_type: z.enum(["milestone", "failure", "performance"]).optional(),
  client_ts: z.number().optional(),
  elapsed_ms: z.number().int().nonnegative().optional(),
  session_id: z.string().min(8).max(128),
  install_id: z.string().min(8).max(128),
  device_id: z.string().min(8).max(128),
  device_model: z.string().max(128).optional(),
  manufacturer: z.string().max(128).optional(),
  android_version: z.string().max(32).optional(),
  webview_version: z.string().max(64).optional(),
  app_version: z.string().max(64).optional(),
  build_number: z.string().max(64).optional(),
  network_type: z.string().max(32).optional(),
  carrier: z.string().max(64).optional(),
  locale: z.string().max(32).optional(),
  timezone: z.string().max(64).optional(),
  memory_class: z.string().max(32).optional(),
  battery_saver: z.boolean().optional(),
  platform: z.string().max(32).optional(),
  country: z.string().max(8).optional(),
  language: z.string().max(16).optional(),
  screen_width: z.number().int().positive().optional(),
  screen_height: z.number().int().positive().optional(),
  cpu_architecture: z.string().max(32).optional(),
  play_store_version: z.string().max(32).optional(),
  startup_phase: z.string().max(64).optional(),
  start_type: z.enum(["cold", "warm", "hot"]).optional(),
  failure_stack: z.string().max(8000).optional(),
  failure_file: z.string().max(512).optional(),
  failure_line: z.number().int().optional(),
  meta: metaSchema,
});

export const startupFunnelBatchBodySchema = z.object({
  events: z.array(startupFunnelEventBodySchema).min(1).max(50),
});

export type StartupFunnelEventPayload = z.infer<typeof startupFunnelEventBodySchema>;
