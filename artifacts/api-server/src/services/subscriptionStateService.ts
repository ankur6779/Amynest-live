import { db, billingAuditEventsTable, subscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Plan, Status } from "./subscriptionService";

export type SubscriptionState =
  | "FREE"
  | "TRIAL"
  | "ACTIVE"
  | "GRACE_PERIOD"
  | "PAUSED"
  | "CANCELLED"
  | "EXPIRED";

export type RevenueCatSnapshot = {
  appUserId: string;
  originalAppUserId?: string | null;
  entitlementId?: string | null;
  productId?: string | null;
  store?: string | null;
  environment?: string | null;
  originalTransactionId?: string | null;
  latestTransactionId?: string | null;
  expirationAt?: Date | null;
  gracePeriodExpirationAt?: Date | null;
  autoRenewStatus?: boolean | null;
  cancelledAt?: Date | null;
  eventType?: string | null;
  eventAt?: Date | null;
};

export type SubscriptionApplyResult = {
  userId: string;
  fromState: SubscriptionState;
  toState: SubscriptionState;
  plan: Plan;
  status: Status;
  isPremium: boolean;
  expiresAt: Date | null;
  reason: string;
};

const PAID_STATES = new Set<SubscriptionState>(["TRIAL", "ACTIVE", "GRACE_PERIOD", "CANCELLED"]);

export function productIdToPlan(productId: string | undefined | null): Exclude<Plan, "free"> | null {
  if (!productId) return null;
  if (productId.startsWith("amynest_monthly")) return "monthly";
  if (productId.startsWith("amynest_6month")) return "six_month";
  if (productId.startsWith("amynest_yearly")) return "yearly";
  return null;
}

export function isStatePremium(
  state: SubscriptionState | string | null | undefined,
  opts: {
    currentPeriodEnd?: Date | null;
    expiresAt?: Date | null;
    gracePeriodExpiresAt?: Date | null;
    trialEndsAt?: Date | null;
    bonusExpiresAt?: Date | null;
    now?: Date;
  } = {},
): boolean {
  const now = opts.now ?? new Date();
  if (opts.bonusExpiresAt && opts.bonusExpiresAt.getTime() > now.getTime()) return true;
  if (state === "FREE" || state === "EXPIRED" || state === "PAUSED") return false;
  if (state === "GRACE_PERIOD") {
    return Boolean(opts.gracePeriodExpiresAt && opts.gracePeriodExpiresAt.getTime() > now.getTime());
  }
  if (state === "TRIAL") {
    return Boolean(opts.trialEndsAt && opts.trialEndsAt.getTime() > now.getTime());
  }
  if (PAID_STATES.has(state as SubscriptionState)) {
    const expiry = opts.currentPeriodEnd ?? opts.expiresAt;
    return Boolean(expiry && expiry.getTime() > now.getTime());
  }
  return false;
}

export function deriveStateFromRevenueCatSnapshot(
  snapshot: RevenueCatSnapshot,
  now = new Date(),
): { state: SubscriptionState; reason: string; premiumUntil: Date | null } {
  const expiration = snapshot.expirationAt ?? null;
  const graceExpiration = snapshot.gracePeriodExpirationAt ?? null;
  if (graceExpiration && graceExpiration.getTime() > now.getTime()) {
    return { state: "GRACE_PERIOD", reason: "grace_period_active", premiumUntil: graceExpiration };
  }
  if (!expiration) {
    return { state: "FREE", reason: "no_active_entitlement", premiumUntil: null };
  }
  if (expiration.getTime() <= now.getTime()) {
    return { state: "EXPIRED", reason: "expired", premiumUntil: expiration };
  }
  if (snapshot.cancelledAt || snapshot.autoRenewStatus === false) {
    return { state: "CANCELLED", reason: "cancelled_period_remaining", premiumUntil: expiration };
  }
  return { state: "ACTIVE", reason: "active_entitlement", premiumUntil: expiration };
}

export function mapStateToLegacyStatus(state: SubscriptionState): Status {
  switch (state) {
    case "TRIAL":
      return "trialing";
    case "ACTIVE":
    case "CANCELLED":
      return "active";
    case "GRACE_PERIOD":
    case "PAUSED":
      return "past_due";
    case "EXPIRED":
      return "canceled";
    case "FREE":
    default:
      return "free";
  }
}

export async function recordBillingAuditEvent(input: {
  userId?: string | null;
  source: string;
  eventName: string;
  status?: "ok" | "warning" | "error";
  providerEventId?: string | null;
  fromState?: string | null;
  toState?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(billingAuditEventsTable).values({
    userId: input.userId ?? null,
    source: input.source,
    eventName: input.eventName,
    status: input.status ?? "ok",
    providerEventId: input.providerEventId ?? null,
    fromState: input.fromState ?? null,
    toState: input.toState ?? null,
    reason: input.reason ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function applyRevenueCatSnapshot(
  userId: string,
  snapshot: RevenueCatSnapshot,
  opts: {
    source: "purchase_finalize" | "restore" | "webhook" | "reconciliation" | "manual_recovery";
    providerEventId?: string | null;
  } = {
    source: "purchase_finalize",
  },
): Promise<SubscriptionApplyResult> {
  const existing = await db.query.subscriptionsTable.findFirst({
    where: eq(subscriptionsTable.userId, userId),
  });
  const fromState = ((existing?.subscriptionState as SubscriptionState | undefined) ?? "FREE");
  const { state, reason, premiumUntil } = deriveStateFromRevenueCatSnapshot(snapshot);
  const plan = state === "FREE" || state === "EXPIRED" ? "free" : productIdToPlan(snapshot.productId) ?? "monthly";
  const status = mapStateToLegacyStatus(state);
  const now = new Date();
  const cancelledAt = snapshot.cancelledAt ?? (state === "CANCELLED" ? now : null);
  const expiredAt = state === "EXPIRED" ? snapshot.expirationAt ?? now : null;

  const values = {
    plan,
    status,
    provider: state === "FREE" ? "none" : "revenuecat",
    providerCustomerId: snapshot.appUserId,
    providerSubscriptionId: snapshot.latestTransactionId ?? snapshot.originalTransactionId ?? null,
    subscriptionState: state,
    store: snapshot.store ?? null,
    environment: snapshot.environment ?? null,
    revenuecatAppUserId: snapshot.appUserId,
    originalAppUserId: snapshot.originalAppUserId ?? null,
    productId: snapshot.productId ?? null,
    entitlementId: snapshot.entitlementId ?? null,
    originalTransactionId: snapshot.originalTransactionId ?? null,
    latestTransactionId: snapshot.latestTransactionId ?? null,
    lastEventType: snapshot.eventType ?? null,
    lastEventAt: snapshot.eventAt ?? null,
    expiresAt: snapshot.expirationAt ?? null,
    gracePeriodExpiresAt: snapshot.gracePeriodExpirationAt ?? null,
    autoRenewStatus: snapshot.autoRenewStatus ?? null,
    cancelledAt,
    expiredAt,
    currentPeriodEnd: premiumUntil,
    cancelAtPeriodEnd: state === "CANCELLED" ? 1 : 0,
    lastReconciledAt: opts.source === "reconciliation" || opts.source === "manual_recovery" ? now : null,
    syncError: null,
    updatedAt: now,
  };

  await db
    .insert(subscriptionsTable)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: subscriptionsTable.userId,
      set: values,
    });

  await recordBillingAuditEvent({
    userId,
    source: opts.source,
    eventName: state === "EXPIRED" || state === "FREE" ? "entitlement_removed" : "entitlement_granted",
    providerEventId: opts.providerEventId ?? null,
    fromState,
    toState: state,
    reason,
    metadata: {
      productId: snapshot.productId ?? null,
      entitlementId: snapshot.entitlementId ?? null,
      latestTransactionId: snapshot.latestTransactionId ?? null,
      expiresAt: snapshot.expirationAt?.toISOString() ?? null,
      gracePeriodExpiresAt: snapshot.gracePeriodExpirationAt?.toISOString() ?? null,
    },
  });

  if (state === "EXPIRED") {
    await recordBillingAuditEvent({
      userId,
      source: opts.source,
      eventName: "subscription_expired",
      providerEventId: opts.providerEventId ?? null,
      fromState,
      toState: state,
      reason,
      metadata: {
        productId: snapshot.productId ?? null,
        entitlementId: snapshot.entitlementId ?? null,
        latestTransactionId: snapshot.latestTransactionId ?? null,
        expiresAt: snapshot.expirationAt?.toISOString() ?? null,
      },
    });
  }

  return {
    userId,
    fromState,
    toState: state,
    plan,
    status,
    isPremium: isStatePremium(state, {
      currentPeriodEnd: premiumUntil,
      expiresAt: snapshot.expirationAt,
      gracePeriodExpiresAt: snapshot.gracePeriodExpirationAt,
    }),
    expiresAt: premiumUntil,
    reason,
  };
}

export async function markRevenueCatSyncError(
  userId: string,
  source: string,
  reason: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await db
    .insert(subscriptionsTable)
    .values({
      userId,
      plan: "free",
      status: "free",
      subscriptionState: "FREE",
      syncError: reason,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: subscriptionsTable.userId,
      set: {
        syncError: reason,
        updatedAt: new Date(),
      },
    });
  await recordBillingAuditEvent({
    userId,
    source,
    eventName: "revenuecat_sync_failed",
    status: "error",
    reason,
    metadata,
  });
}
