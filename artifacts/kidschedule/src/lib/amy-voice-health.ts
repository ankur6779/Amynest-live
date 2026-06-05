/**
 * Amy voice health metrics — success targets, rolling windows, sustained alerting.
 */

import type { AmyVoiceLayer } from "@/lib/amy-voice-telemetry";
import { reportAmyVoiceMonitoring } from "@/lib/amy-voice-telemetry";

/** Product success targets — healthy Amy voice at scale. */
export const AMY_VOICE_SUCCESS_TARGETS = {
  maxFallbackRate: 0.05,
  maxAvgReplayCount: 1.6,
  /** Rolling avg duration may deviate up to ±35% from session baseline. */
  sessionDurationStabilityRatio: 0.35,
} as const;

/** Alert policy — avoid single-sample noise. */
const ALERT_POLICY = {
  minRollingSample: 25,
  sustainedBreachesRequired: 3,
  evaluateEverySpeaks: 5,
  rollingWindowSize: 40,
  sessionDurationWarmupSpeaks: 20,
  fallbackRateCriticalMultiplier: 2,
  replayCriticalMultiplier: 1.75,
} as const;

export type AmyVoiceHealthStatus = "healthy" | "watch" | "degraded" | "critical";

export type AmyVoiceHealthAlert = {
  code: string;
  message: string;
  severity: "warning" | "critical";
  metric: string;
  value: number;
  threshold: number;
  sustainedBreaches: number;
};

export type ModeHealthMetrics = {
  speaks: number;
  fallbackCount: number;
  fallbackRate: number;
  avgReplayCount: number;
  avgDurationMs: number;
  highReplayRate: number;
};

export type AmyVoiceHealthSnapshot = {
  totalSpeaks: number;
  fallbackCount: number;
  fallbackRate: number;
  avgReplayCount: number;
  avgSessionDurationMs: number;
  healthStatus: AmyVoiceHealthStatus;
  meetsSuccessTargets: boolean;
  targets: typeof AMY_VOICE_SUCCESS_TARGETS;
  rollingWindow: {
    sampleSize: number;
    fallbackRate: number;
    avgReplayCount: number;
    avgDurationMs: number;
    sessionDurationBaselineMs: number | null;
  };
  alerts: AmyVoiceHealthAlert[];
  phonics: ModeHealthMetrics;
  speechCoach: ModeHealthMetrics;
  math: ModeHealthMetrics;
};

type ModeBucket = {
  speaks: number;
  fallbackCount: number;
  sumReplay: number;
  sumDurationMs: number;
  highReplayCount: number;
};

type RollingSpeak = {
  fallback: boolean;
  replayCount: number;
  durationMs: number;
};

const FALLBACK_LAYERS = new Set<string>([
  "emergency_local",
  "text_visual",
  "phonics_sequence",
  "speech_coach_split",
]);

let sessionStartedAtMs = Date.now();
let totalSpeaks = 0;
let fallbackCount = 0;
let sumReplayCount = 0;
let sumDurationMs = 0;
let lastAlertSignature = "";
let sessionDurationBaselineMs: number | null = null;

const rollingSpeaks: RollingSpeak[] = [];
const breachStreak: Record<string, number> = {};

const phonicsBucket: ModeBucket = emptyBucket();
const speechCoachBucket: ModeBucket = emptyBucket();
const mathBucket: ModeBucket = emptyBucket();

function emptyBucket(): ModeBucket {
  return {
    speaks: 0,
    fallbackCount: 0,
    sumReplay: 0,
    sumDurationMs: 0,
    highReplayCount: 0,
  };
}

function isFallbackLayer(layer: AmyVoiceLayer | "failed" | undefined): boolean {
  return layer != null && layer !== "failed" && FALLBACK_LAYERS.has(layer);
}

function bucketForSpeechMode(mode: string): ModeBucket | null {
  if (mode === "phonics") return phonicsBucket;
  if (mode === "speech_coach") return speechCoachBucket;
  if (mode === "math") return mathBucket;
  return null;
}

function finalizeModeMetrics(bucket: ModeBucket): ModeHealthMetrics {
  const speaks = bucket.speaks;
  return {
    speaks,
    fallbackCount: bucket.fallbackCount,
    fallbackRate: speaks > 0 ? bucket.fallbackCount / speaks : 0,
    avgReplayCount: speaks > 0 ? bucket.sumReplay / speaks : 0,
    avgDurationMs: speaks > 0 ? bucket.sumDurationMs / speaks : 0,
    highReplayRate: speaks > 0 ? bucket.highReplayCount / speaks : 0,
  };
}

function recordBucket(
  bucket: ModeBucket,
  replayCount: number,
  durationMs: number,
  fallback: boolean,
): void {
  bucket.speaks += 1;
  bucket.sumReplay += replayCount;
  bucket.sumDurationMs += durationMs;
  if (replayCount >= 2) bucket.highReplayCount += 1;
  if (fallback) bucket.fallbackCount += 1;
}

function rollingMetrics(): {
  sampleSize: number;
  fallbackRate: number;
  avgReplayCount: number;
  avgDurationMs: number;
} {
  const n = rollingSpeaks.length;
  if (n === 0) {
    return { sampleSize: 0, fallbackRate: 0, avgReplayCount: 0, avgDurationMs: 0 };
  }
  const fallbacks = rollingSpeaks.filter((s) => s.fallback).length;
  const sumReplay = rollingSpeaks.reduce((acc, s) => acc + s.replayCount, 0);
  const sumDuration = rollingSpeaks.reduce((acc, s) => acc + s.durationMs, 0);
  return {
    sampleSize: n,
    fallbackRate: fallbacks / n,
    avgReplayCount: sumReplay / n,
    avgDurationMs: sumDuration / n,
  };
}

function updateSessionDurationBaseline(avgDurationMs: number): void {
  if (totalSpeaks < ALERT_POLICY.sessionDurationWarmupSpeaks) return;
  sessionDurationBaselineMs =
    sessionDurationBaselineMs == null
      ? avgDurationMs
      : sessionDurationBaselineMs * 0.9 + avgDurationMs * 0.1;
}

type BreachCandidate = {
  code: string;
  message: string;
  severity: "warning" | "critical";
  metric: string;
  value: number;
  threshold: number;
};

function pushSustainedAlert(
  alerts: AmyVoiceHealthAlert[],
  candidate: BreachCandidate,
): void {
  const streak = (breachStreak[candidate.code] ?? 0) + 1;
  breachStreak[candidate.code] = streak;
  if (streak >= ALERT_POLICY.sustainedBreachesRequired) {
    alerts.push({ ...candidate, sustainedBreaches: streak });
  }
}

function clearInactiveBreachStreaks(activeCodes: Set<string>): void {
  for (const code of Object.keys(breachStreak)) {
    if (!activeCodes.has(code)) breachStreak[code] = 0;
  }
}

function evaluateSustainedAlerts(
  rolling: ReturnType<typeof rollingMetrics>,
): AmyVoiceHealthAlert[] {
  if (rolling.sampleSize < ALERT_POLICY.minRollingSample) return [];

  const alerts: AmyVoiceHealthAlert[] = [];
  const activeCodes = new Set<string>();
  const targets = AMY_VOICE_SUCCESS_TARGETS;

  const fallbackCritical =
    targets.maxFallbackRate * ALERT_POLICY.fallbackRateCriticalMultiplier;
  if (rolling.fallbackRate >= fallbackCritical) {
    activeCodes.add("fallback_rate_critical");
    pushSustainedAlert(alerts, {
      code: "fallback_rate_critical",
      message: "Amy voice fallback rate is critically above the 5% success target",
      severity: "critical",
      metric: "rolling.fallbackRate",
      value: rolling.fallbackRate,
      threshold: fallbackCritical,
    });
  } else if (rolling.fallbackRate >= targets.maxFallbackRate) {
    activeCodes.add("fallback_rate_warning");
    pushSustainedAlert(alerts, {
      code: "fallback_rate_warning",
      message: "Amy voice fallback rate sustained above the 5% success target",
      severity: "warning",
      metric: "rolling.fallbackRate",
      value: rolling.fallbackRate,
      threshold: targets.maxFallbackRate,
    });
  }

  const replayCritical =
    targets.maxAvgReplayCount * ALERT_POLICY.replayCriticalMultiplier;
  if (rolling.avgReplayCount >= replayCritical) {
    activeCodes.add("replay_pressure_critical");
    pushSustainedAlert(alerts, {
      code: "replay_pressure_critical",
      message: "Average replay count is critically above the 1.6 success target",
      severity: "critical",
      metric: "rolling.avgReplayCount",
      value: rolling.avgReplayCount,
      threshold: replayCritical,
    });
  } else if (rolling.avgReplayCount >= targets.maxAvgReplayCount) {
    activeCodes.add("replay_pressure_warning");
    pushSustainedAlert(alerts, {
      code: "replay_pressure_warning",
      message: "Average replay count sustained above the 1.6 success target",
      severity: "warning",
      metric: "rolling.avgReplayCount",
      value: rolling.avgReplayCount,
      threshold: targets.maxAvgReplayCount,
    });
  }

  if (sessionDurationBaselineMs != null && sessionDurationBaselineMs > 0) {
    const deviation =
      Math.abs(rolling.avgDurationMs - sessionDurationBaselineMs) /
      sessionDurationBaselineMs;
    if (deviation >= targets.sessionDurationStabilityRatio * 1.5) {
      activeCodes.add("session_duration_critical");
      pushSustainedAlert(alerts, {
        code: "session_duration_critical",
        message: "Speak duration deviated critically from the session baseline",
        severity: "critical",
        metric: "rolling.avgDurationMs",
        value: rolling.avgDurationMs,
        threshold: sessionDurationBaselineMs * (1 + targets.sessionDurationStabilityRatio),
      });
    } else if (deviation >= targets.sessionDurationStabilityRatio) {
      activeCodes.add("session_duration_warning");
      pushSustainedAlert(alerts, {
        code: "session_duration_warning",
        message: "Speak duration deviated from the stable session baseline",
        severity: "warning",
        metric: "rolling.avgDurationMs",
        value: rolling.avgDurationMs,
        threshold: sessionDurationBaselineMs * (1 + targets.sessionDurationStabilityRatio),
      });
    }
  }

  evaluateModeSustainedAlerts(alerts, activeCodes, "phonics_accuracy", phonicsBucket);
  evaluateModeSustainedAlerts(alerts, activeCodes, "math_correctness", mathBucket);
  evaluateSpeechCoachSustainedAlerts(alerts, activeCodes, speechCoachBucket);

  clearInactiveBreachStreaks(activeCodes);
  return alerts;
}

function evaluateModeSustainedAlerts(
  alerts: AmyVoiceHealthAlert[],
  activeCodes: Set<string>,
  prefix: string,
  bucket: ModeBucket,
): void {
  if (bucket.speaks < ALERT_POLICY.minRollingSample) return;
  const fallbackRate = bucket.fallbackCount / bucket.speaks;
  const highReplayRate = bucket.highReplayCount / bucket.speaks;
  const targets = AMY_VOICE_SUCCESS_TARGETS;

  if (fallbackRate >= targets.maxFallbackRate * 2) {
    const code = `${prefix}_fallback_critical`;
    activeCodes.add(code);
    pushSustainedAlert(alerts, {
      code,
      message: `${prefix} fallback rate critically elevated`,
      severity: "critical",
      metric: `${prefix}.fallbackRate`,
      value: fallbackRate,
      threshold: targets.maxFallbackRate * 2,
    });
  } else if (fallbackRate >= targets.maxFallbackRate) {
    const code = `${prefix}_fallback_warning`;
    activeCodes.add(code);
    pushSustainedAlert(alerts, {
      code,
      message: `${prefix} fallback rate sustained above target`,
      severity: "warning",
      metric: `${prefix}.fallbackRate`,
      value: fallbackRate,
      threshold: targets.maxFallbackRate,
    });
  }

  if (highReplayRate >= 0.25) {
    const code = `${prefix}_replay_warning`;
    activeCodes.add(code);
    pushSustainedAlert(alerts, {
      code,
      message: `${prefix} high-replay rate sustained`,
      severity: "warning",
      metric: `${prefix}.highReplayRate`,
      value: highReplayRate,
      threshold: 0.25,
    });
  }
}

function evaluateSpeechCoachSustainedAlerts(
  alerts: AmyVoiceHealthAlert[],
  activeCodes: Set<string>,
  bucket: ModeBucket,
): void {
  if (bucket.speaks < ALERT_POLICY.minRollingSample) return;
  const avgReplay = bucket.sumReplay / bucket.speaks;
  const avgDuration = bucket.sumDurationMs / bucket.speaks;
  const targets = AMY_VOICE_SUCCESS_TARGETS;

  if (avgReplay >= targets.maxAvgReplayCount * 1.5) {
    const code = "speech_coach_replay_critical";
    activeCodes.add(code);
    pushSustainedAlert(alerts, {
      code,
      message: "Speech coach replay pressure critically high",
      severity: "critical",
      metric: "speechCoach.avgReplayCount",
      value: avgReplay,
      threshold: targets.maxAvgReplayCount * 1.5,
    });
  } else if (avgReplay >= targets.maxAvgReplayCount) {
    const code = "speech_coach_replay_warning";
    activeCodes.add(code);
    pushSustainedAlert(alerts, {
      code,
      message: "Speech coach replay pressure sustained above target",
      severity: "warning",
      metric: "speechCoach.avgReplayCount",
      value: avgReplay,
      threshold: targets.maxAvgReplayCount,
    });
  }

  if (
    sessionDurationBaselineMs != null &&
    avgDuration >= sessionDurationBaselineMs * (1 + targets.sessionDurationStabilityRatio)
  ) {
    const code = "speech_coach_duration_warning";
    activeCodes.add(code);
    pushSustainedAlert(alerts, {
      code,
      message: "Speech coach delivery duration sustained above baseline",
      severity: "warning",
      metric: "speechCoach.avgDurationMs",
      value: avgDuration,
      threshold: sessionDurationBaselineMs * (1 + targets.sessionDurationStabilityRatio),
    });
  }
}

function resolveHealthStatus(
  rolling: ReturnType<typeof rollingMetrics>,
  alerts: AmyVoiceHealthAlert[],
): AmyVoiceHealthStatus {
  if (alerts.some((a) => a.severity === "critical")) return "critical";
  if (alerts.length > 0) return "degraded";
  if (rolling.sampleSize < ALERT_POLICY.minRollingSample) return "watch";
  if (
    rolling.fallbackRate <= AMY_VOICE_SUCCESS_TARGETS.maxFallbackRate &&
    rolling.avgReplayCount <= AMY_VOICE_SUCCESS_TARGETS.maxAvgReplayCount
  ) {
    return "healthy";
  }
  return "watch";
}

function meetsSuccessTargets(rolling: ReturnType<typeof rollingMetrics>): boolean {
  if (rolling.sampleSize < ALERT_POLICY.minRollingSample) return false;
  if (rolling.fallbackRate > AMY_VOICE_SUCCESS_TARGETS.maxFallbackRate) return false;
  if (rolling.avgReplayCount > AMY_VOICE_SUCCESS_TARGETS.maxAvgReplayCount) return false;
  if (sessionDurationBaselineMs != null && sessionDurationBaselineMs > 0) {
    const deviation =
      Math.abs(rolling.avgDurationMs - sessionDurationBaselineMs) /
      sessionDurationBaselineMs;
    if (deviation > AMY_VOICE_SUCCESS_TARGETS.sessionDurationStabilityRatio) return false;
  }
  return true;
}

function maybeEmitHealthAlerts(snapshot: AmyVoiceHealthSnapshot): void {
  if (snapshot.alerts.length === 0) return;
  const signature = snapshot.alerts.map((a) => a.code).sort().join("|");
  if (signature === lastAlertSignature) return;
  lastAlertSignature = signature;

  if (import.meta.env.DEV) {
    console.warn("[AMY VOICE]", "health_alerts", snapshot.alerts);
  }
  reportAmyVoiceMonitoring("health_alert", {
    health: snapshot,
    alertCount: snapshot.alerts.length,
  });
}

export function recordAmyVoiceSpeakOutcome(params: {
  speechMode: string;
  pipelineMode?: string;
  layer?: AmyVoiceLayer | "failed";
  replayCount: number;
  durationMs: number;
  success: boolean;
}): void {
  if (!params.success) return;

  totalSpeaks += 1;
  sumReplayCount += Math.max(0, params.replayCount);
  sumDurationMs += Math.max(0, params.durationMs);

  const fallback = isFallbackLayer(params.layer);
  if (fallback) fallbackCount += 1;

  rollingSpeaks.push({
    fallback,
    replayCount: Math.max(0, params.replayCount),
    durationMs: Math.max(0, params.durationMs),
  });
  if (rollingSpeaks.length > ALERT_POLICY.rollingWindowSize) {
    rollingSpeaks.shift();
  }

  const rolling = rollingMetrics();
  updateSessionDurationBaseline(rolling.avgDurationMs);

  const modeKey =
    params.pipelineMode === "phonics" || params.speechMode === "phonics"
      ? "phonics"
      : params.speechMode;
  const bucket = bucketForSpeechMode(modeKey);
  if (bucket) recordBucket(bucket, params.replayCount, params.durationMs, fallback);

  if (totalSpeaks % 20 === 0) {
    reportAmyVoiceMonitoring("health_snapshot", { health: getAmyVoiceHealthSnapshot() });
  }

  if (totalSpeaks % ALERT_POLICY.evaluateEverySpeaks === 0) {
    maybeEmitHealthAlerts(getAmyVoiceHealthSnapshot());
  }
}

export function getAmyVoiceHealthSnapshot(): AmyVoiceHealthSnapshot {
  const rolling = rollingMetrics();
  const base = {
    totalSpeaks,
    fallbackCount,
    fallbackRate: totalSpeaks > 0 ? fallbackCount / totalSpeaks : 0,
    avgReplayCount: totalSpeaks > 0 ? sumReplayCount / totalSpeaks : 0,
    avgSessionDurationMs: totalSpeaks > 0 ? sumDurationMs / totalSpeaks : 0,
    phonics: finalizeModeMetrics(phonicsBucket),
    speechCoach: finalizeModeMetrics(speechCoachBucket),
    math: finalizeModeMetrics(mathBucket),
  };
  const alerts = evaluateSustainedAlerts(rolling);
  return {
    ...base,
    healthStatus: resolveHealthStatus(rolling, alerts),
    meetsSuccessTargets: meetsSuccessTargets(rolling),
    targets: AMY_VOICE_SUCCESS_TARGETS,
    rollingWindow: {
      ...rolling,
      sessionDurationBaselineMs,
    },
    alerts,
  };
}

export function getAmyVoiceSessionAgeMs(): number {
  return Math.max(0, Date.now() - sessionStartedAtMs);
}

export function resetAmyVoiceHealthMetrics(): void {
  sessionStartedAtMs = Date.now();
  totalSpeaks = 0;
  fallbackCount = 0;
  sumReplayCount = 0;
  sumDurationMs = 0;
  lastAlertSignature = "";
  sessionDurationBaselineMs = null;
  rollingSpeaks.length = 0;
  for (const key of Object.keys(breachStreak)) delete breachStreak[key];
  Object.assign(phonicsBucket, emptyBucket());
  Object.assign(speechCoachBucket, emptyBucket());
  Object.assign(mathBucket, emptyBucket());
}
