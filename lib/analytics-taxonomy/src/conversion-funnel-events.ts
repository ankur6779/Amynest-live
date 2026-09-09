import { z } from "zod";

/**
 * Canonical parent-conversion funnel.
 * Existing aliases (app_open, premium_paywall_viewed, upgrade_completed, …)
 * remain valid; clients should prefer these names going forward.
 */

const funnelContext = {
  auth_state: z.enum(["guest", "authenticated", "unknown"]).optional(),
  platform: z.string().max(32).optional(),
  install_source: z.string().max(64).optional(),
  utm_source: z.string().max(128).optional(),
  utm_medium: z.string().max(128).optional(),
  utm_campaign: z.string().max(128).optional(),
  gclid: z.string().max(128).optional(),
  fbclid: z.string().max(128).optional(),
  experiment_variant: z.string().max(64).optional(),
  subscription_state: z.string().max(32).optional(),
  source: z.string().max(64).optional(),
};

export const CONVERSION_FUNNEL_EVENT_PROP_SCHEMAS = {
  onboarding_started: z.object({
    ...funnelContext,
    discovery_film: z.boolean().optional(),
  }),
  child_created: z.object({
    ...funnelContext,
    child_id: z.number().int().optional(),
    age_band: z.string().max(32).optional(),
  }),
  onboarding_completed: z.object({
    ...funnelContext,
    discovery_film: z.boolean().optional(),
    child_id: z.number().int().optional(),
  }),
  first_plan_generated: z.object({
    ...funnelContext,
    routine_id: z.number().int().optional(),
    child_id: z.number().int().optional(),
    item_count: z.number().int().nonnegative().optional(),
    reused: z.boolean().optional(),
    mode: z.enum(["ai", "rule", "fallback", "guest"]).optional(),
  }),
  first_plan_action_started: z.object({
    ...funnelContext,
    routine_id: z.number().int().optional(),
    child_id: z.number().int().optional(),
    block_id: z.string().max(64).optional(),
  }),
  first_plan_action_completed: z.object({
    ...funnelContext,
    routine_id: z.number().int().optional(),
    child_id: z.number().int().optional(),
    block_id: z.string().max(64).optional(),
  }),
  paywall_view: z.object({
    ...funnelContext,
    reason: z.string().max(64).optional(),
  }),
  paywall_dismiss: z.object({
    ...funnelContext,
    reason: z.string().max(64).optional(),
  }),
  subscribe_clicked: z.object({
    ...funnelContext,
    plan: z.string().max(32).optional(),
    reason: z.string().max(64).optional(),
  }),
  checkout_started: z.object({
    ...funnelContext,
    plan: z.string().max(32).optional(),
    reason: z.string().max(64).optional(),
  }),
  purchase_success: z.object({
    ...funnelContext,
    plan: z.string().max(32).optional(),
    transaction_id: z.string().max(128).optional(),
  }),
  purchase_failed: z.object({
    ...funnelContext,
    plan: z.string().max(32).optional(),
    error_class: z.string().max(64).optional(),
  }),
  subscription_active: z.object({
    ...funnelContext,
    plan: z.string().max(32).optional(),
    provider: z.string().max(32).optional(),
  }),
  restore_purchase: z.object({
    ...funnelContext,
    restored: z.boolean().optional(),
  }),
} as const;

export const CONVERSION_FUNNEL_EVENT_CATEGORY = {
  onboarding_started: "growth",
  child_created: "growth",
  onboarding_completed: "growth",
  first_plan_generated: "growth",
  first_plan_action_started: "growth",
  first_plan_action_completed: "growth",
  paywall_view: "premium",
  paywall_dismiss: "premium",
  subscribe_clicked: "premium",
  checkout_started: "premium",
  purchase_success: "premium",
  purchase_failed: "premium",
  subscription_active: "premium",
  restore_purchase: "premium",
} as const satisfies Record<keyof typeof CONVERSION_FUNNEL_EVENT_PROP_SCHEMAS, string>;

export const CANONICAL_FUNNEL_EVENTS = [
  "first_open",
  "onboarding_started",
  "child_created",
  "onboarding_completed",
  "first_plan_generated",
  "first_value_achieved",
  "first_plan_action_started",
  "first_plan_action_completed",
  "paywall_view",
  "paywall_dismiss",
  "subscribe_clicked",
  "checkout_started",
  "purchase_success",
  "purchase_failed",
  "subscription_active",
  "restore_purchase",
] as const;

export type CanonicalFunnelEvent = (typeof CANONICAL_FUNNEL_EVENTS)[number];
export type ConversionFunnelEventName = keyof typeof CONVERSION_FUNNEL_EVENT_PROP_SCHEMAS;
