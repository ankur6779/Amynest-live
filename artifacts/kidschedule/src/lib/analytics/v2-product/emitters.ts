/**
 * Product analytics emitters — Sprint 3C-4.
 * Sole sink path: trackV2AnalyticsEvent (Analytics Core).
 * No Firebase · No Google Ads · No RevenueCat.
 */

import {
  trackV2AnalyticsEvent,
  type V2TrackResult,
} from "@/lib/analytics/v2-core";
import { ensureProductAnalyticsReady } from "./bootstrap";
import { ensureCohortDay0 } from "./cohort";
import { addLocalDateDays, daysSinceCohortDay0, localDateKey } from "./dates";
import { readDoorStartedAt } from "./door-start";
import { WOW_WINDOW_MS } from "./journey-meta";
import {
  countPracticesInDay3Window,
  recordPracticeCompletion,
} from "./practice-log";

export type EmitMissionStartedInput = {
  missionId: string;
  dateKey?: string;
  ageBand?: string | null;
  worryId?: string | null;
  duration?: string | null;
  difficulty?: string | null;
  estimatedMinutes?: number | null;
  now?: Date;
  accountId?: string | null;
};

export type EmitMissionCompletedInput = {
  missionId: string;
  dateKey?: string;
  ageBand?: string | null;
  worryId?: string | null;
  now?: Date;
  accountId?: string | null;
  /** Also evaluate WOW + practice day-3 from this success. */
  evaluateNorthStars?: boolean;
};

export function emitV2MissionStarted(
  input: EmitMissionStartedInput,
): V2TrackResult {
  ensureProductAnalyticsReady({ accountId: input.accountId });
  const now = input.now ?? new Date();
  const dateKey = input.dateKey ?? localDateKey(now);
  const payload: Record<string, unknown> = {
    mission_id: input.missionId,
    date_key: dateKey,
  };
  if (input.ageBand) payload.age_band = input.ageBand;
  if (input.worryId) payload.worry_id = input.worryId;
  if (input.duration) payload.duration = input.duration;
  if (input.difficulty) payload.difficulty = input.difficulty;
  if (
    typeof input.estimatedMinutes === "number" &&
    Number.isFinite(input.estimatedMinutes)
  ) {
    payload.estimated_minutes = input.estimatedMinutes;
  }

  return trackV2AnalyticsEvent({
    eventName: "v2_mission_started",
    eventVersion: 1,
    layer: "product",
    owner: "fe.today_mission",
    payload,
  });
}

export function emitV2MissionCompleted(
  input: EmitMissionCompletedInput,
): {
  mission: V2TrackResult;
  wow?: V2TrackResult;
  practiceDay3?: V2TrackResult;
} {
  ensureProductAnalyticsReady({ accountId: input.accountId });
  const now = input.now ?? new Date();
  const dateKey = input.dateKey ?? localDateKey(now);
  const payload: Record<string, unknown> = {
    mission_id: input.missionId,
    date_key: dateKey,
  };
  if (input.ageBand) payload.age_band = input.ageBand;
  if (input.worryId) payload.worry_id = input.worryId;

  const mission = trackV2AnalyticsEvent({
    eventName: "v2_mission_completed",
    eventVersion: 1,
    layer: "product",
    owner: "fe.today_mission",
    payload,
  });

  const evaluate = input.evaluateNorthStars !== false;
  if (!evaluate) {
    return { mission };
  }

  // WOW / Day-3 only on first successful mission track (not already_tracked).
  if (!(mission.ok && mission.status === "tracked")) {
    return { mission };
  }

  const wow = emitV2WowCompletedIfEligible({
    practiceId: input.missionId,
    ageBand: input.ageBand,
    worryId: input.worryId,
    now,
    accountId: input.accountId,
  });

  const practiceDay3 = emitV2PracticeDay3IfEligible({
    missionId: input.missionId,
    dateKey,
    completedAt: now.toISOString(),
    now,
    accountId: input.accountId,
  });

  return { mission, wow, practiceDay3 };
}

export function emitV2WowCompletedIfEligible(input: {
  practiceId: string;
  ageBand?: string | null;
  worryId?: string | null;
  now?: Date;
  accountId?: string | null;
}): V2TrackResult {
  ensureProductAnalyticsReady({ accountId: input.accountId });
  const now = input.now ?? new Date();
  const doorStartedAt = readDoorStartedAt();
  if (!doorStartedAt) {
    return {
      ok: false,
      status: "rejected",
      reason: "invalid_payload",
      message: "Front Door start not recorded — WOW not eligible",
      eventName: "v2_wow_completed",
    };
  }
  const startedMs = Date.parse(doorStartedAt);
  if (Number.isNaN(startedMs)) {
    return {
      ok: false,
      status: "rejected",
      reason: "invalid_payload",
      message: "Invalid door_started_at",
      eventName: "v2_wow_completed",
    };
  }
  const elapsedMs = now.getTime() - startedMs;
  if (elapsedMs < 0 || elapsedMs > WOW_WINDOW_MS) {
    return {
      ok: false,
      status: "rejected",
      reason: "invalid_payload",
      message: `WOW window missed (elapsed_ms=${elapsedMs})`,
      eventName: "v2_wow_completed",
    };
  }

  const payload: Record<string, unknown> = {
    door_started_at: doorStartedAt,
    completed_at: now.toISOString(),
    elapsed_ms: elapsedMs,
    practice_id: input.practiceId,
  };
  if (input.ageBand) payload.age_band = input.ageBand;
  if (input.worryId) payload.worry_id = input.worryId;

  return trackV2AnalyticsEvent({
    eventName: "v2_wow_completed",
    eventVersion: 1,
    layer: "product",
    owner: "fe.front_door",
    payload,
  });
}

/** Registry name is `v2_d1_returned` (sprint brief shorthand: v2_d1_return). */
export function emitV2D1ReturnedIfEligible(input?: {
  now?: Date;
  accountId?: string | null;
}): V2TrackResult {
  ensureProductAnalyticsReady({ accountId: input?.accountId });
  const now = input?.now ?? new Date();
  const cohortDay0 = ensureCohortDay0(now);
  const returnDate = localDateKey(now);
  const expected = addLocalDateDays(cohortDay0, 1);
  if (!expected || returnDate !== expected) {
    return {
      ok: false,
      status: "rejected",
      reason: "invalid_payload",
      message: `Not D+1 (cohort_day0=${cohortDay0}, return_date=${returnDate})`,
      eventName: "v2_d1_returned",
    };
  }

  return trackV2AnalyticsEvent({
    eventName: "v2_d1_returned",
    eventVersion: 1,
    layer: "business",
    owner: "fe.analytics_bootstrap",
    payload: {
      cohort_day0: cohortDay0,
      return_date: returnDate,
    },
  });
}

export function emitV2PracticeDay3IfEligible(input: {
  missionId: string;
  dateKey: string;
  completedAt: string;
  now?: Date;
  accountId?: string | null;
}): V2TrackResult {
  ensureProductAnalyticsReady({ accountId: input.accountId });
  const now = input.now ?? new Date();
  const cohortDay0 = ensureCohortDay0(now);
  const log = recordPracticeCompletion({
    missionId: input.missionId,
    dateKey: input.dateKey,
    completedAt: input.completedAt,
  });
  const practiceCount = countPracticesInDay3Window(cohortDay0, log);
  if (practiceCount < 2) {
    return {
      ok: false,
      status: "rejected",
      reason: "invalid_payload",
      message: `Practice day-3 threshold not met (count=${practiceCount})`,
      eventName: "v2_practice_day3",
    };
  }

  const dayOffset = daysSinceCohortDay0(cohortDay0, input.dateKey);
  if (dayOffset == null || dayOffset < 0 || dayOffset > 3) {
    return {
      ok: false,
      status: "rejected",
      reason: "invalid_payload",
      message: `Outside day-3 window (offset=${dayOffset})`,
      eventName: "v2_practice_day3",
    };
  }

  return trackV2AnalyticsEvent({
    eventName: "v2_practice_day3",
    eventVersion: 1,
    layer: "business",
    owner: "fe.practice_counter",
    payload: {
      cohort_day0: cohortDay0,
      practice_count: practiceCount,
      reached_on_date: localDateKey(now),
    },
  });
}
