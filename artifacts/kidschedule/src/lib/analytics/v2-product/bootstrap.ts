/**
 * Product analytics bootstrap — context + durable once-store + Firebase sink.
 * Product code never calls Firebase — only the bus forwards via FirebaseSink.
 * No Google Ads · No RevenueCat.
 */

import {
  createOnceEngine,
  createLocalStorageOnceStore,
  createFirebaseSink,
  createSinkRegistry,
  createV2AnalyticsContext,
  installV2AnalyticsBus,
  setActiveV2AnalyticsContext,
  type V2AnalyticsContext,
} from "@/lib/analytics/v2-core";
import { isV2FlagEnabled } from "@/lib/feature-flags";
import { ensureCohortDay0 } from "./cohort";
import { resolveAnonymousId, resolveSessionId } from "./identity";
import {
  PRODUCT_JOURNEY_ID,
  PRODUCT_JOURNEY_VERSION,
} from "./journey-meta";
import { resolveV2AnalyticsPlatform } from "./platform";

let busInstalled = false;

export type ProductAnalyticsReadyInput = {
  accountId?: string | null;
  guestId?: string | null;
  /** Force re-bind context (e.g. account sign-in). */
  refreshContext?: boolean;
};

function readAppVersion(): string | null {
  try {
    const v = import.meta.env.VITE_APP_VERSION as string | undefined;
    return v?.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Idempotent: installs durable once-engine + active analytics context.
 * Safe when `analytics_v2_core` is off (still prepares context for tests).
 */
export function ensureProductAnalyticsReady(
  input: ProductAnalyticsReadyInput = {},
): V2AnalyticsContext | null {
  if (!busInstalled) {
    const sinks = createSinkRegistry();
    // Analytics Core owns Firebase forwarding — never call Firebase from product.
    sinks.register(createFirebaseSink());
    installV2AnalyticsBus({
      onceEngine: createOnceEngine(createLocalStorageOnceStore()),
      sinks,
    });
    busInstalled = true;
  }

  ensureCohortDay0();

  const anonymousId = resolveAnonymousId(input.guestId);
  const sessionId = resolveSessionId();
  const created = createV2AnalyticsContext({
    anonymousId,
    accountId: input.accountId ?? null,
    sessionId,
    journeyId: PRODUCT_JOURNEY_ID,
    journeyVersion: PRODUCT_JOURNEY_VERSION,
    appVersion: readAppVersion(),
    platform: resolveV2AnalyticsPlatform(),
  });
  if (!created.ok) return null;

  setActiveV2AnalyticsContext(created.context);
  return created.context;
}

export function isProductAnalyticsFlagEnabled(): boolean {
  return isV2FlagEnabled("analytics_v2_core");
}

/** Test helper — allows reinstall with a fresh bus. */
export function resetProductAnalyticsBootstrapForTests(): void {
  busInstalled = false;
}
