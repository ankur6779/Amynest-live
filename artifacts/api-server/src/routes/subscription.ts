import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db, revenuecatWebhookEventsTable, subscriptionsTable } from "@workspace/db";
import { getAuth } from "../lib/auth";
import {
  getEntitlements,
  getOrCreateSubscription,
  startTrial,
  activateSubscription,
  maybeAutoGrantPremium,
  PLAN_PRICES,
  RAZORPAY_PLAN_PRICES_INR,
  type Plan,
} from "../services/subscriptionService";
import { getLivePlanPrices } from "../services/rcPricingService";
import { asyncRoute } from "../middlewares/async-route.js";
import { requireAuth } from "../middlewares/requireAuth";
import { buildSubscriptionFallbackResponse } from "../lib/api-fallbacks.js";
import { buildPlanCardsForApi } from "@workspace/subscription-marketing";
import { safeRoute } from "../lib/safe-route-handler.js";
import { heavyRouteGuard } from "../middlewares/heavy-route-guard.js";
import { logger } from "../lib/logger";
import { recordApiDomainOutcome } from "../lib/api-domain-metrics.js";
import {
  createSubscription as rzpCreateSubscription,
  fetchSubscription as rzpFetchSubscription,
  cancelSubscription as rzpCancelSubscription,
  verifySubscriptionPaymentSignature,
  verifyWebhookSignature,
  razorpayConfigured,
  planEnv as rzpPlanEnv,
  razorpayPlanIdToPlan,
  TOTAL_COUNT_BY_PLAN,
} from "../lib/razorpayClient";
import { applyRevenueCatSnapshot, productIdToPlan, recordBillingAuditEvent } from "../services/subscriptionStateService.js";
import {
  recoverPremiumOwnerForAuth,
  resolveSubscriptionOwnerUserId,
} from "../services/userIdentityService.js";

function isRevenueCatAnonymousId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith("$RCAnonymousID:");
}

function preferredRevenueCatUserId(...ids: Array<string | null | undefined>): string | null {
  const present = ids.filter((id): id is string => typeof id === "string" && id.length > 0);
  return present.find((id) => !isRevenueCatAnonymousId(id)) ?? present[0] ?? null;
}

const router: IRouter = Router();

const RC_READ_REFRESH_MIN_INTERVAL_MS = 5 * 60 * 1000;

function requestIdFrom(req: Request): string | null {
  const raw = req.headers?.["x-request-id"];
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim().slice(0, 120) : null;
}

function subscriptionStatusSnapshot(sub: {
  status?: string | null;
  provider?: string | null;
  subscriptionState?: string | null;
  cancelAtPeriodEnd?: number | null;
  currentPeriodEnd?: Date | null;
}) {
  return {
    status: sub.status ?? null,
    provider: sub.provider ?? null,
    subscriptionState: sub.subscriptionState ?? null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd === 1,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString?.() ?? null,
  };
}

function cancelAuditMetadata(input: {
  requestId: string | null;
  provider?: string | null;
  subscriptionId?: string | null;
  statusBefore?: ReturnType<typeof subscriptionStatusSnapshot> | null;
  statusAfter?: ReturnType<typeof subscriptionStatusSnapshot> | null;
  extra?: Record<string, unknown>;
}) {
  return {
    requestId: input.requestId,
    provider: input.provider ?? null,
    subscriptionId: input.subscriptionId ?? null,
    status_before: input.statusBefore ?? null,
    status_after: input.statusAfter ?? input.statusBefore ?? null,
    timestamp: new Date().toISOString(),
    ...(input.extra ?? {}),
  };
}

async function refreshRevenueCatBeforeSubscriptionRead(userId: string): Promise<void> {
  const row = await db.query.subscriptionsTable.findFirst({
    where: eq(subscriptionsTable.userId, userId),
  });
  if (!row) return;
  if (
    row.provider !== "revenuecat" &&
    !row.revenuecatAppUserId &&
    !row.originalTransactionId
  ) {
    return;
  }
  const lastRefreshAt = row.lastReconciledAt ?? row.lastEventAt ?? null;
  if (
    lastRefreshAt &&
    Date.now() - lastRefreshAt.getTime() < RC_READ_REFRESH_MIN_INTERVAL_MS &&
    !row.syncError
  ) {
    return;
  }

  try {
    const { syncRevenueCatSubscription } = await import("../services/rcCustomerService.js");
    await syncRevenueCatSubscription(row.revenuecatAppUserId ?? userId, {
      source: "reconciliation",
    });
  } catch (err) {
    logger.warn({ err, userId }, "[subscription] RevenueCat read refresh failed");
  }
}

router.get(
  "/subscription",
  requireAuth,
  heavyRouteGuard("subscription"),
  safeRoute(
    "GET /subscription",
    async (req, res): Promise<void> => {
      const { userId, email, emailVerified, phoneNumber, signInProvider } = getAuth(req);
      if (!userId) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      try {
        await maybeAutoGrantPremium(userId, email, phoneNumber);
      } catch {
        /* best-effort — never block subscription read */
      }
      await refreshRevenueCatBeforeSubscriptionRead(userId);
      const [ent, prices] = await Promise.all([
        getEntitlements(userId, email, {
          emailVerified,
          provider: signInProvider,
        }),
        getLivePlanPrices(),
      ]);
      const marketing = buildPlanCardsForApi();
      res.json({
        entitlements: ent,
        plans: marketing.map((m) => {
          const p = prices[m.id];
          const savingsPercent =
            m.id === "six_month"
              ? Math.round((1 - p.amount / (prices.monthly.amount * 6)) * 100)
              : m.id === "yearly"
                ? Math.round((1 - p.amount / (prices.monthly.amount * 12)) * 100)
                : undefined;
          return {
            id: m.id as Plan,
            title: m.title,
            tagline: m.tagline,
            description: m.description,
            price: p.amount,
            currency: p.currency,
            period: p.period,
            formattedPrice: p.formattedPrice,
            badge: m.badge,
            features: m.features,
            valueAnchor: m.valueAnchor,
            ...(savingsPercent != null && savingsPercent > 0
              ? { savingsPercent }
              : {}),
          };
        }),
      });
    },
    (_req, res) => {
      res.status(200).json(buildSubscriptionFallbackResponse());
    },
  ),
);

router.post("/subscription/start-trial", requireAuth, async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  await startTrial(userId);
  const ent = await getEntitlements(userId);
  res.json({ entitlements: ent });
});

/**
 * RevenueCat config — clients call this to discover the offering / entitlement
 * identifier and the user identifier they should pass to Purchases.logIn().
 * The actual checkout happens client-side via the RevenueCat SDK.
 */
router.get("/subscription/rc-config", requireAuth, async (req, res): Promise<void> => {
  const { userId, email, emailVerified, signInProvider } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const appUserId = await recoverPremiumOwnerForAuth({
    userId,
    email,
    emailVerified,
    provider: signInProvider,
  });
  res.json({
    provider: "revenuecat",
    entitlementId: process.env.REVENUECAT_ENTITLEMENT_ID ?? "premium",
    offeringId: "default",
    appUserId,
    packageMap: {
      monthly: "$rc_monthly",
      six_month: "$rc_six_month",
      yearly: "$rc_annual",
    },
  });
});

/**
 * POST /subscription/rc-sync — restore-only RevenueCat recovery.
 * New purchases must unlock through RevenueCat webhook delivery. This endpoint
 * is retained for Restore Purchase flows where no fresh webhook is expected.
 */
const RcSyncBody = z.object({
  purpose: z.literal("restore"),
});

router.post("/subscription/rc-sync", requireAuth, asyncRoute(async (req, res): Promise<void> => {
  const started = Date.now();
  const { userId, email, emailVerified, signInProvider } = getAuth(req);
  if (!userId) {
    recordApiDomainOutcome("billing", false, Date.now() - started, "unauthorized");
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = RcSyncBody.safeParse(req.body);
  if (!parsed.success) {
    recordApiDomainOutcome("billing", false, Date.now() - started, "webhook_required");
    res.status(409).json({ ok: false, reason: "webhook_required", issues: parsed.error.flatten() });
    return;
  }
  const appUserId = await recoverPremiumOwnerForAuth({
    userId,
    email,
    emailVerified,
    provider: signInProvider,
  });
  const { syncRevenueCatSubscription } = await import("../services/rcCustomerService.js");
  const result = await syncRevenueCatSubscription(appUserId, { source: "restore" });
  const ent = await getEntitlements(userId, email, {
    emailVerified,
    provider: signInProvider,
  });
  // One-line trace tying the sync attempt to what the user actually receives —
  // makes "paid but no premium" reports diagnosable from logs alone.
  logger.info(
    {
      userId: appUserId,
      requestedUserId: userId,
      synced: result.synced,
      syncReason: result.reason ?? null,
      isPremium: ent.isPremium,
      plan: result.plan ?? ent.plan,
    },
    "[rc-sync] purchase finalize outcome",
  );
  recordApiDomainOutcome("billing", result.synced, Date.now() - started, result.reason);
  res.json({
    ok: result.synced,
    verifiedCustomer: result.verifiedCustomer ?? false,
    activeEntitlement: result.activeEntitlement ?? false,
    dbUpdated: result.dbUpdated ?? false,
    apiPremium: ent.isPremium,
    isPremium: ent.isPremium,
    plan: result.plan ?? ent.plan,
    reason: result.reason,
    entitlements: ent,
  });
}));

/**
 * POST /subscription/rc-recover — operator-only targeted recovery.
 * Body: { appUserIds: ["firebaseUidOrRevenueCatAppUserId"] }
 *
 * This does not grant premium manually. It asks RevenueCat V2 for each customer
 * and mirrors the active entitlement into the canonical subscription row.
 */
router.post("/subscription/rc-recover", asyncRoute(async (req, res): Promise<void> => {
  const expected = process.env.BILLING_RECOVERY_SECRET;
  if (!expected) {
    res.status(503).json({ error: "billing_recovery_secret_unconfigured" });
    return;
  }
  const auth = req.headers["authorization"];
  if (auth !== `Bearer ${expected}`) {
    res.status(401).json({ error: "invalid_recovery_secret" });
    return;
  }

  const rawIds = Array.isArray(req.body?.appUserIds) ? req.body.appUserIds : [req.body?.appUserId];
  const appUserIds = rawIds.filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0);
  if (appUserIds.length === 0) {
    res.status(400).json({ error: "missing_app_user_ids" });
    return;
  }

  const { reconcileRevenueCatAppUserIds } = await import("../services/subscriptionReconciliationService.js");
  const summary = await reconcileRevenueCatAppUserIds(appUserIds, "manual_recovery");
  const entitlements = await Promise.all(
    summary.results.map(async (result) => ({
      appUserId: result.appUserId,
      appliedUserId: result.appliedUserId,
      entitlements: await getEntitlements(result.appliedUserId),
    })),
  );
  res.json({ ok: summary.failed === 0, summary, entitlements });
}));

/**
 * Legacy endpoint — kept for the web client which still posts here. Returns
 * 200 with rc-config payload so the web client can hand-off to RevenueCat.
 * Mobile clients should call /subscription/rc-config directly.
 */
router.post("/subscription/checkout", requireAuth, asyncRoute(async (req, res): Promise<void> => {
  const { userId, email, emailVerified, signInProvider } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const appUserId = await recoverPremiumOwnerForAuth({
    userId,
    email,
    emailVerified,
    provider: signInProvider,
  });
  res.json({
    provider: "revenuecat",
    entitlementId: process.env.REVENUECAT_ENTITLEMENT_ID ?? "premium",
    offeringId: "default",
    appUserId,
    packageMap: {
      monthly: "$rc_monthly",
      six_month: "$rc_six_month",
      yearly: "$rc_annual",
    },
  });
}));

/**
 * RevenueCat webhook — invoked by RevenueCat on subscription lifecycle events
 * (INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, etc.). We use it as
 * the source of truth for activating/expiring the local subscription record.
 *
 * Authenticated via shared bearer token (REVENUECAT_WEBHOOK_SECRET).
 */
router.post("/subscription/webhook", asyncRoute(async (req, res): Promise<void> => {
  const expected = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      res.status(503).json({ error: "webhook_secret_unconfigured" });
      return;
    }
    // dev/test: allow unauthenticated calls so we can exercise the flow locally
  } else {
    const auth = req.headers["authorization"];
    if (auth !== `Bearer ${expected}`) {
      res.status(401).json({ error: "invalid_webhook_signature" });
      return;
    }
  }

  const event = (req.body?.event ?? {}) as {
    type?: string;
    id?: string;
    app_user_id?: string;
    original_app_user_id?: string;
    product_id?: string;
    expiration_at_ms?: number;
    grace_period_expiration_at_ms?: number;
    cancellation_at_ms?: number;
    event_timestamp_ms?: number;
    transaction_id?: string;
    original_transaction_id?: string;
    store?: string;
    environment?: string;
    period_type?: string;
    price?: number;
    auto_renew_status?: boolean;
  };

  const rawRevenueCatUserId = preferredRevenueCatUserId(event.app_user_id, event.original_app_user_id);
  if (!rawRevenueCatUserId) {
    res.status(400).json({ error: "missing_app_user_id" });
    return;
  }
  const userId = await resolveSubscriptionOwnerUserId(rawRevenueCatUserId);

  const eventId = event.id ?? event.transaction_id ?? `${event.type}:${rawRevenueCatUserId}:${event.expiration_at_ms ?? "na"}`;
  const eventAt = event.event_timestamp_ms ? new Date(event.event_timestamp_ms) : new Date();

  const inserted = await db
    .insert(revenuecatWebhookEventsTable)
    .values({
      eventId,
      eventType: event.type ?? null,
      appUserId: userId,
      payload: {
        ...(req.body ?? {}),
        amynestCanonicalUserId: userId,
        amynestRawRevenueCatAppUserId: rawRevenueCatUserId,
      },
      eventTimestamp: eventAt,
      transactionId: event.transaction_id ?? null,
      originalTransactionId: event.original_transaction_id ?? null,
      environment: event.environment ?? null,
    })
    .onConflictDoNothing({ target: revenuecatWebhookEventsTable.eventId })
    .returning({ eventId: revenuecatWebhookEventsTable.eventId });

  if (inserted.length === 0) {
    res.json({ ok: true, duplicate: true, eventId });
    return;
  }

  const supportedEvents = new Set([
    "INITIAL_PURCHASE",
    "RENEWAL",
    "PRODUCT_CHANGE",
    "CANCELLATION",
    "EXPIRATION",
    "UNCANCELLATION",
    "BILLING_ISSUE",
    "TRANSFER",
    "SUBSCRIPTION_PAUSED",
  ]);

  if (!event.type || !supportedEvents.has(event.type)) {
    await db.update(revenuecatWebhookEventsTable).set({
      processingStatus: "ignored",
      processedAt: new Date(),
    }).where(eq(revenuecatWebhookEventsTable.eventId, eventId));
    await recordBillingAuditEvent({
      userId,
      source: "webhook",
      eventName: "webhook_ignored",
      providerEventId: eventId,
      reason: event.type ?? "missing_event_type",
    });
    res.json({ ok: true, ignored: event.type ?? "missing_event_type", eventId });
    return;
  }

  await recordBillingAuditEvent({
    userId,
    source: "webhook",
    eventName: "webhook_received",
    providerEventId: eventId,
    metadata: { eventType: event.type, productId: event.product_id ?? null },
  });

  try {
    const { syncRevenueCatSubscription, shouldWriteFreeSnapshotOnMissingEntitlement } = await import("../services/rcCustomerService.js");
    const synced = await syncRevenueCatSubscription(userId, {
      source: "webhook",
      providerEventId: eventId,
      eventType: event.type,
    });

    let appliedFrom = "revenuecat_v2";
    let applied = {
      isPremium: synced.apiPremium ?? synced.isPremium,
      plan: synced.plan,
      reason: synced.reason,
    };

    const deferredFreeWrite =
      synced.reason === "no_active_entitlement" &&
      !shouldWriteFreeSnapshotOnMissingEntitlement("webhook", event.type);

    if (!synced.dbUpdated || deferredFreeWrite) {
      const plan = productIdToPlan(event.product_id);
      const expirationAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
      const gracePeriodExpirationAt = event.grace_period_expiration_at_ms
        ? new Date(event.grace_period_expiration_at_ms)
        : null;
      if (
        plan ||
        event.type === "EXPIRATION" ||
        event.type === "BILLING_ISSUE" ||
        event.type === "SUBSCRIPTION_PAUSED" ||
        deferredFreeWrite
      ) {
        const fallback = await applyRevenueCatSnapshot(userId, {
          appUserId: userId,
          originalAppUserId: event.original_app_user_id ?? null,
          entitlementId: process.env.REVENUECAT_ENTITLEMENT_ID ?? "premium",
          productId: event.product_id ?? null,
          store: event.store ?? null,
          environment: event.environment ?? null,
          originalTransactionId: event.original_transaction_id ?? null,
          latestTransactionId: event.transaction_id ?? null,
          expirationAt,
          gracePeriodExpirationAt,
          autoRenewStatus:
            event.type === "CANCELLATION" || event.type === "EXPIRATION" || event.type === "SUBSCRIPTION_PAUSED"
              ? false
              : event.auto_renew_status ?? null,
          cancelledAt: event.cancellation_at_ms ? new Date(event.cancellation_at_ms) : null,
          eventType: event.type,
          eventAt,
        }, { source: "webhook", providerEventId: eventId });
        appliedFrom = "webhook_payload";
        applied = { isPremium: fallback.isPremium, plan: fallback.plan === "free" ? undefined : fallback.plan, reason: fallback.reason };
      }
    }

    await db.update(revenuecatWebhookEventsTable).set({
      processingStatus: "processed",
      processedAt: new Date(),
      processingError: null,
    }).where(eq(revenuecatWebhookEventsTable.eventId, eventId));
    await recordBillingAuditEvent({
      userId,
      source: "webhook",
      eventName: "webhook_applied",
      providerEventId: eventId,
      metadata: { eventType: event.type, appliedFrom, isPremium: applied.isPremium },
    });
    res.json({ ok: true, eventId, applied: { userId, plan: applied.plan, isPremium: applied.isPremium, reason: applied.reason, source: appliedFrom } });
    return;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.update(revenuecatWebhookEventsTable).set({
      processingStatus: "failed",
      processingError: message.slice(0, 1000),
      processedAt: new Date(),
    }).where(eq(revenuecatWebhookEventsTable.eventId, eventId));
    await recordBillingAuditEvent({
      userId,
      source: "webhook",
      eventName: "webhook_failed",
      status: "error",
      providerEventId: eventId,
      reason: message,
      metadata: { eventType: event.type },
    });
    throw err;
  }
}));

/**
 * POST /subscription/cancel
 * Cancels the active subscription.
 * - Razorpay: cancels at cycle end (user keeps premium until period_end).
 * - Manual/trial: downgrades immediately.
 * Returns updated entitlements.
 */
router.post("/subscription/cancel", requireAuth, asyncRoute(async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth.userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const requestId = requestIdFrom(req);
  const subscriptionOwnerUserId = await recoverPremiumOwnerForAuth({
    userId,
    email: auth.email,
    emailVerified: auth.emailVerified,
    provider: auth.signInProvider,
  });

  // Heal stale rows before deciding whether a real provider cancellation is needed.
  await getEntitlements(userId, auth.email, {
    emailVerified: auth.emailVerified,
    provider: auth.signInProvider,
  });

  type CancelOutcome =
    | { kind: "missing" }
    | { kind: "inactive"; status: string | null }
    | { kind: "redirect_to_store"; provider: string | null }
    | { kind: "invalid_provider"; provider: string | null }
    | { kind: "invalid_subscription_id"; provider: string | null }
    | { kind: "duplicate"; provider: string | null }
    | { kind: "completed"; provider: string | null };

  let outcome: CancelOutcome;
  try {
    outcome = await db.transaction(async (tx): Promise<CancelOutcome> => {
      // Serialize cancellation per user across app instances. This makes double
      // clicks and retry storms deterministic without relying on in-memory locks.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${subscriptionOwnerUserId}))`);

      const rows = await tx
        .select()
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.userId, subscriptionOwnerUserId))
        .limit(1);
      const sub = rows[0];

      if (!sub) {
        await recordBillingAuditEvent({
          userId,
          source: "api",
          eventName: "subscription_cancel_failed",
          status: "warning",
          reason: "missing_subscription",
          metadata: cancelAuditMetadata({ requestId }),
        });
        return { kind: "missing" };
      }

      const before = subscriptionStatusSnapshot(sub);
      await recordBillingAuditEvent({
        userId,
        source: "api",
        eventName: "subscription_cancel_requested",
        metadata: cancelAuditMetadata({
          requestId,
          provider: sub.provider ?? null,
          subscriptionId: sub.providerSubscriptionId ?? null,
          statusBefore: before,
        }),
      });

      if (sub.cancelAtPeriodEnd === 1) {
        await recordBillingAuditEvent({
          userId,
          source: "api",
          eventName: "subscription_cancel_duplicate",
          reason: "already_scheduled",
          metadata: cancelAuditMetadata({
            requestId,
            provider: sub.provider ?? null,
            subscriptionId: sub.providerSubscriptionId ?? null,
            statusBefore: before,
          }),
        });
        return { kind: "duplicate", provider: sub.provider ?? null };
      }

      if (!["active", "trialing"].includes(sub.status)) {
        await recordBillingAuditEvent({
          userId,
          source: "api",
          eventName: "subscription_cancel_duplicate",
          reason: "already_inactive",
          metadata: cancelAuditMetadata({
            requestId,
            provider: sub.provider ?? null,
            subscriptionId: sub.providerSubscriptionId ?? null,
            statusBefore: before,
          }),
        });
        return { kind: "inactive", status: sub.status ?? null };
      }

      if (!["none", "manual", "razorpay", "revenuecat"].includes(sub.provider ?? "none")) {
        await recordBillingAuditEvent({
          userId,
          source: "api",
          eventName: "subscription_cancel_failed",
          status: "warning",
          reason: "invalid_provider",
          metadata: cancelAuditMetadata({
            requestId,
            provider: sub.provider ?? null,
            subscriptionId: sub.providerSubscriptionId ?? null,
            statusBefore: before,
          }),
        });
        return { kind: "invalid_provider" as const, provider: sub.provider ?? null };
      }

      // RevenueCat subscriptions (Google Play / Apple App Store) cannot be
      // cancelled server-side. Only store settings can end the real billing
      // relationship, and webhooks/reconciliation mirror that result locally.
      if (sub.provider === "revenuecat") {
        await recordBillingAuditEvent({
          userId,
          source: "api",
          eventName: "subscription_cancel_failed",
          status: "warning",
          reason: "redirect_to_store",
          metadata: cancelAuditMetadata({
            requestId,
            provider: sub.provider,
            subscriptionId: sub.providerSubscriptionId ?? null,
            statusBefore: before,
          }),
        });
        return { kind: "redirect_to_store", provider: sub.provider };
      }

      if (sub.provider === "razorpay" && !sub.providerSubscriptionId) {
        await recordBillingAuditEvent({
          userId,
          source: "api",
          eventName: "subscription_cancel_failed",
          status: "warning",
          reason: "invalid_subscription_id",
          metadata: cancelAuditMetadata({
            requestId,
            provider: sub.provider,
            subscriptionId: null,
            statusBefore: before,
          }),
        });
        return { kind: "invalid_subscription_id" as const, provider: sub.provider };
      }

      if (sub.provider === "razorpay" && sub.providerSubscriptionId) {
        try {
          await rzpCancelSubscription(sub.providerSubscriptionId, true);
        } catch (err) {
          await recordBillingAuditEvent({
            userId,
            source: "api",
            eventName: "subscription_cancel_failed",
            status: "error",
            reason: err instanceof Error ? err.message : String(err),
            metadata: cancelAuditMetadata({
              requestId,
              provider: sub.provider,
              subscriptionId: sub.providerSubscriptionId,
              statusBefore: before,
            }),
          });
          throw err;
        }

        const [updated] = await tx
          .update(subscriptionsTable)
          .set({
            subscriptionState: "CANCELLED",
            autoRenewStatus: false,
            cancelAtPeriodEnd: 1,
            cancelledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(subscriptionsTable.userId, subscriptionOwnerUserId))
          .returning();
        await recordBillingAuditEvent({
          userId,
          source: "api",
          eventName: "subscription_cancel_scheduled",
          metadata: cancelAuditMetadata({
            requestId,
            provider: sub.provider,
            subscriptionId: sub.providerSubscriptionId,
            statusBefore: before,
            statusAfter: updated ? subscriptionStatusSnapshot(updated) : null,
          }),
        });
        return { kind: "completed", provider: sub.provider };
      }

      const now = new Date();
      const [updated] = await tx
        .update(subscriptionsTable)
        .set({
          plan: "free",
          status: "canceled",
          provider: "none",
          providerCustomerId: null,
          providerSubscriptionId: null,
          subscriptionState: "EXPIRED",
          expiresAt: now,
          gracePeriodExpiresAt: null,
          trialEndsAt: null,
          currentPeriodEnd: now,
          cancelAtPeriodEnd: 0,
          cancelledAt: now,
          expiredAt: now,
          updatedAt: now,
        })
        .where(eq(subscriptionsTable.userId, subscriptionOwnerUserId))
        .returning();
      await recordBillingAuditEvent({
        userId: subscriptionOwnerUserId,
        source: "api",
        eventName: "subscription_cancel_completed",
        metadata: cancelAuditMetadata({
          requestId,
          provider: sub.provider ?? null,
          subscriptionId: sub.providerSubscriptionId ?? null,
          statusBefore: before,
          statusAfter: updated ? subscriptionStatusSnapshot(updated) : null,
        }),
      });
      return { kind: "completed", provider: sub.provider ?? null };
    });
  } catch (err: any) {
    const current = await db.query.subscriptionsTable.findFirst({
      where: eq(subscriptionsTable.userId, subscriptionOwnerUserId),
    });
    const snapshot = current ? subscriptionStatusSnapshot(current) : null;
    await recordBillingAuditEvent({
      userId: subscriptionOwnerUserId,
      source: "api",
      eventName: "subscription_cancel_failed",
      status: "error",
      reason: err?.message ?? "Cancellation failed",
      metadata: cancelAuditMetadata({
        requestId,
        provider: current?.provider ?? null,
        subscriptionId: current?.providerSubscriptionId ?? null,
        statusBefore: snapshot,
        statusAfter: snapshot,
      }),
    });
    res.status(502).json({ error: "cancel_failed", message: err?.message ?? "Cancellation failed" });
    return;
  }

  const ent = await getEntitlements(userId, auth.email, {
    emailVerified: auth.emailVerified,
    provider: auth.signInProvider,
  });
  if (outcome.kind === "missing") {
    res.status(404).json({ error: "missing_subscription", entitlements: ent });
    return;
  }
  if (outcome.kind === "inactive") {
    res.status(409).json({ error: "already_inactive", status: outcome.status, entitlements: ent });
    return;
  }
  if (outcome.kind === "redirect_to_store") {
    res.status(422).json({
      error: "redirect_to_store",
      message:
        "Your subscription is managed by Google Play or the App Store. " +
        "To cancel, open your device's subscription settings and cancel AmyNest there.",
      entitlements: ent,
    });
    return;
  }
  if (outcome.kind === "invalid_provider") {
    res.status(422).json({ error: "invalid_provider", provider: outcome.provider, entitlements: ent });
    return;
  }
  if (outcome.kind === "invalid_subscription_id") {
    res.status(409).json({ error: "invalid_subscription_id", provider: outcome.provider, entitlements: ent });
    return;
  }
  res.json({
    ok: true,
    duplicate: outcome.kind === "duplicate",
    provider: outcome.provider,
    entitlements: ent,
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// Razorpay (web + Android only — iOS keeps RevenueCat / Apple IAP)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /subscription/razorpay/config — public-safe values the client needs to
 * launch Razorpay Checkout. Requires auth so we can echo the user's id.
 */
router.get("/subscription/razorpay/config", requireAuth, (req, res): void => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  res.json({
    enabled: razorpayConfigured(),
    keyId: process.env.RAZORPAY_KEY_ID ?? null,
    plansConfigured: {
      monthly: !!process.env.RAZORPAY_PLAN_ID_MONTHLY,
      six_month: !!(process.env.RAZORPAY_PLAN_ID_SIX_MONTH ?? process.env.RAZORPAY_PLAN_ID_QUARTERLY),
      yearly: !!process.env.RAZORPAY_PLAN_ID_YEARLY,
    },
  });
});

/**
 * POST /subscription/razorpay/create-subscription
 * Body: { plan: "monthly" | "six_month" | "yearly" }
 * Returns: { subscriptionId, keyId, plan, amount, currency }
 */
router.post(
  "/subscription/razorpay/create-subscription",
  requireAuth,
  asyncRoute(async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (!razorpayConfigured()) {
      res.status(503).json({ error: "razorpay_not_configured" });
      return;
    }
    const plan = req.body?.plan as Exclude<Plan, "free"> | undefined;
    if (plan !== "monthly" && plan !== "six_month" && plan !== "yearly") {
      res.status(400).json({ error: "invalid_plan" });
      return;
    }
    const env = rzpPlanEnv();
    const planId = env[plan];
    if (!planId) {
      res.status(503).json({ error: `plan_id_unconfigured_${plan}` });
      return;
    }
    try {
      const sub = await rzpCreateSubscription({
        planId,
        totalCount: TOTAL_COUNT_BY_PLAN[plan],
        notes: { userId, internalPlan: plan },
      });
      res.json({
        subscriptionId: sub.id,
        keyId: process.env.RAZORPAY_KEY_ID,
        plan,
        amount: RAZORPAY_PLAN_PRICES_INR[plan].amount,
        currency: "INR",
      });
    } catch (err: any) {
      res.status(502).json({ error: "razorpay_create_failed", message: err?.message });
    }
  }),
);

/**
 * POST /subscription/razorpay/verify
 * Body: { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, plan }
 *
 * Verifies the Checkout HMAC signature, then enforces ownership
 * (sub.notes.userId === auth user) and plan binding against the
 * Razorpay subscription record. On success it persists ONLY the
 * provider linkage (provider, providerSubscriptionId) — it does NOT
 * flip status to "active". Activation happens exclusively in the
 * webhook handler when `subscription.activated` / `.charged` /
 * `.resumed` arrives, which is the canonical confirmation that the
 * first charge actually succeeded. The client should poll
 * `/api/subscription` (or refresh on the
 * `amynest:refresh-subscription` event) until the webhook lands.
 */
router.post(
  "/subscription/razorpay/verify",
  requireAuth,
  asyncRoute(async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const {
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subscriptionId,
      razorpay_signature: signature,
      plan,
    } = req.body ?? {};
    if (!paymentId || !subscriptionId || !signature) {
      res.status(400).json({ error: "missing_fields" });
      return;
    }
    const ok = verifySubscriptionPaymentSignature({
      paymentId,
      subscriptionId,
      signature,
    });
    if (!ok) {
      res.status(401).json({ error: "invalid_signature" });
      return;
    }
    const planFromBody = (plan === "monthly" || plan === "six_month" || plan === "yearly")
      ? (plan as Exclude<Plan, "free">)
      : null;
    if (!planFromBody) {
      res.status(400).json({ error: "invalid_plan" });
      return;
    }

    // Fetch the subscription from Razorpay so we can verify ownership and the
    // plan binding server-side. Without this an attacker who captured ANY
    // valid {payment_id, subscription_id, signature} tuple from another
    // account could replay it to grant their own account premium access.
    let sub: Awaited<ReturnType<typeof rzpFetchSubscription>>;
    try {
      sub = await rzpFetchSubscription(subscriptionId);
    } catch (err: any) {
      res.status(502).json({ error: "razorpay_fetch_failed", message: err?.message });
      return;
    }

    const ownerUserId = (sub.notes as Record<string, unknown> | undefined)?.userId;
    if (typeof ownerUserId !== "string" || ownerUserId !== userId) {
      // Either the subscription wasn't created by us, or it belongs to a
      // different account. Refuse to grant premium. This is the key
      // anti-replay / anti-cross-account check.
      res.status(403).json({ error: "subscription_owner_mismatch" });
      return;
    }

    const planFromSub = razorpayPlanIdToPlan(sub.plan_id);
    if (!planFromSub || planFromSub !== planFromBody) {
      res.status(400).json({ error: "plan_mismatch" });
      return;
    }
    const planCode = planFromSub;

    // Persist provider linkage ONLY (intent). We do NOT flip status to
    // "active" here — the webhook (`subscription.activated` /
    // `subscription.charged`) is the canonical source of truth for the
    // first successful charge. The client should poll `/api/subscription`
    // (or refresh on the `amynest:refresh-subscription` event) until the
    // webhook lands, which usually takes a few seconds.
    const { db, subscriptionsTable } = await import("@workspace/db");
    await getOrCreateSubscription(userId);
    await db
      .update(subscriptionsTable)
      .set({
        provider: "razorpay",
        providerCustomerId: userId,
        providerSubscriptionId: subscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionsTable.userId, userId));

    const ent = await getEntitlements(userId);
    res.json({
      ok: true,
      pending: true,
      message: "payment_verified_awaiting_webhook",
      plan: planCode,
      entitlements: ent,
    });
  }),
);

/**
 * POST /subscription/razorpay/webhook — Razorpay subscription lifecycle.
 * MUST be mounted before requireAuth (it is — see routes/index.ts). Verifies
 * X-Razorpay-Signature against RAZORPAY_WEBHOOK_SECRET and is idempotent on
 * event id (same event arriving twice is safe).
 *
 * Idempotency is enforced by the `razorpay_webhook_events` table inside a
 * single DB transaction: we INSERT the event id (PK) with ON CONFLICT DO
 * NOTHING and apply the subscription mutation in the SAME transaction.
 * Either both land atomically or neither does. So:
 *   • Concurrent / retried deliveries of the same event id race on the
 *     INSERT — exactly one wins and proceeds; the rest see no row inserted
 *     and short-circuit as duplicates.
 *   • A crash, OOM, or restart between the INSERT and the COMMIT rolls the
 *     transaction back, so Razorpay's next retry will be able to claim and
 *     process the event normally — no event is lost.
 *   • A handler exception throws out of the transaction, rolling it back,
 *     and we return 5xx so Razorpay retries with backoff.
 * This works across restarts AND across multiple server instances because
 * the database row is the lock.
 */

router.post("/subscription/razorpay/webhook", asyncRoute(async (req, res): Promise<void> => {
  // Razorpay always POSTs JSON. Reject anything else so the rawBody hook
  // (which is keyed off application/json) is guaranteed to have run.
  const ct = (req.headers["content-type"] ?? "").toString().toLowerCase();
  if (!ct.includes("application/json")) {
    res.status(415).json({ error: "unsupported_media_type" });
    return;
  }

  const expected = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      res.status(503).json({ error: "webhook_secret_unconfigured" });
      return;
    }
    // dev/test allows unauthenticated calls so we can exercise locally.
  } else {
    const signature = req.headers["x-razorpay-signature"] as string | undefined;
    const rawBody: string | undefined = (req as any).rawBody;
    if (!rawBody) {
      res.status(400).json({ error: "missing_raw_body" });
      return;
    }
    if (!verifyWebhookSignature(rawBody, signature, expected)) {
      res.status(401).json({ error: "invalid_signature" });
      return;
    }
  }

  const body = req.body ?? {};
  const eventId: string | undefined = body.id;
  const eventType: string | undefined = body.event;

  // Razorpay always stamps webhook payloads with `id`. If it's missing the
  // payload is malformed and we have no key to dedupe on — refuse rather
  // than silently process without idempotency protection. Razorpay treats
  // 4xx as a permanent failure and won't retry, which is what we want for
  // a malformed body.
  if (!eventId) {
    res.status(400).json({ error: "missing_event_id" });
    return;
  }
  const sub = body.payload?.subscription?.entity as
    | {
        id?: string;
        plan_id?: string;
        notes?: Record<string, string>;
        current_end?: number | null;
        current_start?: number | null;
        status?: string;
      }
    | undefined;

  const userId = sub?.notes?.userId;
  const plan = razorpayPlanIdToPlan(sub?.plan_id);
  const periodEnd = sub?.current_end ? new Date(sub.current_end * 1000) : undefined;

  // Run claim + business mutation in ONE transaction. If we crash before
  // commit, the claim row is rolled back together with any partial state,
  // so Razorpay's retry can reprocess the event cleanly.
  type Outcome =
    | { kind: "duplicate" }
    | { kind: "ignored"; reason: string; extra?: Record<string, unknown> }
    | { kind: "applied"; payload: Record<string, unknown> };

  let outcome: Outcome;
  try {
    const { db, razorpayWebhookEventsTable, subscriptionsTable } = await import(
      "@workspace/db"
    );
    outcome = await db.transaction(async (tx): Promise<Outcome> => {
      // 1) Claim the event id. ON CONFLICT DO NOTHING + RETURNING tells us
      //    whether this transaction owns the event. Concurrent deliveries
      //    of the same id either block waiting for our row lock and then
      //    see the conflict, or beat us and we see the conflict. Either
      //    way only one transaction commits with a row insert.
      const claimed = await tx
        .insert(razorpayWebhookEventsTable)
        .values({ eventId, eventType: eventType ?? null })
        .onConflictDoNothing({ target: razorpayWebhookEventsTable.eventId })
        .returning({ eventId: razorpayWebhookEventsTable.eventId });
      if (claimed.length === 0) return { kind: "duplicate" };

      if (!sub) return { kind: "ignored", reason: "no_subscription_payload", extra: { eventType } };
      if (!userId) return { kind: "ignored", reason: "no_user_id_in_notes", extra: { eventType } };

      switch (eventType) {
        case "subscription.activated":
        case "subscription.charged":
        case "subscription.resumed": {
          // Note: subscription.authenticated fires when the mandate is
          // approved but the first payment has NOT yet been captured. We
          // deliberately do NOT activate on that event — wait for
          // `.activated` / `.charged` / `.resumed`.
          if (!plan) {
            return { kind: "ignored", reason: "unknown_plan", extra: { planId: sub.plan_id } };
          }
          await activateSubscription(
            userId,
            plan,
            {
              provider: "razorpay",
              periodEnd,
              providerCustomerId: userId,
              providerSubscriptionId: sub.id,
            },
            tx,
          );
          return { kind: "applied", payload: { userId, plan, eventType } };
        }
        case "subscription.cancelled":
        case "subscription.completed":
        case "subscription.expired":
        case "subscription.paused":
        case "subscription.halted": {
          const now = new Date();
          const periodStillActive = Boolean(periodEnd && periodEnd.getTime() > now.getTime());
          const pausedOrHalted = eventType === "subscription.paused" || eventType === "subscription.halted";
          const terminalState = pausedOrHalted
            ? "PAUSED"
            : periodStillActive
              ? "CANCELLED"
              : "EXPIRED";
          await tx
            .update(subscriptionsTable)
            .set({
              plan: terminalState === "EXPIRED" ? "free" : undefined,
              status:
                terminalState === "PAUSED"
                  ? "past_due"
                  : terminalState === "CANCELLED"
                    ? "active"
                    : "canceled",
              subscriptionState: terminalState,
              cancelAtPeriodEnd: terminalState === "CANCELLED" ? 1 : 0,
              cancelledAt: terminalState === "CANCELLED" || terminalState === "EXPIRED" ? now : null,
              expiredAt: terminalState === "EXPIRED" ? periodEnd ?? now : null,
              expiresAt: periodEnd ?? null,
              currentPeriodEnd: periodEnd ?? null,
              updatedAt: now,
            })
            .where(eq(subscriptionsTable.userId, userId));
          return { kind: "applied", payload: { userId, status: eventType, subscriptionState: terminalState } };
        }
        default: {
          return { kind: "ignored", reason: eventType ?? "unknown_event" };
        }
      }
    });
  } catch (err: any) {
    // Transaction was rolled back — both the claim row and any partial
    // state are gone, so Razorpay's retry will reprocess this event.
    req.log?.error?.({ err, eventId, eventType }, "razorpay_webhook_failed");
    res.status(500).json({ error: "webhook_processing_failed", message: err?.message });
    return;
  }

  switch (outcome.kind) {
    case "duplicate":
      res.json({ ok: true, duplicate: true });
      return;
    case "ignored":
      res.json({ ok: true, ignored: outcome.reason, ...outcome.extra });
      return;
    case "applied":
      if (outcome.payload.subscriptionState === "EXPIRED" && typeof outcome.payload.userId === "string") {
        await recordBillingAuditEvent({
          userId: outcome.payload.userId,
          source: "webhook",
          eventName: "subscription_expired",
          providerEventId: eventId,
          reason: eventType ?? "razorpay_terminal_event",
          metadata: outcome.payload,
        });
      }
      res.json({ ok: true, applied: outcome.payload });
      return;
  }
}));

export default router;
