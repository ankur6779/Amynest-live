/**
 * RevenueCat webhook classes for dashboards.
 * Webhook row counts are not paid conversions.
 * Only `countsAsPaidConversion` may be summed as paid.
 */
export const REVENUECAT_WEBHOOK_CLASSES = [
  "trial",
  "paid_initial",
  "introductory",
  "renewal",
  "trial_conversion",
  "cancellation",
  "refund",
  "billing_issue",
  "unknown",
] as const;

export type RevenueCatWebhookClass = (typeof REVENUECAT_WEBHOOK_CLASSES)[number];

export type RevenueCatWebhookClassification = {
  class: RevenueCatWebhookClass;
  countsAsPaidConversion: boolean;
  funnelStep: string;
};

export type RevenueCatWebhookClassificationInput = {
  type?: string | null;
  period_type?: string | null;
  price?: number | null;
  is_trial_conversion?: boolean | null;
  cancel_reason?: string | null;
};

function period(input: RevenueCatWebhookClassificationInput): string {
  return (input.period_type ?? "").trim().toUpperCase();
}

export function classifyRevenueCatWebhook(
  input: RevenueCatWebhookClassificationInput,
): RevenueCatWebhookClassification {
  const type = (input.type ?? "").trim().toUpperCase();
  const periodType = period(input);

  if (type === "BILLING_ISSUE") {
    return { class: "billing_issue", countsAsPaidConversion: false, funnelStep: "billing_issue" };
  }
  if (type === "REFUND" || type === "REFUND_REVERSED") {
    return { class: "refund", countsAsPaidConversion: false, funnelStep: "refund" };
  }
  if (type === "CANCELLATION") {
    return {
      class: input.cancel_reason === "CUSTOMER_SUPPORT" ? "refund" : "cancellation",
      countsAsPaidConversion: false,
      funnelStep: input.cancel_reason === "CUSTOMER_SUPPORT" ? "refund" : "subscription_cancelled",
    };
  }
  if (type === "RENEWAL" && input.is_trial_conversion === true) {
    return { class: "trial_conversion", countsAsPaidConversion: true, funnelStep: "trial_converted" };
  }
  if (type === "RENEWAL") {
    return { class: "renewal", countsAsPaidConversion: true, funnelStep: "subscription_renewed" };
  }
  if (type === "INITIAL_PURCHASE" && periodType === "TRIAL") {
    return { class: "trial", countsAsPaidConversion: false, funnelStep: "trial_started" };
  }
  if (type === "INITIAL_PURCHASE" && periodType === "INTRO") {
    return { class: "introductory", countsAsPaidConversion: false, funnelStep: "introductory_purchase" };
  }
  if (
    type === "INITIAL_PURCHASE" &&
    periodType === "NORMAL" &&
    (input.price == null || input.price > 0)
  ) {
    return { class: "paid_initial", countsAsPaidConversion: true, funnelStep: "subscription_started" };
  }
  return { class: "unknown", countsAsPaidConversion: false, funnelStep: "unclassified_webhook" };
}

const STORED_EVENT_KEYS = [
  "type",
  "id",
  "period_type",
  "product_id",
  "store",
  "environment",
  "price",
  "currency",
  "transaction_id",
  "original_transaction_id",
  "expiration_at_ms",
  "purchased_at_ms",
  "event_timestamp_ms",
  "cancel_reason",
  "is_trial_conversion",
] as const;

/** Persist a classification snapshot. Never store the raw RevenueCat body. */
export function redactRevenueCatWebhookPayload(body: unknown): Record<string, unknown> {
  const event =
    body && typeof body === "object" && "event" in body
      ? (body as { event?: unknown }).event
      : null;
  const source = event && typeof event === "object" ? (event as Record<string, unknown>) : {};
  const stored: Record<string, unknown> = {};
  for (const key of STORED_EVENT_KEYS) {
    if (source[key] !== undefined) stored[key] = source[key];
  }
  const classification = classifyRevenueCatWebhook({
    type: typeof source.type === "string" ? source.type : null,
    period_type: typeof source.period_type === "string" ? source.period_type : null,
    price: typeof source.price === "number" ? source.price : null,
    is_trial_conversion: typeof source.is_trial_conversion === "boolean" ? source.is_trial_conversion : null,
    cancel_reason: typeof source.cancel_reason === "string" ? source.cancel_reason : null,
  });
  return {
    event: stored,
    classification: classification.class,
    countsAsPaidConversion: classification.countsAsPaidConversion,
  };
}
