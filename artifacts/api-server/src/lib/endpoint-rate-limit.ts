import type { Request, Response } from "express";
import {
  checkDistributedRateLimit,
  type RateLimitOptions,
} from "./distributed-rate-limit.js";

/** Public GCS/audio stream proxies — matches spelling-library cap. */
export const PUBLIC_STREAM_RATE: RateLimitOptions = {
  windowMs: 60_000,
  maxPerWindow: 120,
};

/** Pre-auth telemetry / beacon ingest. */
export const PUBLIC_BEACON_RATE: RateLimitOptions = {
  windowMs: 60_000,
  maxPerWindow: 60,
};

export function getClientRequestIp(req: Request): string {
  return String(req.ip ?? req.socket.remoteAddress ?? "unknown");
}

/** Returns true when the request is blocked (429 already sent). */
export async function rejectIfIpRateLimited(
  req: Request,
  res: Response,
  scope: string,
  options: RateLimitOptions,
): Promise<boolean> {
  const rate = await checkDistributedRateLimit(`${scope}:${getClientRequestIp(req)}`, options);
  if (!rate.allowed) {
    res.status(429).json({ error: "rate_limited", retryAfterMs: rate.retryAfterMs });
    return true;
  }
  return false;
}

/** Per-user scope — returns true when blocked (429 already sent). */
export async function rejectIfUserRateLimited(
  res: Response,
  userId: string,
  scope: string,
  options: RateLimitOptions,
): Promise<boolean> {
  const rate = await checkDistributedRateLimit(`${scope}:${userId}`, options);
  if (!rate.allowed) {
    res.status(429).json({ error: "rate_limited", retryAfterMs: rate.retryAfterMs });
    return true;
  }
  return false;
}
