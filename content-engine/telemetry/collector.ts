export interface TelemetryEvent {
  name: string;
  timestamp: string;
  generationTimeMs: number;
  provider: string;
  tokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  errors: string[];
  retryCount: number;
  cacheHit: boolean;
  topicId?: string;
  seoScore?: number;
  qualityScore?: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface TelemetrySink {
  record(event: TelemetryEvent): void;
  list(): TelemetryEvent[];
  clear(): void;
}

/** In-process telemetry collector with structured events. */
export class InMemoryTelemetrySink implements TelemetrySink {
  private events: TelemetryEvent[] = [];

  record(event: TelemetryEvent): void {
    this.events.push({ ...event, errors: [...event.errors] });
  }

  list(): TelemetryEvent[] {
    return this.events.map((e) => ({ ...e, errors: [...e.errors] }));
  }

  clear(): void {
    this.events = [];
  }
}

export function createTelemetryEvent(
  partial: Omit<TelemetryEvent, "timestamp"> & { timestamp?: string },
): TelemetryEvent {
  return {
    timestamp: partial.timestamp ?? new Date().toISOString(),
    name: partial.name,
    generationTimeMs: partial.generationTimeMs,
    provider: partial.provider,
    tokens: partial.tokens,
    promptTokens: partial.promptTokens,
    completionTokens: partial.completionTokens,
    errors: partial.errors ?? [],
    retryCount: partial.retryCount,
    cacheHit: partial.cacheHit,
    topicId: partial.topicId,
    seoScore: partial.seoScore,
    qualityScore: partial.qualityScore,
    metadata: partial.metadata,
  };
}
