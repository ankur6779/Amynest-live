import type { IntentAnalyticsEvent, IntentRoiRow, IntentType, UserIntent } from "./types.js";

export function analyticsEventForTransition(
  from: UserIntent["state"],
  to: UserIntent["state"],
): IntentAnalyticsEvent | null {
  if (to === "started" && from === "pending") return "intent_started";
  if (to === "in_progress" && (from === "pending" || from === "started")) return "intent_resumed";
  if (to === "completed") return "intent_completed";
  if (to === "abandoned") return "intent_abandoned";
  if (to === "expired") return "intent_expired";
  if (to === "pending" && (from === "in_progress" || from === "started")) return "intent_interrupted";
  if (to === "started" && from === "in_progress") return "intent_resumed";
  return null;
}

export function computeIntentRoi(
  intents: Array<Pick<UserIntent, "intentType" | "state" | "createdAt" | "completedAt">>,
): IntentRoiRow[] {
  const byType = new Map<
    IntentType,
    { created: number; completed: number; abandoned: number; completionHours: number[] }
  >();

  for (const i of intents) {
    const bucket = byType.get(i.intentType) ?? {
      created: 0,
      completed: 0,
      abandoned: 0,
      completionHours: [],
    };
    bucket.created += 1;
    if (i.state === "completed") {
      bucket.completed += 1;
      if (i.completedAt) {
        const hours =
          (new Date(i.completedAt).getTime() - new Date(i.createdAt).getTime()) / 3_600_000;
        bucket.completionHours.push(hours);
      }
    }
    if (i.state === "abandoned") bucket.abandoned += 1;
    byType.set(i.intentType, bucket);
  }

  return [...byType.entries()].map(([intentType, v]) => ({
    intentType,
    created: v.created,
    completed: v.completed,
    abandoned: v.abandoned,
    completionRate: v.created > 0 ? Math.round((v.completed / v.created) * 100) : 0,
    avgHoursToComplete:
      v.completionHours.length > 0
        ? Math.round(
            (v.completionHours.reduce((a, b) => a + b, 0) / v.completionHours.length) * 10,
          ) / 10
        : null,
  }));
}
