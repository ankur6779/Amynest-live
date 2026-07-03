import type { Request, Response } from "express";

export type StructuredApiErrorBody = {
  success: false;
  /** Machine-readable code (legacy clients read `error`). */
  error: string;
  code: string;
  message: string;
  details: Record<string, unknown>;
  requestId?: string;
  timestamp: string;
};

export function getRequestId(req: Request): string | undefined {
  if (typeof req.requestId === "string" && req.requestId.length > 0) {
    return req.requestId;
  }
  const id = (req as Request & { id?: string }).id;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

export type SafeApiPayload<T> = {
  success: boolean;
  data: T;
  fallback?: boolean;
  error?: string;
};

/** Never send `undefined` / `null` bodies — clients always get structured JSON. */
export function sendSafeJson<T>(
  res: Response,
  status: number,
  payload: {
    success: boolean;
    data?: T;
    fallback?: boolean;
    error?: string;
  },
): void {
  const body: SafeApiPayload<T | Record<string, never>> = {
    success: payload.success,
    data: payload.data ?? ({} as T | Record<string, never>),
    ...(payload.fallback !== undefined ? { fallback: payload.fallback } : {}),
    ...(payload.error ? { error: payload.error } : {}),
  };
  res.status(status).json(body);
}

/** Strip Drizzle/Postgres internals before returning errors to clients. */
export function sanitizePublicErrorMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return "Something went wrong. Please try again.";
  if (/Failed query:/i.test(trimmed)) {
    return "Something went wrong. Please try again.";
  }
  if (/\bon conflict\s*\(/i.test(trimmed) && trimmed.length > 120) {
    return "Something went wrong. Please try again.";
  }
  if (trimmed.length > 400) {
    return "Something went wrong. Please try again.";
  }
  return trimmed;
}

export function sendSafeError(
  res: Response,
  status: number,
  message: string,
  fallback = false,
): void {
  const safe =
    process.env.NODE_ENV === "production"
      ? sanitizePublicErrorMessage(message)
      : message;
  sendSafeJson(res, status, {
    success: false,
    data: {},
    fallback,
    error: safe,
  });
}

/**
 * Standard API error envelope for Phase 3 stability.
 * Keeps `error` as the code string for backward compatibility.
 */
export function sendStructuredApiError(
  res: Response,
  status: number,
  opts: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  },
): void {
  const message =
    process.env.NODE_ENV === "production"
      ? sanitizePublicErrorMessage(opts.message)
      : opts.message;
  const body: StructuredApiErrorBody = {
    success: false,
    error: opts.code,
    code: opts.code,
    message,
    details: opts.details ?? {},
    ...(opts.requestId ? { requestId: opts.requestId } : {}),
    timestamp: new Date().toISOString(),
  };
  res.status(status).json(body);
}
