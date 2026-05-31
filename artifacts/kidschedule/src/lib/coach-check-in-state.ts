import type { CoachCheckInHistoryEntry } from "@workspace/coach-journey";

export interface CoachActivityRecord {
  sessionId: string;
  goalId: string;
  at: string;
  source: "win_feedback" | "check_in" | "session_open";
}

const ACTIVITY_PREFIX = "amynest_coach_activity_v1";
const CHECKIN_PREFIX = "amynest_coach_checkins_v1";
const SNOOZE_PREFIX = "amynest_coach_checkin_snooze_v1";

function uid(userId: string): string {
  return userId || "anon";
}

export function recordCoachActivity(
  userId: string,
  record: CoachActivityRecord,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${ACTIVITY_PREFIX}:${uid(userId)}:${record.sessionId}`,
      JSON.stringify(record),
    );
    localStorage.setItem(`${ACTIVITY_PREFIX}:${uid(userId)}:last`, record.at);
  } catch {
    /* private mode */
  }
}

export function getLastCoachActivityAt(userId: string, sessionId?: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    if (sessionId) {
      const raw = localStorage.getItem(`${ACTIVITY_PREFIX}:${uid(userId)}:${sessionId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as CoachActivityRecord;
        if (parsed?.at) return parsed.at;
      }
    }
    return localStorage.getItem(`${ACTIVITY_PREFIX}:${uid(userId)}:last`);
  } catch {
    return null;
  }
}

export function loadCoachCheckInHistory(userId: string): CoachCheckInHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${CHECKIN_PREFIX}:${uid(userId)}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CoachCheckInHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCoachCheckInResponse(
  userId: string,
  entry: CoachCheckInHistoryEntry,
): void {
  if (typeof window === "undefined") return;
  const existing = loadCoachCheckInHistory(userId).filter(
    (e) => !(e.sessionId === entry.sessionId && e.at === entry.at),
  );
  existing.unshift(entry);
  try {
    localStorage.setItem(`${CHECKIN_PREFIX}:${uid(userId)}`, JSON.stringify(existing.slice(0, 80)));
  } catch {
    /* private mode */
  }
  recordCoachActivity(userId, {
    sessionId: entry.sessionId,
    goalId: entry.goalId,
    at: entry.at,
    source: "check_in",
  });
}

export function getLastCheckInAt(userId: string, sessionId?: string): string | null {
  const history = loadCoachCheckInHistory(userId);
  const filtered = sessionId ? history.filter((h) => h.sessionId === sessionId) : history;
  return filtered[0]?.at ?? null;
}

export function snoozeCoachCheckIn(userId: string, untilIso: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${SNOOZE_PREFIX}:${uid(userId)}`, untilIso);
  } catch {
    /* private mode */
  }
}

export function getCoachCheckInSnoozedUntil(userId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(`${SNOOZE_PREFIX}:${uid(userId)}`);
  } catch {
    return null;
  }
}

export function formatLastCheckInLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diffDays = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function lastCheckInSummary(
  history: CoachCheckInHistoryEntry[],
  sessionId: string,
): string | null {
  const last = history.find((h) => h.sessionId === sessionId);
  if (!last) return null;
  return last.optionLabel;
}
