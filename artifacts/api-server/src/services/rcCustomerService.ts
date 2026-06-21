import { logger } from "../lib/logger";
import { fetchWithTimeout } from "../utils/fetch-with-timeout.js";
import { safeJsonResponse } from "../lib/safe-json-response.js";
import type { Plan } from "./subscriptionService";
import {
  applyRevenueCatSnapshot,
  markRevenueCatSyncError,
  productIdToPlan,
  type RevenueCatSnapshot,
} from "./subscriptionStateService";

const RC_V2_SECRET_KEY = process.env.REVENUECAT_V2_SECRET_KEY ?? "";
const RC_PROJECT_ID = process.env.REVENUECAT_PROJECT_ID ?? "";
const ENTITLEMENT_ID = process.env.REVENUECAT_ENTITLEMENT_ID ?? "premium";
const RC_FETCH_TIMEOUT_MS = Number(process.env.RC_FETCH_TIMEOUT_MS ?? "8000");
const RC_API_BASE_URL = process.env.REVENUECAT_API_BASE_URL ?? "https://api.revenuecat.com";

type UnknownRecord = Record<string, unknown>;

type RcV2Response = UnknownRecord | UnknownRecord[];

type RcV2ConfigStatus = {
  configured: boolean;
  missing: string[];
};

export function getRevenueCatV2ConfigStatus(): RcV2ConfigStatus {
  const missing: string[] = [];
  if (!RC_V2_SECRET_KEY) missing.push("REVENUECAT_V2_SECRET_KEY");
  if (!RC_PROJECT_ID) missing.push("REVENUECAT_PROJECT_ID");
  if (!ENTITLEMENT_ID) missing.push("REVENUECAT_ENTITLEMENT_ID");
  return {
    configured: missing.length === 0,
    missing,
  };
}

export function assertRevenueCatV2ConfigAtBoot(): void {
  const status = getRevenueCatV2ConfigStatus();
  if (status.configured) return;
  const message = `[rcSync] missing RevenueCat V2 config: ${status.missing.join(", ")}.`;
  if (process.env.NODE_ENV === "production" || process.env.AMYNEST_ENV === "production") {
    throw new Error(message);
  }
  logger.warn({ missing: status.missing }, message);
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function asArray(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) return value.filter((item): item is UnknownRecord => Boolean(asRecord(item)));
  const record = asRecord(value);
  if (!record) return [];
  const candidates = ["items", "data", "entitlements", "subscriptions", "customer_entitlements"];
  for (const key of candidates) {
    const nested = record[key];
    if (Array.isArray(nested)) return nested.filter((item): item is UnknownRecord => Boolean(asRecord(item)));
  }
  return [record];
}

function textField(record: UnknownRecord | null | undefined, keys: string[]): string | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "number") return String(value);
  }
  return null;
}

function boolField(record: UnknownRecord | null | undefined, keys: string[]): boolean | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") return true;
      if (value.toLowerCase() === "false") return false;
    }
  }
  return null;
}

function dateField(record: UnknownRecord | null | undefined, keys: string[]): Date | null {
  const raw = textField(record, keys);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date : null;
}

function nestedRecord(record: UnknownRecord | null | undefined, keys: string[]): UnknownRecord | null {
  if (!record) return null;
  for (const key of keys) {
    const nested = asRecord(record[key]);
    if (nested) return nested;
  }
  return null;
}

async function fetchRevenueCatV2<T extends RcV2Response>(path: string): Promise<{ ok: true; data: T } | { ok: false; status: number; reason: string }> {
  const res = await fetchWithTimeout(`${RC_API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${RC_V2_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    timeoutMs: RC_FETCH_TIMEOUT_MS,
  });
  if (res.status === 404) return { ok: false, status: 404, reason: "customer_not_found" };
  if (!res.ok) {
    const text = await res.text();
    logger.warn({ status: res.status, text: text.slice(0, 300), path }, "[rcSync] RevenueCat V2 fetch failed");
    return { ok: false, status: res.status, reason: "rc_fetch_failed" };
  }
  const parsed = await safeJsonResponse<T>(res);
  if (!parsed.ok) return { ok: false, status: res.status, reason: "rc_fetch_failed" };
  return { ok: true, data: parsed.data };
}

function pickActiveEntitlement(body: RcV2Response): UnknownRecord | null {
  const now = Date.now();
  const entries = asArray(body);
  const active = entries.filter((entry) => {
    const identifier = textField(entry, ["entitlement_id", "lookup_key", "identifier", "id"]);
    const expires = dateField(entry, ["expires_at", "expires_date", "expiration_at", "expiration_date"]);
    const graceExpires = dateField(entry, ["grace_period_expires_at", "grace_period_expires_date"]);
    const matches = identifier === ENTITLEMENT_ID || textField(entry, ["product_id", "product_identifier"]);
    return Boolean(matches) && Boolean((expires && expires.getTime() > now) || (graceExpires && graceExpires.getTime() > now));
  });
  return active[0] ?? null;
}

function buildSnapshotFromV2(
  userId: string,
  entitlement: UnknownRecord | null,
  customerBody: RcV2Response | null,
  sourceEventType?: string,
): RevenueCatSnapshot {
  const customer = asArray(customerBody ?? {})[0] ?? {};
  const product = nestedRecord(entitlement, ["product"]);
  const subscription = nestedRecord(entitlement, ["subscription"]);
  const store = nestedRecord(entitlement, ["store"]);
  const transaction = nestedRecord(entitlement, ["latest_transaction", "transaction"]);
  const productId =
    textField(entitlement, ["product_id", "product_identifier"]) ??
    textField(product, ["id", "lookup_key", "identifier"]);
  return {
    appUserId: textField(customer, ["app_user_id", "id"]) ?? userId,
    originalAppUserId: textField(customer, ["original_app_user_id"]),
    entitlementId: textField(entitlement, ["entitlement_id", "lookup_key", "identifier", "id"]) ?? ENTITLEMENT_ID,
    productId,
    store: textField(entitlement, ["store"]) ?? textField(store, ["type", "name"]),
    environment: textField(entitlement, ["environment"]),
    originalTransactionId:
      textField(entitlement, ["original_transaction_id"]) ??
      textField(subscription, ["original_transaction_id"]) ??
      textField(transaction, ["original_transaction_id"]),
    latestTransactionId:
      textField(entitlement, ["latest_transaction_id", "transaction_id", "store_transaction_id"]) ??
      textField(transaction, ["id", "transaction_id", "store_transaction_id"]),
    expirationAt: dateField(entitlement, ["expires_at", "expires_date", "expiration_at", "expiration_date"]),
    gracePeriodExpirationAt: dateField(entitlement, ["grace_period_expires_at", "grace_period_expires_date"]),
    autoRenewStatus: boolField(entitlement, ["auto_renew_status", "will_renew", "is_auto_renewing"]),
    cancelledAt: dateField(entitlement, ["cancelled_at", "unsubscribe_detected_at"]),
    eventType: sourceEventType ?? "CUSTOMER_SYNC",
    eventAt: new Date(),
  };
}

/**
 * Pull the latest RevenueCat subscriber record and mirror premium state into
 * our DB. Used after a native purchase so the client does not have to wait
 * for the webhook round-trip.
 */
export async function syncRevenueCatSubscription(userId: string, opts: {
  source?: "purchase_finalize" | "restore" | "webhook" | "reconciliation" | "manual_recovery";
  providerEventId?: string | null;
  eventType?: string | null;
} = {}): Promise<{
  synced: boolean;
  isPremium: boolean;
  plan?: Exclude<Plan, "free">;
  verifiedCustomer?: boolean;
  activeEntitlement?: boolean;
  dbUpdated?: boolean;
  apiPremium?: boolean;
  reason?: string;
}> {
  const config = getRevenueCatV2ConfigStatus();
  if (!config.configured) {
    // Without this key the server can NEVER mirror a store purchase into our DB —
    // the user pays but stays non-premium until the webhook (if any) lands.
    logger.warn({ userId, missing: config.missing }, "[rcSync] RevenueCat V2 config missing — purchase cannot be synced");
    await markRevenueCatSyncError(userId, opts.source ?? "purchase_finalize", "rc_not_configured", { missing: config.missing });
    return { synced: false, isPremium: false, verifiedCustomer: false, activeEntitlement: false, dbUpdated: false, apiPremium: false, reason: "rc_not_configured" };
  }

  try {
    const customerPath = `/v2/projects/${encodeURIComponent(RC_PROJECT_ID)}/customers/${encodeURIComponent(userId)}`;
    const entitlementsPath = `${customerPath}/active_entitlements`;
    const customerResult = await fetchRevenueCatV2<RcV2Response>(customerPath);
    const entitlementsResult = await fetchRevenueCatV2<RcV2Response>(entitlementsPath);

    if (!customerResult.ok) {
      if (customerResult.reason === "customer_not_found") {
        logger.warn({ userId }, "[rcSync] RevenueCat V2 customer not found (possible app_user_id mismatch)");
      }
      await markRevenueCatSyncError(userId, opts.source ?? "purchase_finalize", customerResult.reason, {
        customerStatus: customerResult.ok ? 200 : customerResult.status,
        entitlementsStatus: entitlementsResult.ok ? 200 : entitlementsResult.status,
      });
      return { synced: false, isPremium: false, verifiedCustomer: false, activeEntitlement: false, dbUpdated: false, apiPremium: false, reason: customerResult.reason };
    }
    if (!entitlementsResult.ok) {
      await markRevenueCatSyncError(userId, opts.source ?? "purchase_finalize", entitlementsResult.reason, {
        customerStatus: 200,
        entitlementsStatus: entitlementsResult.status,
      });
      return { synced: false, isPremium: false, verifiedCustomer: true, activeEntitlement: false, dbUpdated: false, apiPremium: false, reason: entitlementsResult.reason };
    }

    const activeEnt = pickActiveEntitlement(entitlementsResult.data);
    if (!activeEnt) {
      logger.warn(
        {
          userId,
          expectedEntitlementId: ENTITLEMENT_ID,
          entitlementCount: asArray(entitlementsResult.data).length,
        },
        "[rcSync] no active RevenueCat V2 entitlement for customer",
      );
      const snapshot = buildSnapshotFromV2(userId, null, customerResult.data, opts.eventType ?? undefined);
      const applied = await applyRevenueCatSnapshot(userId, snapshot, {
        source: opts.source ?? "purchase_finalize",
        providerEventId: opts.providerEventId,
      });
      return { synced: true, isPremium: false, verifiedCustomer: true, activeEntitlement: false, dbUpdated: true, apiPremium: applied.isPremium, reason: "no_active_entitlement" };
    }

    const snapshot = buildSnapshotFromV2(userId, activeEnt, customerResult.data, opts.eventType ?? undefined);
    const plan = productIdToPlan(snapshot.productId);
    if (!plan) {
      logger.warn(
        { productId: snapshot.productId, userId },
        "[rcSync] active entitlement with unknown product — check amynest_monthly/6month/yearly product id prefix",
      );
      await markRevenueCatSyncError(userId, opts.source ?? "purchase_finalize", "unknown_product", { productId: snapshot.productId });
      return { synced: false, isPremium: false, verifiedCustomer: true, activeEntitlement: true, dbUpdated: false, apiPremium: false, reason: "unknown_product" };
    }

    const applied = await applyRevenueCatSnapshot(userId, snapshot, {
      source: opts.source ?? "purchase_finalize",
      providerEventId: opts.providerEventId,
    });

    logger.info(
      {
        userId,
        plan,
        productId: snapshot.productId,
        periodEnd: applied.expiresAt?.toISOString() ?? null,
      },
      "[rcSync] activated premium from RevenueCat V2 customer",
    );
    return { synced: true, isPremium: applied.isPremium, plan, verifiedCustomer: true, activeEntitlement: true, dbUpdated: true, apiPremium: applied.isPremium };
  } catch (err) {
    logger.error({ err, userId }, "[rcSync] failed");
    await markRevenueCatSyncError(userId, opts.source ?? "purchase_finalize", "sync_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { synced: false, isPremium: false, verifiedCustomer: false, activeEntitlement: false, dbUpdated: false, apiPremium: false, reason: "sync_error" };
  }
}
