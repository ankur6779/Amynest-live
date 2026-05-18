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

export function sendSafeError(
  res: Response,
  status: number,
  message: string,
  fallback = false,
): void {
  sendSafeJson(res, status, {
    success: false,
    data: {},
    fallback,
    error: message,
  });
}
