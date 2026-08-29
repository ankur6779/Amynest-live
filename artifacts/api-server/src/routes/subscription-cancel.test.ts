import { after, before, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

type SubRow = {
  userId: string;
  plan: string;
  status: string;
  provider: string;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  subscriptionState: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  expiresAt: Date | null;
  gracePeriodExpiresAt: Date | null;
  cancelAtPeriodEnd: number;
  cancelledAt: Date | null;
  expiredAt: Date | null;
  autoRenewStatus: boolean | null;
  updatedAt: Date;
};

type AuditRow = {
  eventName: string;
  status?: string;
  reason?: string | null;
  metadata: Record<string, unknown>;
};

const SUBSCRIPTIONS_TABLE = { __tag: "subscriptions" } as const;
const BILLING_AUDIT_TABLE = { __tag: "billing_audit_events" } as const;
const REVENUECAT_WEBHOOK_EVENTS_TABLE = { __tag: "revenuecat_webhook_events" } as const;
const RAZORPAY_WEBHOOK_EVENTS_TABLE = { __tag: "razorpay_webhook_events" } as const;

const future = () => new Date(Date.now() + 86_400_000);
const past = () => new Date(Date.now() - 86_400_000);

const state: {
  authUserId: string | null;
  subscriptionOwnerUserId: string | null;
  sub: SubRow | null;
  audits: AuditRow[];
  razorpayCalls: string[];
  razorpayError: Error | null;
  transactionErrorAfterMutation: Error | null;
  txCount: number;
} = {
  authUserId: "user_1",
  subscriptionOwnerUserId: null,
  sub: null,
  audits: [],
  razorpayCalls: [],
  razorpayError: null,
  transactionErrorAfterMutation: null,
  txCount: 0,
};

function subscription(overrides: Partial<SubRow> = {}): SubRow {
  return {
    userId: "user_1",
    plan: "monthly",
    status: "active",
    provider: "razorpay",
    providerCustomerId: "user_1",
    providerSubscriptionId: "sub_123",
    subscriptionState: "ACTIVE",
    trialEndsAt: null,
    currentPeriodEnd: future(),
    expiresAt: future(),
    gracePeriodExpiresAt: null,
    cancelAtPeriodEnd: 0,
    cancelledAt: null,
    expiredAt: null,
    autoRenewStatus: true,
    updatedAt: new Date(),
    ...overrides,
  };
}

function isPremium(row: SubRow | null): boolean {
  if (!row) return false;
  const now = Date.now();
  if (row.subscriptionState === "TRIAL") return Boolean(row.trialEndsAt && row.trialEndsAt.getTime() > now);
  if (row.subscriptionState === "GRACE_PERIOD") {
    return Boolean(row.gracePeriodExpiresAt && row.gracePeriodExpiresAt.getTime() > now);
  }
  if (row.subscriptionState === "ACTIVE" || row.subscriptionState === "CANCELLED") {
    const end = row.currentPeriodEnd ?? row.expiresAt;
    return Boolean(end && end.getTime() > now);
  }
  return false;
}

function entitlements() {
  return {
    plan: state.sub?.plan ?? "free",
    status: state.sub?.status ?? "free",
    provider: state.sub?.provider ?? "none",
    isPremium: isPremium(state.sub),
    cancelAtPeriodEnd: state.sub?.cancelAtPeriodEnd === 1,
    currentPeriodEnd: state.sub?.currentPeriodEnd?.toISOString() ?? null,
  };
}

let txQueue = Promise.resolve();

function subscriptionLookupUserId(): string | null {
  return state.subscriptionOwnerUserId ?? state.authUserId;
}

function makeDbMock() {
  const dbMock = {
    query: {
      subscriptionsTable: {
        findFirst: async () => state.sub,
      },
    },
    execute: async () => undefined,
    transaction: async <T>(fn: (tx: typeof dbMock) => Promise<T>): Promise<T> => {
      const previous = txQueue;
      let release!: () => void;
      txQueue = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      state.txCount += 1;
      const before = state.sub ? { ...state.sub } : null;
      const beforeAudits = state.audits.length;
      try {
        const result = await fn(dbMock);
        if (state.transactionErrorAfterMutation) throw state.transactionErrorAfterMutation;
        return result;
      } catch (err) {
        state.sub = before;
        state.audits.length = beforeAudits;
        throw err;
      } finally {
        release();
      }
    },
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            const lookupUserId = subscriptionLookupUserId();
            if (!state.sub || !lookupUserId || state.sub.userId !== lookupUserId) return [];
            return [state.sub];
          },
        }),
      }),
    }),
    update: (table: unknown) => ({
      set: (updates: Partial<SubRow>) => ({
        where: () => ({
          returning: async () => {
            if (table !== SUBSCRIPTIONS_TABLE || !state.sub) return [];
            state.sub = { ...state.sub, ...updates } as SubRow;
            return [state.sub];
          },
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: async (vals: Record<string, unknown>) => {
        if (table === BILLING_AUDIT_TABLE) {
          state.audits.push({
            eventName: String(vals.eventName),
            status: vals.status == null ? undefined : String(vals.status),
            reason: vals.reason == null ? null : String(vals.reason),
            metadata: (vals.metadata as Record<string, unknown>) ?? {},
          });
        }
        return [];
      },
    }),
  };
  return dbMock;
}

const dbMock = makeDbMock();

mock.module("@workspace/db", {
  namedExports: {
    db: dbMock,
    subscriptionsTable: SUBSCRIPTIONS_TABLE,
    billingAuditEventsTable: BILLING_AUDIT_TABLE,
    revenuecatWebhookEventsTable: REVENUECAT_WEBHOOK_EVENTS_TABLE,
    razorpayWebhookEventsTable: RAZORPAY_WEBHOOK_EVENTS_TABLE,
    childrenTable: { __tag: "children" },
    routinesTable: { __tag: "routines" },
    behaviorsTable: { __tag: "behaviors" },
    usageDailyTable: { __tag: "usage_daily" },
    adminPremiumGrantsTable: { __tag: "admin_premium_grants" },
    userIdentityAliasesTable: { __tag: "user_identity_aliases" },
  },
});

mock.module(new URL("../lib/auth.ts", import.meta.url).href, {
  namedExports: {
    getAuth: () => ({
      userId: state.authUserId,
      email: "parent@example.com",
      emailVerified: true,
      phoneNumber: null,
      name: null,
      picture: null,
      signInProvider: "google.com",
    }),
  },
});

mock.module(new URL("../services/userIdentityService.ts", import.meta.url).href, {
  namedExports: {
    recoverPremiumOwnerForAuth: async ({ userId }: { userId: string }) =>
      state.subscriptionOwnerUserId ?? userId,
    resolveSubscriptionOwnerUserId: async (firebaseUid: string) =>
      state.subscriptionOwnerUserId ?? firebaseUid,
  },
});

mock.module(new URL("../middlewares/requireAuth.ts", import.meta.url).href, {
  namedExports: {
    requireAuth: (req: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }, next: () => void) => {
      if (!state.authUserId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      next();
    },
  },
});

const subscriptionServiceMock = {
    getEntitlements: async () => entitlements(),
    getOrCreateSubscription: async () => state.sub,
    startTrial: async () => state.sub,
    activateSubscription: async () => state.sub,
    maybeAutoGrantPremium: async () => undefined,
    FREE_LIMITS: {},
    formatPlanPrice: (amount: number, currency = "INR") => `${currency} ${amount}`,
    PLAN_PRICES: {},
    RAZORPAY_PLAN_PRICES_INR: {},
};
mock.module(new URL("../services/subscriptionService.ts", import.meta.url).href, {
  namedExports: subscriptionServiceMock,
});

mock.module(new URL("../services/rcPricingService.ts", import.meta.url).href, {
  namedExports: {
    getLivePlanPrices: async () => ({}),
  },
});

mock.module(new URL("../lib/razorpayClient.ts", import.meta.url).href, {
  namedExports: {
    createSubscription: async () => ({}),
    fetchSubscription: async () => ({}),
    cancelSubscription: async (id: string) => {
      state.razorpayCalls.push(id);
      if (state.razorpayError) throw state.razorpayError;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { id };
    },
    verifySubscriptionPaymentSignature: () => true,
    verifyWebhookSignature: () => true,
    razorpayConfigured: () => true,
    planEnv: () => ({}),
    razorpayPlanIdToPlan: () => "monthly",
    TOTAL_COUNT_BY_PLAN: {},
  },
});

let server: Server;
let baseUrl: string;

async function postCancel(headers: Record<string, string> = {}) {
  return fetch(`${baseUrl}/api/subscription/cancel`, {
    method: "POST",
    headers: { authorization: "Bearer test", "x-request-id": "req_1", ...headers },
  });
}

before(async () => {
  const express = (await import("express")).default;
  const { default: router } = await import("./subscription.js");
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  await new Promise<void>((resolve) => {
    server = createServer(app);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

beforeEach(() => {
  state.authUserId = "user_1";
  state.subscriptionOwnerUserId = null;
  state.sub = subscription();
  state.audits = [];
  state.razorpayCalls = [];
  state.razorpayError = null;
  state.transactionErrorAfterMutation = null;
  state.txCount = 0;
  txQueue = Promise.resolve();
});

function audit(name: string): AuditRow | undefined {
  return state.audits.find((row) => row.eventName === name);
}

function assertCancelAuditShape(row: AuditRow | undefined) {
  assert.ok(row, "audit row should exist");
  assert.equal(row.metadata.userId, undefined, "userId is stored in audit row user_id, not duplicated in metadata");
  assert.ok("requestId" in row.metadata);
  assert.ok("provider" in row.metadata);
  assert.ok("subscriptionId" in row.metadata);
  assert.ok("status_before" in row.metadata);
  assert.ok("status_after" in row.metadata);
  assert.ok("timestamp" in row.metadata);
}

describe("POST /api/subscription/cancel", () => {
  it("redirects RevenueCat subscriptions to store management without DB mutation", async () => {
    state.sub = subscription({ provider: "revenuecat", providerSubscriptionId: "rc_txn", autoRenewStatus: true });
    const res = await postCancel();
    const body = await res.json() as { error: string; entitlements: { isPremium: boolean } };
    assert.equal(res.status, 422);
    assert.equal(body.error, "redirect_to_store");
    assert.equal(state.sub.provider, "revenuecat");
    assert.equal(state.razorpayCalls.length, 0);
    assertCancelAuditShape(audit("subscription_cancel_failed"));
  });

  it("schedules Razorpay cancellation at cycle end and keeps premium until period end", async () => {
    const res = await postCancel();
    const body = await res.json() as { ok: boolean; entitlements: { isPremium: boolean; cancelAtPeriodEnd: boolean } };
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    assert.equal(state.razorpayCalls.length, 1);
    assert.equal(state.sub?.cancelAtPeriodEnd, 1);
    assert.equal(body.entitlements.isPremium, true);
    assert.equal(body.entitlements.cancelAtPeriodEnd, true);
    assertCancelAuditShape(audit("subscription_cancel_scheduled"));
  });

  it("immediately downgrades manual subscription", async () => {
    state.sub = subscription({ provider: "manual", providerSubscriptionId: null });
    const res = await postCancel();
    const body = await res.json() as { entitlements: { isPremium: boolean } };
    assert.equal(res.status, 200);
    assert.equal(state.sub?.status, "canceled");
    assert.equal(state.sub?.provider, "none");
    assert.equal(state.sub?.subscriptionState, "EXPIRED");
    assert.equal(body.entitlements.isPremium, false);
    assertCancelAuditShape(audit("subscription_cancel_completed"));
  });

  it("immediately downgrades trial subscription", async () => {
    state.sub = subscription({
      provider: "none",
      providerSubscriptionId: null,
      status: "trialing",
      subscriptionState: "TRIAL",
      trialEndsAt: future(),
    });
    const res = await postCancel();
    const body = await res.json() as { entitlements: { isPremium: boolean } };
    assert.equal(res.status, 200);
    assert.equal(state.sub?.trialEndsAt, null);
    assert.equal(state.sub?.subscriptionState, "EXPIRED");
    assert.equal(body.entitlements.isPremium, false);
  });

  it("returns conflict for already cancelled subscription", async () => {
    state.sub = subscription({ status: "canceled", subscriptionState: "EXPIRED", currentPeriodEnd: past() });
    const res = await postCancel();
    assert.equal(res.status, 409);
    assert.equal((await res.json() as { error: string }).error, "already_inactive");
    assert.equal(state.razorpayCalls.length, 0);
    assertCancelAuditShape(audit("subscription_cancel_duplicate"));
  });

  it("returns conflict for already expired subscription", async () => {
    state.sub = subscription({ status: "free", plan: "free", provider: "none", subscriptionState: "FREE", currentPeriodEnd: null });
    const res = await postCancel();
    assert.equal(res.status, 409);
    assert.equal((await res.json() as { error: string }).error, "already_inactive");
  });

  it("rejects anonymous user and missing auth token", async () => {
    state.authUserId = null;
    const res = await postCancel({ authorization: "" });
    assert.equal(res.status, 401);
  });

  it("rejects invalid provider without mutation", async () => {
    state.sub = subscription({ provider: "mystery" });
    const res = await postCancel();
    assert.equal(res.status, 422);
    assert.equal((await res.json() as { error: string }).error, "invalid_provider");
    assert.equal(state.sub.provider, "mystery");
  });

  it("rejects Razorpay row with invalid subscription id", async () => {
    state.sub = subscription({ provider: "razorpay", providerSubscriptionId: null });
    const res = await postCancel();
    assert.equal(res.status, 409);
    assert.equal((await res.json() as { error: string }).error, "invalid_subscription_id");
    assert.equal(state.sub.status, "active");
  });

  it("cancels the canonical subscription owner for aliased premium accounts", async () => {
    state.authUserId = "firebase_alias";
    state.subscriptionOwnerUserId = "firebase_owner";
    state.sub = subscription({
      userId: "firebase_owner",
      provider: "razorpay",
      providerSubscriptionId: "sub_owner",
    });

    const res = await postCancel();
    const body = await res.json() as { ok: boolean; entitlements: { cancelAtPeriodEnd: boolean } };

    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    assert.equal(state.razorpayCalls.length, 1);
    assert.equal(state.razorpayCalls[0], "sub_owner");
    assert.equal(state.sub?.userId, "firebase_owner");
    assert.equal(state.sub?.cancelAtPeriodEnd, 1);
    assert.equal(body.entitlements.cancelAtPeriodEnd, true);
    assert.equal(
      audit("subscription_cancel_requested")?.metadata.authFirebaseUid,
      "firebase_alias",
    );
  });

  it("returns not found for missing subscription and unauthorized user row", async () => {
    state.sub = null;
    assert.equal((await postCancel()).status, 404);

    state.sub = subscription({ userId: "owner" });
    state.authUserId = "attacker";
    assert.equal((await postCancel()).status, 404);
  });

  it("is idempotent for duplicate cancellation requests", async () => {
    state.sub = subscription({ cancelAtPeriodEnd: 1 });
    const res = await postCancel();
    const body = await res.json() as { duplicate: boolean };
    assert.equal(res.status, 200);
    assert.equal(body.duplicate, true);
    assert.equal(state.razorpayCalls.length, 0);
  });

  it("serializes concurrent cancellation requests", async () => {
    const [a, b] = await Promise.all([postCancel(), postCancel()]);
    const bodies = await Promise.all([a.json(), b.json()]) as Array<{ duplicate?: boolean }>;
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    assert.equal(state.razorpayCalls.length, 1);
    assert.equal(bodies.filter((body) => body.duplicate === true).length, 1);
  });

  it("returns bad gateway for Razorpay API timeout/failure and rolls back DB state", async () => {
    state.razorpayError = new Error("razorpay_timeout");
    const before = { ...state.sub! };
    const res = await postCancel();
    assert.equal(res.status, 502);
    assert.equal(state.sub?.cancelAtPeriodEnd, before.cancelAtPeriodEnd);
    assert.equal((await res.json() as { error: string }).error, "cancel_failed");
    assertCancelAuditShape(audit("subscription_cancel_failed"));
  });

  it("rolls back transaction on database failure after mutation", async () => {
    state.transactionErrorAfterMutation = new Error("commit_failed");
    const res = await postCancel();
    assert.equal(res.status, 502);
    assert.equal(state.sub?.cancelAtPeriodEnd, 0);
  });

  it("keeps premium during webhook delay after scheduled Razorpay cancel", async () => {
    const res = await postCancel();
    const body = await res.json() as { entitlements: { isPremium: boolean; cancelAtPeriodEnd: boolean } };
    assert.equal(res.status, 200);
    assert.equal(body.entitlements.isPremium, true);
    assert.equal(body.entitlements.cancelAtPeriodEnd, true);
  });
});
