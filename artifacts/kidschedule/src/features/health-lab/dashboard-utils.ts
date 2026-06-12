import { filterHistoryByRange, sessionDateKey } from "./storage";
import type { DashboardRange, GameSessionResult, HealthLabPersistedState, WellnessMetric } from "./types";

export function avgMetric(
  history: GameSessionResult[],
  metric: WellnessMetric,
): number {
  const vals = history
    .map((s) => s.metrics[metric] ?? (metric === "overall" ? s.score : undefined))
    .filter((v): v is number => v != null && v > 0);
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function trendMessage(current: number, previous: number, label: string): string {
  if (current === 0 && previous === 0) return `Play a few challenges to see ${label.toLowerCase()} trends`;
  if (previous === 0) return `${label} is off to a great start — keep playing!`;
  const delta = Math.round(((current - previous) / previous) * 100);
  if (delta > 0) return `${label} improved ${delta}% this period — wonderful progress!`;
  if (delta < 0) return `${label} dipped slightly — every play day builds strength`;
  return `${label} is holding steady — consistency counts!`;
}

export function previousPeriodHistory(
  history: GameSessionResult[],
  range: DashboardRange,
): GameSessionResult[] {
  const now = Date.now();
  if (range === "lifetime" || range === "today") return [];

  const windowMs =
    range === "7d" ? 7 * 86400000 : range === "30d" ? 30 * 86400000 : 90 * 86400000;
  const end = now - windowMs;
  const start = end - windowMs;
  return history.filter((s) => s.timestamp >= start && s.timestamp < end);
}

export function sparklineData(
  history: GameSessionResult[],
  metric: WellnessMetric,
  points = 7,
): number[] {
  const byDay = new Map<string, number[]>();
  for (const s of history) {
    const dk = sessionDateKey(s.timestamp);
    const val = s.metrics[metric] ?? (metric === "overall" ? s.score : 0);
    if (!val) continue;
    const arr = byDay.get(dk) ?? [];
    arr.push(val);
    byDay.set(dk, arr);
  }
  const days = [...byDay.keys()].sort().slice(-points);
  return days.map((d) => {
    const vals = byDay.get(d)!;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  });
}

export function consistencyCalendar(
  history: GameSessionResult[],
  days = 28,
): { date: string; sessions: number }[] {
  const counts = new Map<string, number>();
  for (const s of history) {
    const dk = sessionDateKey(s.timestamp);
    counts.set(dk, (counts.get(dk) ?? 0) + 1);
  }
  const result: { date: string; sessions: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dk = sessionDateKey(d.getTime());
    result.push({ date: dk, sessions: counts.get(dk) ?? 0 });
  }
  return result;
}

export function weeklySummary(state: HealthLabPersistedState): string {
  const week = filterHistoryByRange(state.gameHistory, "7d");
  if (week.length === 0) return "No sessions this week yet — start a Health Quest!";
  const focus = avgMetric(week, "focus");
  const balance = avgMetric(week, "balance");
  const sessions = week.length;
  const xp = week.reduce((a, s) => a + s.xpEarned, 0);
  return `${sessions} sessions, ${xp} XP earned. Focus averaging ${focus || "—"}, balance ${balance || "—"}. Keep exploring!`;
}

export function quarterlySummary(state: HealthLabPersistedState): string {
  const q = filterHistoryByRange(state.gameHistory, "90d");
  if (q.length === 0) return "Your quarterly wellness journey is ready to begin!";
  const focus = avgMetric(q, "focus");
  const balance = avgMetric(q, "balance");
  const prev = previousPeriodHistory(state.gameHistory, "90d");
  const prevFocus = avgMetric(prev, "focus");
  const delta = prevFocus > 0 ? Math.round(((focus - prevFocus) / prevFocus) * 100) : 0;
  if (delta > 0) return `Focus improved by ${delta}% this quarter. Balance averaging ${balance || "—"}. Wonderful growth!`;
  return `${q.length} sessions this quarter with steady wellness progress. Keep exploring!`;
}

export function achievementTimeline(state: HealthLabPersistedState): { label: string; date: string }[] {
  const items: { label: string; date: string; ts: number }[] = [];
  for (const b of state.badges) {
    items.push({ label: `Badge: ${b.id}`, date: new Date(b.unlockedAt).toLocaleDateString(), ts: b.unlockedAt });
  }
  for (const e of state.avatarEvolutionHistory) {
    items.push({
      label: `Level ${e.level} avatar`,
      date: new Date(e.timestamp).toLocaleDateString(),
      ts: e.timestamp,
    });
  }
  return items.sort((a, b) => b.ts - a.ts).slice(0, 12).map(({ label, date }) => ({ label, date }));
}

export function monthlySummary(state: HealthLabPersistedState): string {
  const month = filterHistoryByRange(state.gameHistory, "30d");
  if (month.length === 0) return "This month is a fresh start — every adventure counts!";
  const overall = avgMetric(month, "overall");
  const pbs = Object.keys(state.personalBests).length;
  return `${month.length} play sessions with overall wellness near ${overall || "—"}. ${pbs} personal bests on record.`;
}

export function progressStory(state: HealthLabPersistedState): string {
  const evo = state.avatarEvolutionHistory;
  if (evo.length === 0) return "Your wellness journey is just beginning — Amy is excited to explore with you!";
  const latest = evo[evo.length - 1];
  return `Your avatar evolved to level ${latest.level}! You've grown from explorer to a true wellness scientist.`;
}

/** Parent-friendly metric explanations — no medical language. */
export const METRIC_EXPLANATIONS: Record<string, string> = {
  focus: "How well your child stayed attentive during hold-still and reaction challenges.",
  balance: "Steadiness during balance and freeze games — body control while having fun.",
  calmness: "Breathing and stillness scores from calm-focused play sessions.",
  coordination: "Finger stability and precise movement during touch challenges.",
  consistency: "Regular play patterns — showing up and completing sessions over time.",
  overall: "A blended wellness score across all Health Lab activities this period.",
};

export function metricExplanation(metric: string): string {
  return METRIC_EXPLANATIONS[metric] ?? "Wellness activity score from Health Lab play.";
}

export function progressMilestones(state: HealthLabPersistedState): { label: string; reached: boolean }[] {
  const sessions = state.totalSessions;
  const badges = state.badges.length;
  const level = state.level;
  return [
    { label: "First Health Quest completed", reached: sessions >= 1 },
    { label: "10 play sessions", reached: sessions >= 10 },
    { label: "25 play sessions", reached: sessions >= 25 },
    { label: "50 play sessions", reached: sessions >= 50 },
    { label: "7-day streak", reached: state.streakDays >= 7 },
    { label: "Level 5 reached", reached: level >= 5 },
    { label: "5 badges earned", reached: badges >= 5 },
    { label: "Galaxy Hero (Level 7)", reached: level >= 7 },
  ];
}

export function monthlySessionCount(state: HealthLabPersistedState): number {
  return filterHistoryByRange(state.gameHistory, "30d").length;
}
