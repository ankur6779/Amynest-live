import { logger } from "../lib/logger";
import { fetchWithTimeout } from "../utils/fetch-with-timeout.js";
import { activateSubscription, type Plan } from "./subscriptionService";

const RC_SECRET_KEY = process.env.REVENUECAT_SECRET_KEY ?? "";
const ENTITLEMENT_ID = process.env.REVENUECAT_ENTITLEMENT_ID ?? "premium";
const RC_FETCH_TIMEOUT_MS = Number(process.env.RC_FETCH_TIMEOUT_MS ?? "8000");

type RcEntitlement = {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
  product_identifier?: string;
  purchase_date?: string;
};

type RcSubscriberResponse = {
  subscriber?: {
    entitlements?: Record<string, RcEntitlement>;
    subscriptions?: Record<
      string,
      {
        expires_date?: string | null;
        store_transaction_id?: string;
        original_purchase_date?: string;
      }
    >;
    original_app_user_id?: string;
  };
};

function productIdToPlan(productId: string | undefined | null): Exclude<Plan, "free"> | null {
  if (!productId) return null;
  if (productId.startsWith("amynest_monthly")) return "monthly";
  if (productId.startsWith("amynest_6month")) return "six_month";
  if (productId.startsWith("amynest_yearly")) return "yearly";
  return null;
}

function isEntitlementActive(ent: RcEntitlement | undefined): boolean {
  if (!ent) return false;
  const expires = ent.expires_date ?? ent.grace_period_expires_date;
  // Missing expiry must not grant premium — sync requires a bounded period end.
  if (!expires) return false;
  return new Date(expires).getTime() > Date.now();
}

function pickActiveEntitlement(
  entitlements: Record<string, RcEntitlement> | undefined,
): RcEntitlement | null {
  if (!entitlements) return null;
  const preferred = entitlements[ENTITLEMENT_ID];
  if (isEntitlementActive(preferred)) return preferred ?? null;
  for (const ent of Object.values(entitlements)) {
    if (isEntitlementActive(ent)) return ent;
  }
  return null;
}

/**
 * Pull the latest RevenueCat subscriber record and mirror premium state into
 * our DB. Used after a native purchase so the client does not have to wait
 * for the webhook round-trip.
 */
export async function syncRevenueCatSubscription(userId: string): Promise<{
  synced: boolean;
  isPremium: boolean;
  plan?: Exclude<Plan, "free">;
  reason?: string;
}> {
  if (!RC_SECRET_KEY) {
    return { synced: false, isPremium: false, reason: "rc_not_configured" };
  }

  try {
    const res = await fetchWithTimeout(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      {
        headers: {
          Authorization: `Bearer ${RC_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        timeoutMs: RC_FETCH_TIMEOUT_MS,
      },
    );

    if (res.status === 404) {
      return { synced: true, isPremium: false, reason: "subscriber_not_found" };
    }
    if (!res.ok) {
      const text = await res.text();
      logger.warn({ status: res.status, text: text.slice(0, 200) }, "[rcSync] subscriber fetch failed");
      return { synced: false, isPremium: false, reason: "rc_fetch_failed" };
    }

    const body = (await res.json()) as RcSubscriberResponse;
    const activeEnt = pickActiveEntitlement(body.subscriber?.entitlements);
    if (!activeEnt) {
      return { synced: true, isPremium: false, reason: "no_active_entitlement" };
    }

    const plan = productIdToPlan(activeEnt.product_identifier);
    if (!plan) {
      logger.warn(
        { productId: activeEnt.product_identifier, userId },
        "[rcSync] active entitlement with unknown product",
      );
      return { synced: false, isPremium: false, reason: "unknown_product" };
    }

    const expiresRaw = activeEnt.expires_date ?? activeEnt.grace_period_expires_date;
    const periodEnd = expiresRaw ? new Date(expiresRaw) : undefined;

    const productKey = activeEnt.product_identifier ?? "";
    const subscription =
      body.subscriber?.subscriptions?.[productKey] ??
      Object.values(body.subscriber?.subscriptions ?? {}).find((s) => !!s.store_transaction_id);

    await activateSubscription(userId, plan, {
      provider: "revenuecat",
      periodEnd,
      providerCustomerId: userId,
      providerSubscriptionId: subscription?.store_transaction_id,
    });

    return { synced: true, isPremium: true, plan };
  } catch (err) {
    logger.error({ err, userId }, "[rcSync] failed");
    return { synced: false, isPremium: false, reason: "sync_error" };
  }
}
