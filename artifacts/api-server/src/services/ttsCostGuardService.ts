import { checkAiRateLimit, clearAiRateLimits } from "../utils/ai-rate-limit.js";
import {
  FREE_FEATURE_LIMITS,
  getFeatureUsage,
  getOrCreateSubscription,
  incrementFeatureUsage,
  isPremiumNow,
  nextResetAtFor,
} from "./subscriptionService.js";
import { recordTtsCostEvent } from "./tts-cost-analytics-store.js";

const BURST_WINDOW_MS = Number(process.env.TTS_BURST_WINDOW_MS ?? String(60_000));
const BURST_LIMIT_FREE = Number(process.env.TTS_BURST_LIMIT_FREE ?? "10");
const BURST_LIMIT_PREMIUM = Number(process.env.TTS_BURST_LIMIT_PREMIUM ?? "30");
const DAILY_LIMIT_PREMIUM = Number(process.env.TTS_DAILY_MISS_LIMIT_PREMIUM ?? "500");

export type TtsRateLimitReason = "burst" | "daily";

export interface TtsCacheMissGuardOk {
  ok: true;
  isPremium: boolean;
}

export interface TtsCacheMissGuardBlocked {
  ok: false;
  reason: TtsRateLimitReason;
  limit: number;
  used: number;
  retryAfterMs?: number;
  resetsAt?: string | null;
  isPremium: boolean;
}

export type TtsCacheMissGuardResult = TtsCacheMissGuardOk | TtsCacheMissGuardBlocked;

export class TtsRateLimitedError extends Error {
  readonly reason: TtsRateLimitReason;
  readonly limit: number;
  readonly used: number;
  readonly retryAfterMs?: number;
  readonly resetsAt?: string | null;
  readonly isPremium: boolean;

  constructor(blocked: TtsCacheMissGuardBlocked) {
    super("tts_rate_limited");
    this.name = "TtsRateLimitedError";
    this.reason = blocked.reason;
    this.limit = blocked.limit;
    this.used = blocked.used;
    this.retryAfterMs = blocked.retryAfterMs;
    this.resetsAt = blocked.resetsAt;
    this.isPremium = blocked.isPremium;
  }
}

export function isTtsRateLimitedError(err: unknown): err is TtsRateLimitedError {
  return err instanceof TtsRateLimitedError;
}

export function ttsRateLimitResponseBody(err: TtsRateLimitedError): {
  error: "tts_rate_limited";
  reason: TtsRateLimitReason;
  limit: number;
  used: number;
  retryAfterMs: number;
  resetsAt?: string | null;
} {
  return {
    error: "tts_rate_limited",
    reason: err.reason,
    limit: err.limit,
    used: err.used,
    retryAfterMs: err.retryAfterMs ?? 0,
    ...(err.resetsAt != null ? { resetsAt: err.resetsAt } : {}),
  };
}

function burstLimitFor(isPremium: boolean): number {
  return isPremium ? BURST_LIMIT_PREMIUM : BURST_LIMIT_FREE;
}

function dailyLimitFor(isPremium: boolean): number {
  return isPremium ? DAILY_LIMIT_PREMIUM : FREE_FEATURE_LIMITS.tts_generation;
}

/** Pure helper for unit tests — evaluates daily quota without DB. */
export function evaluateDailyTtsQuota(
  used: number,
  limit: number,
  reserve = 1,
): { allowed: true; nextUsed: number } | { allowed: false; used: number; limit: number } {
  if (used + reserve > limit) {
    return { allowed: false, used, limit };
  }
  return { allowed: true, nextUsed: used + reserve };
}

export async function assertTtsCacheMissAllowed(
  userId: string,
  route: string,
): Promise<TtsCacheMissGuardResult> {
  const sub = await getOrCreateSubscription(userId);
  const isPremium = isPremiumNow(sub);
  const burstLimit = burstLimitFor(isPremium);
  const dailyLimit = dailyLimitFor(isPremium);

  const burst = checkAiRateLimit(`tts:burst:${userId}`, {
    windowMs: BURST_WINDOW_MS,
    maxPerWindow: burstLimit,
  });
  if (!burst.allowed) {
    recordTtsCostEvent("tts_rate_limited", {
      userId,
      route,
      reason: "burst",
      isPremium,
    });
    return {
      ok: false,
      reason: "burst",
      limit: burstLimit,
      used: burstLimit,
      retryAfterMs: burst.retryAfterMs,
      isPremium,
    };
  }

  const usedBefore = await getFeatureUsage(userId, "tts_generation");
  const dailyEval = evaluateDailyTtsQuota(usedBefore, dailyLimit, 1);
  if (!dailyEval.allowed) {
    recordTtsCostEvent("tts_rate_limited", {
      userId,
      route,
      reason: "daily",
      isPremium,
    });
    return {
      ok: false,
      reason: "daily",
      limit: dailyLimit,
      used: usedBefore,
      resetsAt: nextResetAtFor("tts_generation"),
      isPremium,
    };
  }

  const usedAfter = await incrementFeatureUsage(userId, "tts_generation", 1);
  if (usedAfter > dailyLimit) {
    await refundTtsDailyMiss(userId, 1);
    recordTtsCostEvent("tts_rate_limited", {
      userId,
      route,
      reason: "daily",
      isPremium,
    });
    return {
      ok: false,
      reason: "daily",
      limit: dailyLimit,
      used: dailyLimit,
      resetsAt: nextResetAtFor("tts_generation"),
      isPremium,
    };
  }

  return { ok: true, isPremium };
}

export async function refundTtsDailyMiss(userId: string, by = 1): Promise<void> {
  await incrementFeatureUsage(userId, "tts_generation", -by).catch(() => undefined);
}

export function recordTtsCacheHit(userId: string, route: string, isPremium?: boolean): void {
  recordTtsCostEvent("tts_cache_hit", { userId, route, isPremium });
}

export function recordTtsCacheMissAndGenerated(
  userId: string,
  route: string,
  isPremium?: boolean,
): void {
  recordTtsCostEvent("tts_cache_miss", { userId, route, isPremium });
  recordTtsCostEvent("tts_generated", { userId, route, isPremium });
}

export function clearTtsCostGuardForTests(): void {
  clearAiRateLimits();
}
