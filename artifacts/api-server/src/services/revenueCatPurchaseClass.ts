/**
 * RevenueCat webhook classification for analytics.
 * This does not rewrite stored rows. It only decides what a newly received
 * webhook is allowed to record.
 *
 * Gross price is the webhook `price` when RevenueCat sends one.
 * Taxes, store commission, and net proceeds are not in that payload.
 */

export type PurchaseClass =
  | "paid"
  | "introductory"
  | "unknown";

export type RevenueCatAnalyticsDecision = {
  eventType: string;
  /** When true, a server purchase_success row may be written. */
  recordPaidPurchase: boolean;
  /** When true, the row may be counted as a paid conversion. */
  countsAsPaid: boolean;
  purchaseClass: PurchaseClass | null;
  funnelStep: string | null;
  revenue: "gross_present" | "gross_missing" | "not_applicable";
};

export function classifyRevenueCatWebhook(input: {
  type?: string | null;
  periodType?: string | null;
  cancelReason?: string | null;
  price?: number | null;
}): RevenueCatAnalyticsDecision {
  const eventType = (input.type ?? "").trim().toUpperCase();
  const period = (input.periodType ?? "").trim().toUpperCase();
  const price = typeof input.price === "number" && Number.isFinite(input.price) ? input.price : null;
  const revenue = price === null ? "gross_missing" : "gross_present";

  if (eventType === "INITIAL_PURCHASE") {
    if (period === "TRIAL") {
      return {
        eventType,
        recordPaidPurchase: false,
        countsAsPaid: false,
        purchaseClass: null,
        funnelStep: "trial_started",
        revenue: "not_applicable",
      };
    }
    if (period === "PROMOTIONAL") {
      return {
        eventType,
        recordPaidPurchase: false,
        countsAsPaid: false,
        purchaseClass: null,
        funnelStep: "promotional_grant",
        revenue: "not_applicable",
      };
    }
    if (period === "INTRO") {
      const priced = price !== null && price > 0;
      return {
        eventType,
        recordPaidPurchase: priced,
        countsAsPaid: priced,
        purchaseClass: priced ? "introductory" : null,
        funnelStep: priced ? "purchase_success" : "introductory_unpriced",
        revenue: priced ? "gross_present" : "gross_missing",
      };
    }
    if (period === "NORMAL") {
      return {
        eventType,
        recordPaidPurchase: true,
        countsAsPaid: true,
        purchaseClass: "paid",
        funnelStep: "purchase_success",
        revenue,
      };
    }
    return {
      eventType,
      recordPaidPurchase: true,
      countsAsPaid: false,
      purchaseClass: "unknown",
      funnelStep: "purchase_success",
      revenue,
    };
  }

  if (eventType === "RENEWAL") {
    return {
      eventType,
      recordPaidPurchase: false,
      countsAsPaid: false,
      purchaseClass: null,
      funnelStep: "subscription_renewed",
      revenue,
    };
  }
  if (eventType === "CANCELLATION") {
    const refund = (input.cancelReason ?? "").toUpperCase() === "CUSTOMER_SUPPORT";
    return {
      eventType,
      recordPaidPurchase: false,
      countsAsPaid: false,
      purchaseClass: null,
      funnelStep: refund ? "refund" : "subscription_cancelled",
      revenue: "not_applicable",
    };
  }
  if (eventType === "REFUND") {
    return {
      eventType,
      recordPaidPurchase: false,
      countsAsPaid: false,
      purchaseClass: null,
      funnelStep: "refund",
      revenue: "not_applicable",
    };
  }
  if (eventType === "BILLING_ISSUE") {
    return {
      eventType,
      recordPaidPurchase: false,
      countsAsPaid: false,
      purchaseClass: null,
      funnelStep: "billing_issue",
      revenue: "not_applicable",
    };
  }
  return {
    eventType,
    recordPaidPurchase: false,
    countsAsPaid: false,
    purchaseClass: null,
    funnelStep: null,
    revenue: "not_applicable",
  };
}

export type StoredWebhookClass =
  | "trial_initial"
  | "paid_initial"
  | "introductory_priced"
  | "introductory_unpriced"
  | "promotional"
  | "unknown_initial"
  | "renewal"
  | "cancellation"
  | "refund"
  | "billing_issue"
  | "unclassified";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function textField(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" ? value : null;
}

function priceField(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim())) return Number(value);
  return null;
}

/**
 * Classify a stored RevenueCat webhook body. Returns a class name only.
 * The stored payload is not copied into the result.
 */
export function classifyStoredWebhookPayload(payload: unknown): StoredWebhookClass {
  const body = asRecord(payload);
  const event = asRecord(body?.event) ?? body;
  const decision = classifyRevenueCatWebhook({
    type: textField(event, "type") ?? textField(body, "event_type"),
    periodType: textField(event, "period_type") ?? textField(event, "periodType"),
    cancelReason: textField(event, "cancel_reason") ?? textField(event, "cancelReason"),
    price: priceField(event?.price),
  });
  if (decision.eventType === "INITIAL_PURCHASE") {
    if (decision.funnelStep === "trial_started") return "trial_initial";
    if (decision.funnelStep === "promotional_grant") return "promotional";
    if (decision.purchaseClass === "paid") return "paid_initial";
    if (decision.purchaseClass === "introductory") return "introductory_priced";
    if (decision.funnelStep === "introductory_unpriced") return "introductory_unpriced";
    return "unknown_initial";
  }
  if (decision.eventType === "RENEWAL") return "renewal";
  if (decision.funnelStep === "refund") return "refund";
  if (decision.funnelStep === "subscription_cancelled") return "cancellation";
  if (decision.funnelStep === "billing_issue") return "billing_issue";
  return "unclassified";
}

/** @deprecated Use classifyRevenueCatWebhook. Kept so older call sites compile. */
export function classifyRevenueCatInitialPurchase(
  periodType: string | null | undefined,
): "trial" | "paid" {
  const decision = classifyRevenueCatWebhook({ type: "INITIAL_PURCHASE", periodType });
  return decision.countsAsPaid ? "paid" : decision.funnelStep === "trial_started" ? "trial" : "paid";
}
