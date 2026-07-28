import type { PublishingErrorCode } from "../../types/published-video.js";

export class PublishingError extends Error {
  readonly code: PublishingErrorCode;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(
    code: PublishingErrorCode,
    message: string,
    options: { retryable?: boolean; status?: number; cause?: unknown } = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "PublishingError";
    this.code = code;
    this.retryable = options.retryable ?? isRetryableCode(code);
    this.status = options.status;
  }
}

export function isPublishingError(error: unknown): error is PublishingError {
  return error instanceof PublishingError;
}

export function toPublishingError(error: unknown): PublishingError {
  if (isPublishingError(error)) return error;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("quota")) {
      return new PublishingError("quota", error.message, { retryable: true, cause: error });
    }
    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("econn") ||
      message.includes("timeout")
    ) {
      return new PublishingError("network", error.message, {
        retryable: true,
        cause: error,
      });
    }
    return new PublishingError("unknown", error.message, { cause: error });
  }
  return new PublishingError("unknown", String(error));
}

function isRetryableCode(code: PublishingErrorCode): boolean {
  return code === "quota" || code === "network";
}
