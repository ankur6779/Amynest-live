export type GeminiVideoErrorCode =
  | "CONFIG_ERROR"
  | "AUTH_ERROR"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "SAFETY_BLOCKED"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_TIMEOUT"
  | "OPERATION_FAILED"
  | "OPERATION_CANCELLED"
  | "DOWNLOAD_FAILED"
  | "VALIDATION_FAILED"
  | "RETRY_EXHAUSTED";

export class GeminiVideoError extends Error {
  readonly code: GeminiVideoErrorCode;
  readonly recoverable: boolean;
  readonly status?: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GeminiVideoErrorCode,
    message: string,
    options: {
      recoverable?: boolean;
      status?: number;
      details?: Record<string, unknown>;
      cause?: unknown;
    } = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "GeminiVideoError";
    this.code = code;
    this.recoverable = options.recoverable ?? false;
    this.status = options.status;
    this.details = options.details;
  }
}

export function isGeminiVideoError(error: unknown): error is GeminiVideoError {
  return error instanceof GeminiVideoError;
}

export function mapHttpError(
  status: number,
  bodyText: string,
  context: string,
): GeminiVideoError {
  const snippet = bodyText.slice(0, 400);
  const lower = bodyText.toLowerCase();

  if (status === 401 || status === 403) {
    return new GeminiVideoError(
      "AUTH_ERROR",
      `Gemini/Veo auth failed during ${context}: ${snippet}`,
      { recoverable: false, status },
    );
  }
  if (status === 429) {
    return new GeminiVideoError(
      "RATE_LIMITED",
      `Gemini/Veo rate limited during ${context}: ${snippet}`,
      { recoverable: true, status },
    );
  }
  if (status === 408 || status === 504) {
    return new GeminiVideoError(
      "PROVIDER_TIMEOUT",
      `Gemini/Veo timeout during ${context}: ${snippet}`,
      { recoverable: true, status },
    );
  }
  if (
    lower.includes("quota") ||
    lower.includes("resource_exhausted") ||
    lower.includes("billing")
  ) {
    return new GeminiVideoError(
      "QUOTA_EXCEEDED",
      `Gemini/Veo quota/billing issue during ${context}: ${snippet}`,
      { recoverable: false, status },
    );
  }
  if (
    lower.includes("safety") ||
    lower.includes("blocked") ||
    lower.includes("prohibited") ||
    lower.includes("person_generation")
  ) {
    return new GeminiVideoError(
      "SAFETY_BLOCKED",
      `Gemini/Veo safety filter blocked ${context}: ${snippet}`,
      { recoverable: false, status },
    );
  }
  if (status >= 500) {
    return new GeminiVideoError(
      "PROVIDER_UNAVAILABLE",
      `Gemini/Veo unavailable during ${context}: ${snippet}`,
      { recoverable: true, status },
    );
  }
  return new GeminiVideoError(
    "OPERATION_FAILED",
    `Gemini/Veo ${context} failed (${status}): ${snippet}`,
    { recoverable: status >= 500, status },
  );
}

export function computeBackoffMs(
  attempt: number,
  baseDelayMs = 1_000,
  maxDelayMs = 30_000,
): number {
  const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt));
  const jitter = Math.floor(Math.random() * Math.min(250, exp * 0.1));
  return exp + jitter;
}
