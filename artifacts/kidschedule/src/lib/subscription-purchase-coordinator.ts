/**
 * Canonical, idempotent store purchase conversion fan-out.
 * ONE logical purchase per store transaction id.
 */

import type { Plan } from "@/hooks/use-subscription";
import type { PaywallReason } from "@/contexts/paywall-context";
import { isCapacitorIosShell } from "@/lib/device-lite";
import { isNativeAmyNestShell } from "@/lib/native-shell";
import { getInstallAttribution } from "@/lib/install-attribution";
import { emitPurchaseSuccessFanOut } from "@/lib/subscription-analytics";
import { logSubscriptionDebug } from "@/lib/subscription-debug";

const RECORDED_TXNS_KEY = "amynest:purchase:recorded_txns:v1";
const MAX_RECORDED = 250;

export type StorePurchaseMetadata = {
  transactionId: string;
  productId: string;
  currency: string;
  value: number;
  billingPeriod?: string;
};

export type VerifiedPurchaseReport = {
  plan?: Plan | string;
  source?: string;
  reason?: PaywallReason | string;
  platform?: "ios" | "android" | "web";
  store: StorePurchaseMetadata;
};

function detectPlatform(): "ios" | "android" | "web" {
  if (isCapacitorIosShell()) return "ios";
  if (isNativeAmyNestShell()) return "android";
  return "web";
}

function readRecordedTransactionIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(RECORDED_TXNS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string" && id.length > 0));
  } catch {
    return new Set();
  }
}

function persistRecordedTransactionId(transactionId: string): void {
  if (typeof window === "undefined") return;
  const ids = readRecordedTransactionIds();
  ids.add(transactionId);
  const trimmed = [...ids].slice(-MAX_RECORDED);
  try {
    localStorage.setItem(RECORDED_TXNS_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore quota */
  }
}

export function hasRecordedPurchaseTransaction(transactionId: string): boolean {
  const id = transactionId.trim();
  if (!id) return false;
  return readRecordedTransactionIds().has(id);
}

function attributionExtras(): Record<string, string> {
  const attr = getInstallAttribution();
  if (!attr) return {};
  const out: Record<string, string> = {};
  if (attr.gclid) out.gclid = attr.gclid;
  if (attr.utmSource) out.utm_source = attr.utmSource;
  if (attr.utmMedium) out.utm_medium = attr.utmMedium;
  if (attr.utmCampaign) out.utm_campaign = attr.utmCampaign;
  if (attr.gbraid) out.gbraid = attr.gbraid;
  if (attr.wbraid) out.wbraid = attr.wbraid;
  return out;
}

/**
 * Record exactly one conversion for a verified store purchase.
 * Returns false when this transaction was already recorded (idempotent no-op).
 */
export function recordVerifiedStorePurchase(report: VerifiedPurchaseReport): boolean {
  const transactionId = report.store.transactionId.trim();
  if (!transactionId) {
    logSubscriptionDebug({
      phase: "purchase_coordinator:missing_transaction_id",
      source: report.source,
      plan: typeof report.plan === "string" ? report.plan : undefined,
      extra: { product_id: report.store.productId },
    });
    return false;
  }

  if (hasRecordedPurchaseTransaction(transactionId)) {
    logSubscriptionDebug({
      phase: "purchase_coordinator:duplicate_skipped",
      source: report.source,
      extra: { transaction_id: transactionId },
    });
    return false;
  }

  emitPurchaseSuccessFanOut({
    event: "purchase_success",
    plan: report.plan,
    source: report.source,
    reason: report.reason,
    platform: report.platform ?? detectPlatform(),
    extra: {
      transaction_id: transactionId,
      product_id: report.store.productId,
      currency: report.store.currency,
      value: report.store.value,
      ...(report.store.billingPeriod ? { billing_period: report.store.billingPeriod } : {}),
      ...attributionExtras(),
    },
  });

  persistRecordedTransactionId(transactionId);
  return true;
}

/** Emit entitlement activation once premium subscriber state is confirmed. */
export function recordEntitlementActivated(opts: {
  source?: string;
  plan?: Plan | string;
  transactionId?: string;
}): void {
  import("@/lib/subscription-analytics").then(({ trackSubscriptionEvent }) => {
    trackSubscriptionEvent({
      event: "entitlement_activated",
      plan: opts.plan,
      source: opts.source ?? "entitlement_sync",
      extra: {
        entitlement_state: "premium_subscriber",
        ...(opts.transactionId ? { transaction_id: opts.transactionId } : {}),
      },
    });
  });
}

/** Test helper */
export function resetPurchaseCoordinatorForTests(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECORDED_TXNS_KEY);
  } catch {
    /* ignore */
  }
}
