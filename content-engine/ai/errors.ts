export type ContentEngineErrorCode =
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_TIMEOUT"
  | "INVALID_JSON"
  | "SCHEMA_VALIDATION"
  | "MODERATION_REJECTED"
  | "QUALITY_THRESHOLD"
  | "SEO_THRESHOLD"
  | "CACHE_ERROR"
  | "CONFIG_ERROR"
  | "RETRY_EXHAUSTED"
  | "UNKNOWN";

export class ContentEngineError extends Error {
  readonly code: ContentEngineErrorCode;
  readonly recoverable: boolean;
  readonly cause?: unknown;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ContentEngineErrorCode,
    message: string,
    options: {
      recoverable?: boolean;
      cause?: unknown;
      details?: Record<string, unknown>;
    } = {},
  ) {
    super(message);
    this.name = "ContentEngineError";
    this.code = code;
    this.recoverable = options.recoverable ?? false;
    this.cause = options.cause;
    this.details = options.details;
  }
}

export function isContentEngineError(error: unknown): error is ContentEngineError {
  return error instanceof ContentEngineError;
}

export function toContentEngineError(error: unknown): ContentEngineError {
  if (isContentEngineError(error)) return error;
  if (error instanceof Error) {
    return new ContentEngineError("UNKNOWN", error.message, {
      recoverable: true,
      cause: error,
    });
  }
  return new ContentEngineError("UNKNOWN", String(error), { recoverable: true });
}
