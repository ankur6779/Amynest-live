/**
 * Thin Firebase Analytics writer — injectable for tests.
 * Product code must never import this; only FirebaseSink uses it.
 */

import type { FirebaseParamValue } from "./params";

export type FirebaseAnalyticsWriter = {
  log(
    eventName: string,
    params: Record<string, FirebaseParamValue>,
  ): Promise<boolean>;
};

/** In-memory test writer. */
export function createMemoryFirebaseWriter(): FirebaseAnalyticsWriter & {
  calls: Array<{ eventName: string; params: Record<string, FirebaseParamValue> }>;
} {
  const calls: Array<{
    eventName: string;
    params: Record<string, FirebaseParamValue>;
  }> = [];
  return {
    calls,
    async log(eventName, params) {
      calls.push({ eventName, params: { ...params } });
      return true;
    },
  };
}

/**
 * Production writer — lazy Firebase JS SDK.
 * Does not touch Google Ads / RevenueCat / subscription attribution helpers.
 */
export function createFirebaseJsWriter(): FirebaseAnalyticsWriter {
  return {
    async log(eventName, params) {
      if (typeof window === "undefined") return false;
      try {
        const { getApps } = await import("firebase/app");
        const { getAnalytics, isSupported, logEvent } = await import(
          "firebase/analytics"
        );
        const { initializeFirebase } = await import("@/lib/firebase");

        const init = initializeFirebase();
        if (init.status !== "ok") return false;
        if (!(await isSupported())) return false;
        const app = getApps()[0];
        if (!app) return false;
        const analytics = getAnalytics(app);
        logEvent(
          analytics,
          eventName as Parameters<typeof logEvent>[1],
          params,
        );
        return true;
      } catch {
        return false;
      }
    },
  };
}
