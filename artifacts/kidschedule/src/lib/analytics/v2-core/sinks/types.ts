/**
 * Sink abstraction.
 * FirebaseSink (3C-5) · Future: ConsoleSink · AdsSink · DebugSink
 *
 * Product code must never call sinks or Firebase directly —
 * only the Event Bus may invoke `write`.
 */

import type { V2AnalyticsRecord } from "../types";

/**
 * Downstream writer. The Event Bus is the only caller.
 */
export interface AnalyticsSink {
  readonly id: string;
  write(record: V2AnalyticsRecord): void | Promise<void>;
}

/** Registry of sinks — bus fans out after validation + once-claim. */
export type SinkRegistry = {
  list(): readonly AnalyticsSink[];
  register(sink: AnalyticsSink): void;
  clear(): void;
};

export function createSinkRegistry(): SinkRegistry {
  const sinks: AnalyticsSink[] = [];
  return {
    list: () => sinks,
    register(sink: AnalyticsSink) {
      if (sinks.some((s) => s.id === sink.id)) return;
      sinks.push(sink);
    },
    clear() {
      sinks.length = 0;
    },
  };
}
