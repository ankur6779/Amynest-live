/**
 * Offline queue for Firebase sink.
 *
 * Sprint 3C-5: explicit no-op.
 * We do not implement a custom offline queue. When Firebase Analytics is
 * unavailable, events are dropped at the sink (bus once-key already claimed).
 * Product UX is never blocked — see docs/v2/ANALYTICS_SINK_FAILURE.md.
 * Firebase JS SDK may buffer internally when initialized — that is opaque to us.
 */

import type { V2AnalyticsRecord } from "../../types";

export type OfflineFirebaseEnqueue = {
  /** Always false in 3C-5 — documents that no custom queue exists. */
  supported: false;
  enqueue(record: V2AnalyticsRecord): void;
  flush(): Promise<number>;
  size(): number;
};

/** Explicit no-op offline queue (contract for tests / future SQLite). */
export function createNoopFirebaseOfflineQueue(): OfflineFirebaseEnqueue {
  return {
    supported: false,
    enqueue(_record: V2AnalyticsRecord): void {
      /* intentional no-op */
    },
    async flush(): Promise<number> {
      return 0;
    },
    size(): number {
      return 0;
    },
  };
}
