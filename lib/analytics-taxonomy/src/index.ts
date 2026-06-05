import { z } from "zod";

/**
 * AmyNest analytics taxonomy — the single source of truth for product
 * analytics events. Imported by BOTH the API server (to validate ingested
 * events) and the web app (to get typed `track()` calls), so the two can
 * never drift.
 *
 * This layer is pure measurement. It lives above the frozen routine engine
 * and MUST NOT feed routine generation.
 *
 * Adding an event:
 *   1. Add a prop schema below.
 *   2. Register it in ANALYTICS_EVENTS with its category.
 *   3. Both client typing and server validation update automatically.
 */

export const ANALYTICS_EVENT_CATEGORIES = [
  "session",
  "routine",
  "feedback",
  "premium",
] as const;

export type AnalyticsEventCategory = (typeof ANALYTICS_EVENT_CATEGORIES)[number];

const routineMode = z.enum(["ai", "rule", "fallback"]);
const routineDateMode = z.enum(["today", "past", "future"]);
const feedbackSignal = z.enum([
  "worked_well",
  "loved_this",
  "too_tiring",
  "skipped",
  "bedtime_smooth",
]);

/**
 * Per-event property schemas. Schemas are intentionally non-strict
 * (unknown/forward-compat keys are allowed) but every *declared* key is
 * type-validated so data-quality checks catch malformed payloads.
 */
const EVENT_PROP_SCHEMAS = {
  // ── session ──────────────────────────────────────────────────────────
  app_open: z.object({
    cold: z.boolean().optional(),
    referrer: z.string().max(256).optional(),
  }),
  session_start: z.object({
    durationSinceLastMs: z.number().int().nonnegative().optional(),
  }),

  // ── routine lifecycle ────────────────────────────────────────────────
  routine_generated: z.object({
    routineId: z.number().int().optional(),
    childId: z.number().int().optional(),
    mode: routineMode.optional(),
    itemCount: z.number().int().nonnegative().optional(),
    source: z.string().max(64).optional(),
  }),
  routine_viewed: z.object({
    routineId: z.number().int().optional(),
    childId: z.number().int().optional(),
    dateMode: routineDateMode.optional(),
    itemCount: z.number().int().nonnegative().optional(),
  }),
  routine_item_completed: z.object({
    routineId: z.number().int().optional(),
    childId: z.number().int().optional(),
    activityKey: z.string().max(160).optional(),
    category: z.string().max(64).optional(),
  }),
  routine_item_skipped: z.object({
    routineId: z.number().int().optional(),
    childId: z.number().int().optional(),
    activityKey: z.string().max(160).optional(),
    category: z.string().max(64).optional(),
  }),

  // ── feedback loop (Priority 1) ───────────────────────────────────────
  routine_feedback_submitted: z.object({
    routineId: z.number().int().optional(),
    childId: z.number().int().optional(),
    signal: feedbackSignal,
    activityKey: z.string().max(160).nullable().optional(),
    scope: z.enum(["routine", "activity"]).optional(),
  }),

  // ── premium funnel ───────────────────────────────────────────────────
  premium_paywall_viewed: z.object({
    source: z.string().max(64).optional(),
  }),
  premium_cta_clicked: z.object({
    source: z.string().max(64).optional(),
  }),
} as const;

export type AnalyticsEventName = keyof typeof EVENT_PROP_SCHEMAS;

const EVENT_CATEGORY: Record<AnalyticsEventName, AnalyticsEventCategory> = {
  app_open: "session",
  session_start: "session",
  routine_generated: "routine",
  routine_viewed: "routine",
  routine_item_completed: "routine",
  routine_item_skipped: "routine",
  routine_feedback_submitted: "feedback",
  premium_paywall_viewed: "premium",
  premium_cta_clicked: "premium",
};

export const ANALYTICS_EVENT_NAMES = Object.keys(
  EVENT_PROP_SCHEMAS,
) as AnalyticsEventName[];

/** Map of event name → its zod props schema. */
export const ANALYTICS_EVENTS = EVENT_PROP_SCHEMAS;

/** Typed props for a given event, e.g. AnalyticsEventProps<"routine_viewed">. */
export type AnalyticsEventProps<E extends AnalyticsEventName> = z.infer<
  (typeof EVENT_PROP_SCHEMAS)[E]
>;

export function isKnownAnalyticsEvent(
  name: string,
): name is AnalyticsEventName {
  return Object.prototype.hasOwnProperty.call(EVENT_PROP_SCHEMAS, name);
}

export function analyticsEventCategory(
  name: AnalyticsEventName,
): AnalyticsEventCategory {
  return EVENT_CATEGORY[name];
}

export type AnalyticsValidationResult =
  | { valid: true; name: AnalyticsEventName; category: AnalyticsEventCategory; props: Record<string, unknown> }
  | { valid: false; reason: "unknown_event" | "invalid_props"; errors?: string[] };

/**
 * Validate a single event against the taxonomy. Used by the server ingest
 * path to gate writes and by tests. Unknown event names and props that fail
 * their schema are both rejected (and should be counted for data quality).
 */
export function validateAnalyticsEvent(
  name: string,
  props: unknown,
): AnalyticsValidationResult {
  if (!isKnownAnalyticsEvent(name)) {
    return { valid: false, reason: "unknown_event" };
  }
  const schema = EVENT_PROP_SCHEMAS[name];
  const parsed = schema.safeParse(props ?? {});
  if (!parsed.success) {
    return {
      valid: false,
      reason: "invalid_props",
      errors: parsed.error.issues.map(
        (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
      ),
    };
  }
  return {
    valid: true,
    name,
    category: EVENT_CATEGORY[name],
    props: parsed.data as Record<string, unknown>,
  };
}

/** Max accepted batch size for a single ingest request. */
export const ANALYTICS_MAX_BATCH = 50;
/** Serialized props larger than this (bytes) are rejected as malformed. */
export const ANALYTICS_MAX_PROPS_BYTES = 8_000;
