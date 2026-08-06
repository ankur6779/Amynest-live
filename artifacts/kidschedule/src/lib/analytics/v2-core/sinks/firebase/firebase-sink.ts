/**
 * FirebaseSink — Analytics Core sink only.
 * Never a caller from product code. Bus is the sole invoker of write().
 *
 * Sprint 3C-5: allowlist + mapping + once-forward + context/journey/version.
 * No Google Ads · No RevenueCat · No commerce/ads layer forwarding.
 */

import { recordV2SinkHealth } from "../../sink-health";
import type { V2AnalyticsRecord } from "../../types";
import type { AnalyticsSink } from "../types";
import { isAllowedForFirebaseSink } from "./allowlist";
import {
  createFirebaseJsWriter,
  type FirebaseAnalyticsWriter,
} from "./client";
import { mapRegistryEventToFirebaseName } from "./mapping";
import {
  createNoopFirebaseOfflineQueue,
  type OfflineFirebaseEnqueue,
} from "./offline";
import { buildFirebaseParams } from "./params";

export const FIREBASE_SINK_ID = "firebase" as const;

export type FirebaseSinkWriteResult =
  | { status: "forwarded"; firebaseEventName: string; onceKey: string }
  | { status: "rejected"; reason: string; onceKey?: string }
  | { status: "already_forwarded"; onceKey: string }
  | { status: "writer_failed"; onceKey: string; firebaseEventName: string };

export type FirebaseSink = AnalyticsSink & {
  readonly id: typeof FIREBASE_SINK_ID;
  /** Last write outcome (tests / debug). */
  getLastResult(): FirebaseSinkWriteResult | null;
  /** Sink-level once-keys already forwarded. */
  hasForwarded(onceKey: string): boolean;
  resetForwardedForTests(): void;
  getOfflineQueue(): OfflineFirebaseEnqueue;
};

export type CreateFirebaseSinkOptions = {
  writer?: FirebaseAnalyticsWriter;
  offlineQueue?: OfflineFirebaseEnqueue;
};

export function createFirebaseSink(
  options: CreateFirebaseSinkOptions = {},
): FirebaseSink {
  const writer = options.writer ?? createFirebaseJsWriter();
  const offline = options.offlineQueue ?? createNoopFirebaseOfflineQueue();
  const forwarded = new Set<string>();
  let lastResult: FirebaseSinkWriteResult | null = null;

  const sink: FirebaseSink = {
    id: FIREBASE_SINK_ID,

    getLastResult: () => lastResult,
    hasForwarded: (onceKey) => forwarded.has(onceKey),
    resetForwardedForTests: () => {
      forwarded.clear();
      lastResult = null;
    },
    getOfflineQueue: () => offline,

    write(record: V2AnalyticsRecord): Promise<void> {
      return writeAsync(record);
    },
  };

  async function writeAsync(record: V2AnalyticsRecord): Promise<void> {
    try {
      const allow = isAllowedForFirebaseSink(record.eventName);
      if (!allow.ok) {
        lastResult = {
          status: "rejected",
          reason: allow.reason,
          onceKey: record.onceKey,
        };
        recordV2SinkHealth("rejected");
        return;
      }

      if (forwarded.has(record.onceKey)) {
        lastResult = {
          status: "already_forwarded",
          onceKey: record.onceKey,
        };
        recordV2SinkHealth("duplicate");
        return;
      }

      const firebaseEventName = mapRegistryEventToFirebaseName(record.eventName);
      const params = buildFirebaseParams(record);

      // Claim before await so concurrent writes with same onceKey collapse.
      forwarded.add(record.onceKey);

      const ok = await writer.log(firebaseEventName, params);
      if (!ok) {
        // Explicit no-op offline path — event may be dropped; UX never waits.
        offline.enqueue(record);
        lastResult = {
          status: "writer_failed",
          onceKey: record.onceKey,
          firebaseEventName,
        };
        recordV2SinkHealth("dropped");
        return;
      }

      lastResult = {
        status: "forwarded",
        firebaseEventName,
        onceKey: record.onceKey,
      };
      recordV2SinkHealth("accepted");
    } catch {
      // Sink must never surface to product — count as dropped.
      lastResult = {
        status: "writer_failed",
        onceKey: record.onceKey,
        firebaseEventName: record.eventName,
      };
      recordV2SinkHealth("dropped");
    }
  }

  return sink;
}
