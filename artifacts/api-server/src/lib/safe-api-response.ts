import type { Response } from "express";

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
