/**
 * Analytics Event Bus — single entry point for all V2 analytics.
 * Nothing may bypass this layer.
 *
 * Sprint 3C-3: validates + once-engine + debug debug.
 * No Firebase · No Google Ads · No production logging sinks.
 */

import { isV2FlagEnabled } from "@/lib/feature-flags";
import {
  getActiveV2AnalyticsContext,
  type CreateV2AnalyticsContextInput,
  createV2AnalyticsContext,
} from "./context";
import {
  clearV2AnalyticsDebugBuffer,
  isV2AnalyticsDebugEnabled,
  recordV2AnalyticsDebug,
} from "./debug";
import { recordV2SinkHealth, resetV2SinkHealthForTests } from "./sink-health";
import {
  createMemoryOnceStore,
  createOnceEngine,
  type OnceEngine,
} from "./once-engine";
import { validateV2Payload } from "./payload-validator";
import {
  lookupRegistryEvent,
  validateRegistryIdentity,
} from "./registry/validate";
import { createSinkRegistry, type SinkRegistry } from "./sinks/types";
import type {
  V2AnalyticsContext,
  V2AnalyticsRecord,
  V2TrackInput,
  V2TrackResult,
} from "./types";

export type V2AnalyticsBusOptions = {
  onceEngine?: OnceEngine;
  sinks?: SinkRegistry;
  /** Inject context per call; falls back to active context. */
  getContext?: () => V2AnalyticsContext | null;
  /** Override flag check (tests). */
  isEnabled?: () => boolean;
};

export type V2AnalyticsBus = {
  /** Sole public track API. */
  track(input: V2TrackInput): V2TrackResult;
  resetOnceKeys(): void;
  getSinks(): SinkRegistry;
};

function defaultEnabled(): boolean {
  return isV2FlagEnabled("analytics_v2_core");
}

export function createV2AnalyticsBus(
  options: V2AnalyticsBusOptions = {},
): V2AnalyticsBus {
  const onceEngine =
    options.onceEngine ?? createOnceEngine(createMemoryOnceStore());
  const sinks = options.sinks ?? createSinkRegistry();
  const getContext =
    options.getContext ?? (() => getActiveV2AnalyticsContext());
  const isEnabled = options.isEnabled ?? defaultEnabled;

  return {
    getSinks: () => sinks,
    resetOnceKeys: () => onceEngine.reset(),

    track(input: V2TrackInput): V2TrackResult {
      if (!isEnabled()) {
        const result: V2TrackResult = {
          ok: false,
          status: "rejected",
          reason: "flag_disabled",
          message: "analytics_v2_core is disabled",
          eventName: input.eventName,
        };
        recordV2AnalyticsDebug({ at: new Date().toISOString(), result });
        return result;
      }

      const lookup = lookupRegistryEvent(input.eventName);
      if (!lookup.ok) {
        const result: V2TrackResult = {
          ok: false,
          status: "rejected",
          reason: lookup.reason,
          message: lookup.message,
          eventName: input.eventName,
        };
        recordV2AnalyticsDebug({ at: new Date().toISOString(), result });
        return result;
      }

      const identity = validateRegistryIdentity(lookup.definition, {
        eventVersion: input.eventVersion,
        layer: input.layer,
        owner: input.owner,
      });
      if (!identity.ok) {
        const result: V2TrackResult = {
          ok: false,
          status: "rejected",
          reason: identity.reason,
          message: identity.message,
          eventName: input.eventName,
        };
        recordV2AnalyticsDebug({ at: new Date().toISOString(), result });
        return result;
      }

      const context = getContext();
      if (!context) {
        const result: V2TrackResult = {
          ok: false,
          status: "rejected",
          reason: "invalid_payload",
          message: "Analytics context is not set",
          eventName: input.eventName,
        };
        recordV2AnalyticsDebug({ at: new Date().toISOString(), result });
        return result;
      }

      const payloadResult = validateV2Payload({
        definition: lookup.definition,
        payload: input.payload,
        context,
        explicitOnceKey: input.onceKey,
      });
      if (!payloadResult.ok) {
        const result: V2TrackResult = {
          ok: false,
          status: "rejected",
          reason: payloadResult.reason,
          message: payloadResult.message,
          eventName: input.eventName,
        };
        recordV2AnalyticsDebug({ at: new Date().toISOString(), result });
        return result;
      }

      const claim = onceEngine.claim(payloadResult.onceKey);
      if (claim === "already_tracked") {
        const result: V2TrackResult = {
          ok: true,
          status: "already_tracked",
          onceKey: payloadResult.onceKey,
          eventName: input.eventName,
        };
        recordV2AnalyticsDebug({ at: new Date().toISOString(), result });
        return result;
      }

      const record: V2AnalyticsRecord = {
        eventName: lookup.definition.eventName,
        eventVersion: lookup.definition.eventVersion,
        layer: lookup.definition.layer,
        owner: lookup.definition.owner,
        onceKey: payloadResult.onceKey,
        context,
        payload: payloadResult.payload,
        occurredAt: new Date().toISOString(),
      };

      // Sink fan-out — never awaited for UX. Failures may drop events (see ANALYTICS_SINK_FAILURE.md).
      for (const sink of sinks.list()) {
        try {
          void Promise.resolve(sink.write(record)).catch(() => {
            recordV2SinkHealth("dropped");
          });
        } catch {
          recordV2SinkHealth("dropped");
        }
      }

      const result: V2TrackResult = {
        ok: true,
        status: "tracked",
        onceKey: payloadResult.onceKey,
        eventName: input.eventName,
      };
      recordV2AnalyticsDebug({
        at: new Date().toISOString(),
        record,
        result,
      });
      return result;
    },
  };
}

/** Process-wide bus — the only entry point callers should use later. */
let defaultBus: V2AnalyticsBus | null = null;

/**
 * Install / replace the process-wide bus (product bootstrap).
 * Use localStorage OnceStore in browsers so once-keys survive refresh.
 */
export function installV2AnalyticsBus(
  options: V2AnalyticsBusOptions = {},
): V2AnalyticsBus {
  defaultBus = createV2AnalyticsBus(options);
  return defaultBus;
}

export function getV2AnalyticsBus(): V2AnalyticsBus {
  if (!defaultBus) {
    defaultBus = createV2AnalyticsBus();
  }
  return defaultBus;
}

/** Sole public track helper — all emitters must call this. */
export function trackV2AnalyticsEvent(input: V2TrackInput): V2TrackResult {
  return getV2AnalyticsBus().track(input);
}

export function resetV2AnalyticsBusForTests(): void {
  defaultBus = null;
  clearV2AnalyticsDebugBuffer();
  resetV2SinkHealthForTests();
}

export type { CreateV2AnalyticsContextInput };
export { createV2AnalyticsContext, isV2AnalyticsDebugEnabled };
