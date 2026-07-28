import { randomUUID } from "node:crypto";
import type { OpsLogLevel, StructuredLogRecord } from "../../types/operations.js";

export interface StructuredLoggerOptions {
  level?: OpsLogLevel;
  correlationId?: string;
  sink?: (record: StructuredLogRecord) => void;
}

const LEVEL_RANK: Record<OpsLogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/** Structured JSON logger — never writes secrets; ops CLI streams these records. */
export class StructuredLogger {
  private readonly minLevel: OpsLogLevel;
  private readonly correlationId: string;
  private readonly sink: (record: StructuredLogRecord) => void;
  private readonly records: StructuredLogRecord[] = [];

  constructor(options: StructuredLoggerOptions = {}) {
    this.minLevel = options.level ?? "info";
    this.correlationId = options.correlationId ?? randomUUID();
    this.sink =
      options.sink ??
      ((record) => {
        console.log(JSON.stringify(record));
      });
  }

  getCorrelationId(): string {
    return this.correlationId;
  }

  list(): StructuredLogRecord[] {
    return this.records.map((r) => ({ ...r, metadata: r.metadata ? { ...r.metadata } : undefined }));
  }

  clear(): void {
    this.records.length = 0;
  }

  child(fields: Partial<StructuredLogRecord>): StructuredLogger {
    const parent = this;
    const child = new StructuredLogger({
      level: this.minLevel,
      correlationId: this.correlationId,
      sink: (record) => {
        parent.write({
          ...fields,
          ...record,
          correlationId: this.correlationId,
        });
      },
    });
    return child;
  }

  debug(message: string, fields?: Partial<StructuredLogRecord>): void {
    this.write({ level: "debug", message, ...fields });
  }

  info(message: string, fields?: Partial<StructuredLogRecord>): void {
    this.write({ level: "info", message, ...fields });
  }

  warn(message: string, fields?: Partial<StructuredLogRecord>): void {
    this.write({ level: "warn", message, ...fields });
  }

  error(message: string, fields?: Partial<StructuredLogRecord>): void {
    this.write({ level: "error", message, ...fields });
  }

  private write(partial: Partial<StructuredLogRecord> & { level: OpsLogLevel; message: string }): void {
    if (LEVEL_RANK[partial.level] < LEVEL_RANK[this.minLevel]) return;
    const record: StructuredLogRecord = {
      level: partial.level,
      message: partial.message,
      timestamp: partial.timestamp ?? new Date().toISOString(),
      correlationId: partial.correlationId ?? this.correlationId,
      workflowId: partial.workflowId,
      videoId: partial.videoId,
      topicId: partial.topicId,
      provider: partial.provider,
      phase: partial.phase,
      durationMs: partial.durationMs,
      retryCount: partial.retryCount,
      metadata: partial.metadata,
    };
    this.records.push(record);
    this.sink(record);
  }
}

export function createStructuredLogger(
  options?: StructuredLoggerOptions,
): StructuredLogger {
  return new StructuredLogger(options);
}
