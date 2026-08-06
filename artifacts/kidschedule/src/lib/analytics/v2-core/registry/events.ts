/**
 * GENERATED FILE — do not edit by hand.
 *
 * Machine source of truth:
 *   docs/v2/ANALYTICS_EVENT_REGISTRY.json
 *
 * Regenerate:
 *   pnpm --filter @workspace/kidschedule generate:analytics-v2-registry
 *
 * Check drift:
 *   pnpm --filter @workspace/kidschedule check:analytics-v2-registry
 */

import type { V2RegistryEventDefinition } from "../types";

function def(
  partial: V2RegistryEventDefinition,
): V2RegistryEventDefinition {
  return partial;
}

/** Active (+ allowed) registry events — unknown names FAIL. */
export const V2_ANALYTICS_REGISTRY: readonly V2RegistryEventDefinition[] = [
  def({
    eventName: "v2_wow_completed",
    description:
      "User finished Breath → first practice success within 90 seconds of Front Door start.",
    owner: "fe.front_door",
    layer: "product",
    status: "active",
    eventVersion: 1,
    onceKeyTemplate: "wow:{anonymousId}",
    requiredPayloadKeys: ["elapsed_ms", "practice_id"],
    firebase: true,
    googleAds: false,
    internal: true,
    canOptimize: false,
  }),
  def({
    eventName: "v2_mission_started",
    description:
      "User started Today's single Speech mission (intent).",
    owner: "fe.today_mission",
    layer: "product",
    status: "active",
    eventVersion: 1,
    onceKeyTemplate: "mission_start:{anonymousId}:{mission_id}:{date_key}",
    requiredPayloadKeys: ["mission_id", "date_key"],
    firebase: true,
    googleAds: false,
    internal: true,
    canOptimize: false,
  }),
  def({
    eventName: "v2_mission_completed",
    description:
      "User marked Today's Speech mission complete (success).",
    owner: "fe.today_mission",
    layer: "product",
    status: "active",
    eventVersion: 1,
    onceKeyTemplate: "mission_done:{anonymousId}:{mission_id}:{date_key}",
    requiredPayloadKeys: ["mission_id", "date_key"],
    firebase: true,
    googleAds: false,
    internal: true,
    canOptimize: false,
  }),
  def({
    eventName: "today_viewed",
    description:
      "Today shell impressed once per session.",
    owner: "fe.today",
    layer: "product",
    status: "active",
    eventVersion: 1,
    onceKeyTemplate: "today:{anonymousId}:{sessionId}",
    requiredPayloadKeys: [],
    firebase: false,
    googleAds: false,
    internal: true,
    canOptimize: false,
  }),
  def({
    eventName: "v2_d1_returned",
    description:
      "User returned on calendar day D+1 after cohort day 0.",
    owner: "fe.analytics_bootstrap",
    layer: "business",
    status: "active",
    eventVersion: 1,
    onceKeyTemplate: "d1:{anonymousId}:{cohort_day0}",
    requiredPayloadKeys: ["cohort_day0", "return_date"],
    firebase: true,
    googleAds: false,
    internal: true,
    canOptimize: false,
  }),
  def({
    eventName: "v2_practice_day3",
    description:
      "User reached ≥2 practice/mission completions by end of day 3.",
    owner: "fe.practice_counter",
    layer: "business",
    status: "active",
    eventVersion: 1,
    onceKeyTemplate: "day3:{anonymousId}",
    requiredPayloadKeys: ["cohort_day0", "practice_count", "reached_on_date"],
    firebase: true,
    googleAds: false,
    internal: true,
    canOptimize: false,
  }),
  def({
    eventName: "v2_paid_conversion",
    description:
      "Business North Star #5: activated real paying parent.",
    owner: "fe.billing_finalize",
    layer: "business",
    status: "active",
    eventVersion: 1,
    onceKeyTemplate: "paid:{transaction_id}",
    requiredPayloadKeys: ["transaction_id", "plan_id", "provider", "activated"],
    firebase: false,
    googleAds: false,
    internal: true,
    canOptimize: false,
  }),
  def({
    eventName: "v2_identity_link",
    description:
      "Guest/anonymous identity linked to account.",
    owner: "fe.identity",
    layer: "business",
    status: "active",
    eventVersion: 1,
    onceKeyTemplate: "link:{anonymousId}:{user_id}",
    requiredPayloadKeys: ["user_id"],
    firebase: false,
    googleAds: false,
    internal: true,
    canOptimize: false,
  }),
  def({
    eventName: "premium_view",
    description:
      "Premium V2 journey impressed.",
    owner: "fe.premium_v2",
    layer: "commerce",
    status: "active",
    eventVersion: 1,
    onceKeyTemplate: "prem_view:{anonymousId}:{date_key}",
    requiredPayloadKeys: ["date_key"],
    firebase: false,
    googleAds: false,
    internal: true,
    canOptimize: false,
  }),
  def({
    eventName: "premium_checkout",
    description:
      "User committed to pay with a selected plan.",
    owner: "fe.premium_v2",
    layer: "commerce",
    status: "active",
    eventVersion: 1,
    onceKeyTemplate: "prem_chk:{anonymousId}:{plan_id}:{attempt_id}",
    requiredPayloadKeys: ["plan_id", "attempt_id"],
    firebase: false,
    googleAds: false,
    internal: true,
    canOptimize: false,
  }),
  def({
    eventName: "premium_restore_success",
    description:
      "Restore purchases succeeded.",
    owner: "fe.premium_v2",
    layer: "commerce",
    status: "active",
    eventVersion: 1,
    onceKeyTemplate: "prem_restore:{anonymousId}:{date_key}:ok",
    requiredPayloadKeys: ["date_key"],
    firebase: false,
    googleAds: false,
    internal: true,
    canOptimize: false,
  }),
  def({
    eventName: "premium_restore_fail",
    description:
      "Restore purchases failed.",
    owner: "fe.premium_v2",
    layer: "commerce",
    status: "active",
    eventVersion: 1,
    onceKeyTemplate: "prem_restore:{anonymousId}:{date_key}:fail",
    requiredPayloadKeys: ["date_key"],
    firebase: false,
    googleAds: false,
    internal: true,
    canOptimize: false,
  }),
  def({
    eventName: "premium_already",
    description:
      "Premium journey shown as already unlocked.",
    owner: "fe.premium_v2",
    layer: "commerce",
    status: "active",
    eventVersion: 1,
    onceKeyTemplate: "prem_already:{anonymousId}:{date_key}",
    requiredPayloadKeys: ["date_key"],
    firebase: false,
    googleAds: false,
    internal: true,
    canOptimize: false,
  }),
  def({
    eventName: "premium_fail",
    description:
      "Purchase attempt failed (not cancel).",
    owner: "fe.premium_v2",
    layer: "commerce",
    status: "active",
    eventVersion: 1,
    onceKeyTemplate: "prem_fail:{anonymousId}:{attempt_id}",
    requiredPayloadKeys: ["attempt_id"],
    firebase: false,
    googleAds: false,
    internal: true,
    canOptimize: false,
  }),
  def({
    eventName: "premium_offline",
    description:
      "Premium action blocked by offline.",
    owner: "fe.premium_v2",
    layer: "commerce",
    status: "active",
    eventVersion: 1,
    onceKeyTemplate: "prem_off:{anonymousId}:{sessionId}:{context}",
    requiredPayloadKeys: ["context"],
    firebase: false,
    googleAds: false,
    internal: true,
    canOptimize: false,
  }),
  def({
    eventName: "ads_begin_checkout",
    description:
      "Ads/Firebase checkout intent signal (never optimize).",
    owner: "fe.attribution_native",
    layer: "commerce",
    status: "active",
    eventVersion: 1,
    onceKeyTemplate: "ads_chk:{anonymousId}:{plan_id}:{attempt_id}",
    requiredPayloadKeys: ["plan_id", "attempt_id", "value", "currency", "item_id"],
    firebase: true,
    googleAds: true,
    internal: true,
    canOptimize: false,
  }),
  def({
    eventName: "ads_purchase",
    description:
      "Sole Google Ads optimization signal (store-confirmed).",
    owner: "fe.attribution_native",
    layer: "ads",
    status: "active",
    eventVersion: 1,
    onceKeyTemplate: "ads_paid:{transaction_id}",
    requiredPayloadKeys: ["transaction_id", "plan_id", "value", "currency", "item_id"],
    firebase: true,
    googleAds: true,
    internal: true,
    canOptimize: true,
  }),
  def({
    eventName: "sys_sign_up",
    description:
      "Account created.",
    owner: "fe.auth",
    layer: "system",
    status: "active",
    eventVersion: 1,
    onceKeyTemplate: "signup:{user_id}",
    requiredPayloadKeys: ["method", "user_id"],
    firebase: true,
    googleAds: true,
    internal: true,
    canOptimize: false,
  }),
  def({
    eventName: "sys_analytics_native_fallback",
    description:
      "Native Firebase log failed; JS fallback used.",
    owner: "fe.attribution_adapter",
    layer: "system",
    status: "active",
    eventVersion: 1,
    onceKeyTemplate: "native_fb:{anonymousId}:{ref}:{kind}",
    requiredPayloadKeys: ["kind", "reason", "ref"],
    firebase: false,
    googleAds: false,
    internal: true,
    canOptimize: false,
  }),
] as const;

const BY_NAME = new Map(
  V2_ANALYTICS_REGISTRY.map((e) => [e.eventName, e] as const),
);

export function getRegistryEvent(
  eventName: string,
): V2RegistryEventDefinition | undefined {
  return BY_NAME.get(eventName);
}

export function listRegistryEventNames(): readonly string[] {
  return V2_ANALYTICS_REGISTRY.map((e) => e.eventName);
}

/** Exactly one event may be Ads-optimizable. */
export function assertOptimizeCardinality(): void {
  const opts = V2_ANALYTICS_REGISTRY.filter((e) => e.canOptimize);
  if (opts.length !== 1 || opts[0]?.eventName !== "ads_purchase") {
    throw new Error(
      `Registry optimize cardinality invalid: ${opts.map((e) => e.eventName).join(",")}`,
    );
  }
}
