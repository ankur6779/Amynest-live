import type { SessionFeedbackInput } from "../types-v2.js";
import type { SkillKey } from "../types-v2.js";
import type { SessionHistoryEntry } from "./types-prediction.js";

const MAX_SESSIONS = 10;
const byChild = new Map<string, SessionHistoryEntry[]>();

export function recordSessionHistory(
  childId: string,
  entry: SessionHistoryEntry,
): void {
  const list = byChild.get(childId) ?? [];
  list.push(entry);
  if (list.length > MAX_SESSIONS) list.shift();
  byChild.set(childId, list);
}

export function recordSessionHistoryFromFeedback(
  childId: string,
  feedback: SessionFeedbackInput,
  engagementScore: number,
  skillLevels: Partial<Record<SkillKey, number>>,
): void {
  recordSessionHistory(childId, {
    endedAt: new Date().toISOString(),
    durationMinutes: feedback.timeSpentSec / 60,
    skips: feedback.skips,
    completions: feedback.completed ? 1 : 0,
    engagementScore,
    explorationSuccesses:
      feedback.completed && feedback.completionRate >= 0.8 ? 1 : 0,
    boredomSignals: feedback.skips >= 2 ? 1 : 0,
    skillLevels,
  });
}

export function getLastSessionSummaries(
  childId: string,
  limit = 10,
): SessionHistoryEntry[] {
  const list = byChild.get(childId) ?? [];
  return list.slice(-limit);
}

export function clearSessionHistory(childId?: string): void {
  if (childId) byChild.delete(childId);
  else byChild.clear();
}
