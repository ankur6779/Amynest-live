import { logger } from "../lib/logger.js";

export type TtsCostEventName =
  | "tts_generated"
  | "tts_cache_hit"
  | "tts_cache_miss"
  | "tts_rate_limited";

export interface TtsCostEventRecord {
  ts: number;
  event: TtsCostEventName;
  userId: string;
  route?: string;
  reason?: "burst" | "daily";
  isPremium?: boolean;
}

const MAX_EVENTS = 5000;
const events: TtsCostEventRecord[] = [];
const counts = new Map<TtsCostEventName, number>();

export function recordTtsCostEvent(
  event: TtsCostEventName,
  meta: {
    userId: string;
    route?: string;
    reason?: "burst" | "daily";
    isPremium?: boolean;
  },
): void {
  events.push({
    ts: Date.now(),
    event,
    userId: meta.userId,
    route: meta.route,
    reason: meta.reason,
    isPremium: meta.isPremium,
  });
  counts.set(event, (counts.get(event) ?? 0) + 1);
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
  logger.info(
    {
      evt: event,
      userId: meta.userId,
      route: meta.route,
      reason: meta.reason,
      isPremium: meta.isPremium,
    },
    "tts cost event",
  );
}

export function getTtsCostAnalyticsCounts(): Record<TtsCostEventName, number> {
  return {
    tts_generated: counts.get("tts_generated") ?? 0,
    tts_cache_hit: counts.get("tts_cache_hit") ?? 0,
    tts_cache_miss: counts.get("tts_cache_miss") ?? 0,
    tts_rate_limited: counts.get("tts_rate_limited") ?? 0,
  };
}

export function resetTtsCostAnalyticsForTests(): void {
  events.length = 0;
  counts.clear();
}
