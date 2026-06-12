import { XP_BY_TIER, getLevelForXp } from "./constants";
import type {
  GameSessionResult,
  HealthGameId,
  WellnessMetric,
  XpTier,
} from "./types";

export function scoreToTier(score: number): XpTier {
  if (score >= 95) return "perfect";
  if (score >= 85) return "platinum";
  if (score >= 70) return "gold";
  if (score >= 50) return "silver";
  return "bronze";
}

export function tierToXp(tier: XpTier): number {
  return XP_BY_TIER[tier];
}

export function computeWellnessScore(
  metrics: Partial<Record<WellnessMetric, number>>,
): number {
  const keys: WellnessMetric[] = [
    "focus",
    "calmness",
    "balance",
    "coordination",
    "consistency",
  ];
  const values = keys.map((k) => metrics[k] ?? 0).filter((v) => v > 0);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function aggregateWellnessFromHistory(
  history: GameSessionResult[],
): Record<WellnessMetric, number> {
  const sums: Record<WellnessMetric, { total: number; count: number }> = {
    focus: { total: 0, count: 0 },
    calmness: { total: 0, count: 0 },
    balance: { total: 0, count: 0 },
    coordination: { total: 0, count: 0 },
    consistency: { total: 0, count: 0 },
    overall: { total: 0, count: 0 },
  };

  const recent = history.slice(-20);
  for (const session of recent) {
    for (const [key, val] of Object.entries(session.metrics)) {
      const metric = key as WellnessMetric;
      if (metric === "overall" || val == null) continue;
      sums[metric].total += val;
      sums[metric].count += 1;
    }
  }

  const result: Record<WellnessMetric, number> = {
    focus: 0,
    calmness: 0,
    balance: 0,
    coordination: 0,
    consistency: 0,
    overall: 0,
  };

  for (const key of Object.keys(sums) as WellnessMetric[]) {
    if (key === "overall") continue;
    const { total, count } = sums[key];
    result[key] = count > 0 ? Math.round(total / count) : 0;
  }
  result.overall = computeWellnessScore(result);
  return result;
}

export function computeBreathScore(holdSeconds: number, stability: number): number {
  const durationScore = Math.min(100, (holdSeconds / 60) * 100);
  const stabilityScore = Math.min(100, stability);
  return Math.round(durationScore * 0.6 + stabilityScore * 0.4);
}

export function computeBalanceScore(
  durationSeconds: number,
  stabilityPercent: number,
  difficultyIndex: number,
): number {
  const base = Math.min(100, durationSeconds * 1.2) * (0.5 + difficultyIndex * 0.1);
  return Math.round(Math.min(100, base * 0.5 + stabilityPercent * 0.5));
}

export function computeReactionScore(avgMs: number): number {
  if (avgMs <= 200) return 98;
  if (avgMs <= 250) return 90;
  if (avgMs <= 300) return 80;
  if (avgMs <= 400) return 65;
  if (avgMs <= 500) return 50;
  return Math.max(30, 60 - Math.floor((avgMs - 500) / 20));
}

export function computeFreezeScore(successCount: number, totalRounds: number): number {
  const ratio = successCount / totalRounds;
  return Math.round(ratio * 100);
}

export function computeFingerStabilityScore(stabilityPercent: number, durationSeconds: number): number {
  const durationFactor = Math.min(1, durationSeconds / 20);
  return Math.round(stabilityPercent * 0.7 + durationFactor * 30);
}

export function gameMetricsFor(
  gameId: HealthGameId,
  score: number,
): Partial<Record<WellnessMetric, number>> {
  switch (gameId) {
    case "breath-control":
      return { focus: score, calmness: Math.round(score * 0.9), consistency: Math.round(score * 0.85) };
    case "flamingo-balance":
      return { balance: score, coordination: Math.round(score * 0.8), consistency: Math.round(score * 0.75) };
    case "reaction-time":
      return { coordination: score, focus: Math.round(score * 0.85), consistency: Math.round(score * 0.7) };
    case "freeze-statue":
      return { balance: Math.round(score * 0.9), calmness: score, consistency: Math.round(score * 0.8) };
    case "finger-stability":
      return { focus: score, coordination: Math.round(score * 0.85), calmness: Math.round(score * 0.75) };
    case "calmness-meter":
      return { overall: score, calmness: score, focus: Math.round(score * 0.9) };
    default:
      return { overall: score };
  }
}

export function levelFromTotalXp(totalXp: number) {
  return getLevelForXp(totalXp).id;
}

export function todayWellnessScore(
  history: GameSessionResult[],
  localDateKey: string,
): number {
  const todaySessions = history.filter((s) => {
    const d = new Date(s.timestamp);
    const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return dk === localDateKey;
  });
  if (todaySessions.length === 0) return 0;
  const scores = todaySessions.map((s) => s.score);
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function applyXpModifiers(
  baseXp: number,
  opts: { doubleXpDay?: boolean; goldenChallenge?: boolean; weeklyBonus?: number },
): number {
  let xp = baseXp;
  if (opts.doubleXpDay) xp = Math.round(xp * 1.5);
  if (opts.goldenChallenge) xp = Math.round(xp * 2);
  if (opts.weeklyBonus) xp += opts.weeklyBonus;
  return xp;
}

export function computeReactionScoreWithPenalties(avgMs: number, falseStarts: number): number {
  const base = computeReactionScore(avgMs);
  const penalty = Math.min(30, falseStarts * 8);
  return Math.max(20, base - penalty);
}
