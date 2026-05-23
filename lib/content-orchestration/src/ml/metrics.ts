import type { MlMetrics } from "./types.js";

type MetricSample = {
  source: "ml" | "rule";
  reward: number;
  engagementDelta: number;
  predictedCorrect?: boolean;
  actualPositive?: boolean;
};

type SessionRecord = {
  childId: string;
  endedAt: number;
  lengthMs: number;
  source: "ml" | "rule";
  returnedWithin24h?: boolean;
};

const samples: MetricSample[] = [];
const sessions: SessionRecord[] = [];
const MAX_SAMPLES = 5_000;
const MAX_SESSIONS = 2_000;

export function recordMlMetricSample(sample: MetricSample): void {
  samples.push(sample);
  if (samples.length > MAX_SAMPLES) samples.shift();
}

export function recordSessionEnd(params: {
  childId: string;
  startedAt: number;
  endedAt: number;
  source: "ml" | "rule";
}): void {
  sessions.push({
    childId: params.childId,
    endedAt: params.endedAt,
    lengthMs: Math.max(0, params.endedAt - params.startedAt),
    source: params.source,
  });
  if (sessions.length > MAX_SESSIONS) sessions.shift();
}

export function recordSessionReturn(childId: string, within24h = true): void {
  const prev = [...sessions]
    .reverse()
    .find((s) => s.childId === childId && s.returnedWithin24h === undefined);
  if (prev) prev.returnedWithin24h = within24h;
}

export function computeMlMetrics(): MlMetrics {
  const emptyLongTerm = {
    sessionReturnRate: 0,
    nextDayRetention: 0,
    avgSessionLengthDelta: 0,
    mlVsRuleEngagementLift: 0,
    mlAvgSessionLength: 0,
    ruleAvgSessionLength: 0,
  };

  if (samples.length === 0 && sessions.length === 0) {
    return {
      predictionAccuracy: 0,
      avgReward: 0,
      engagementLift: 0,
      fallbackRate: 0,
      sampleCount: 0,
      ...emptyLongTerm,
    };
  }

  const ruleRewards = samples.filter((s) => s.source === "rule").map((s) => s.reward);
  const mlRewards = samples.filter((s) => s.source === "ml").map((s) => s.reward);
  const allRewards = samples.map((s) => s.reward);
  const fallbackCount = samples.filter((s) => s.source === "rule").length;

  const labeled = samples.filter(
    (s) => s.predictedCorrect !== undefined && s.actualPositive !== undefined,
  );
  const correct = labeled.filter(
    (s) => s.predictedCorrect === s.actualPositive,
  ).length;

  const ruleAvg =
    ruleRewards.length > 0
      ? ruleRewards.reduce((a, b) => a + b, 0) / ruleRewards.length
      : 0;
  const mlAvg =
    mlRewards.length > 0
      ? mlRewards.reduce((a, b) => a + b, 0) / mlRewards.length
      : 0;

  const ruleEngagement = samples
    .filter((s) => s.source === "rule")
    .map((s) => s.engagementDelta);
  const mlEngagement = samples
    .filter((s) => s.source === "ml")
    .map((s) => s.engagementDelta);
  const ruleEngAvg =
    ruleEngagement.length > 0
      ? ruleEngagement.reduce((a, b) => a + b, 0) / ruleEngagement.length
      : 0;
  const mlEngAvg =
    mlEngagement.length > 0
      ? mlEngagement.reduce((a, b) => a + b, 0) / mlEngagement.length
      : 0;

  const mlSessions = sessions.filter((s) => s.source === "ml");
  const ruleSessions = sessions.filter((s) => s.source === "rule");
  const mlLen =
    mlSessions.length > 0
      ? mlSessions.reduce((a, s) => a + s.lengthMs, 0) / mlSessions.length
      : 0;
  const ruleLen =
    ruleSessions.length > 0
      ? ruleSessions.reduce((a, s) => a + s.lengthMs, 0) / ruleSessions.length
      : 0;

  const withReturn = sessions.filter((s) => s.returnedWithin24h !== undefined);
  const returned = withReturn.filter((s) => s.returnedWithin24h).length;
  const sessionReturnRate =
    withReturn.length > 0 ? returned / withReturn.length : 0;

  const dayMs = 24 * 60 * 60 * 1000;
  const nextDayEligible = sessions.filter((s) => s.returnedWithin24h !== undefined);
  const nextDayRetention =
    nextDayEligible.length > 0 ? sessionReturnRate : 0;

  return {
    predictionAccuracy:
      labeled.length > 0 ? Math.round((correct / labeled.length) * 1000) / 10 : 0,
    avgReward:
      allRewards.length > 0
        ? Math.round((allRewards.reduce((a, b) => a + b, 0) / allRewards.length) * 100) / 100
        : 0,
    engagementLift: Math.round((mlAvg - ruleAvg) * 100) / 100,
    fallbackRate:
      samples.length > 0
        ? Math.round((fallbackCount / samples.length) * 1000) / 10
        : 0,
    sampleCount: samples.length,
    sessionReturnRate: Math.round(sessionReturnRate * 1000) / 10,
    nextDayRetention: Math.round(nextDayRetention * 1000) / 10,
    avgSessionLengthDelta: Math.round((mlLen - ruleLen) / Math.max(1, dayMs / 1000) * 100) / 100,
    mlVsRuleEngagementLift: Math.round((mlEngAvg - ruleEngAvg) * 100) / 100,
    mlAvgSessionLength: Math.round(mlLen),
    ruleAvgSessionLength: Math.round(ruleLen),
  };
}

export function clearMlMetrics(): void {
  samples.length = 0;
  sessions.length = 0;
}
