import { z } from "zod";

/**
 * First-value activation funnel — dashboard → routine generation → retention.
 * Production evidence: 89.9% dashboard→routine drop; routine users retain 4× on D1.
 */
export const FIRST_VALUE_EVENT_PROP_SCHEMAS = {
  dashboard_view: z.object({
    user_state: z.string().max(48).optional(),
    has_today_routine: z.boolean().optional(),
    routine_count: z.number().int().nonnegative().optional(),
    child_count: z.number().int().nonnegative().optional(),
    source: z.string().max(64).optional(),
  }),
  routine_cta_clicked: z.object({
    source: z.string().max(64),
    screen: z.string().max(128).optional(),
    child_id: z.number().int().optional(),
    user_state: z.string().max(48).optional(),
  }),
  routine_generation_completed: z.object({
    routine_id: z.number().int().optional(),
    child_id: z.number().int().optional(),
    mode: z.enum(["ai", "rule", "fallback"]).optional(),
    item_count: z.number().int().nonnegative().optional(),
    source: z.string().max(64).optional(),
    is_first_routine: z.boolean().optional(),
  }),
  routine_opened: z.object({
    routine_id: z.number().int().optional(),
    child_id: z.number().int().optional(),
    date_mode: z.enum(["today", "past", "future"]).optional(),
    item_count: z.number().int().nonnegative().optional(),
    source: z.string().max(64).optional(),
    is_first_routine: z.boolean().optional(),
  }),
  routine_saved: z.object({
    routine_id: z.number().int().optional(),
    child_id: z.number().int().optional(),
    source: z.string().max(64).optional(),
    is_first_routine: z.boolean().optional(),
  }),
  routine_shared: z.object({
    routine_id: z.number().int().optional(),
    child_id: z.number().int().optional(),
    method: z.enum(["whatsapp", "copy", "native", "unknown"]).optional(),
    source: z.string().max(64).optional(),
  }),
  first_value_achieved: z.object({
    routine_id: z.number().int().optional(),
    child_id: z.number().int().optional(),
    source: z.string().max(64).optional(),
    minutes_since_signup: z.number().nonnegative().optional(),
  }),
} as const;

export const FIRST_VALUE_EVENT_CATEGORY = {
  dashboard_view: "growth",
  routine_cta_clicked: "growth",
  routine_generation_completed: "routine",
  routine_opened: "routine",
  routine_saved: "routine",
  routine_shared: "routine",
  first_value_achieved: "growth",
} as const satisfies Record<keyof typeof FIRST_VALUE_EVENT_PROP_SCHEMAS, string>;

export type FirstValueEventName = keyof typeof FIRST_VALUE_EVENT_PROP_SCHEMAS;
