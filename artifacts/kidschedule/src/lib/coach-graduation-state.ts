import type { GraduationPath } from "@workspace/coach-journey";

export interface CoachGraduationRecord {
  sessionId: string;
  goalId: string;
  goalTitle: string;
  path: GraduationPath;
  graduatedAt: string;
  maintenanceMode?: boolean;
  advancedFromSessionId?: string;
}

const STORAGE_PREFIX = "amynest_coach_graduations_v1";

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId || "anon"}`;
}

export function loadCoachGraduations(userId: string): CoachGraduationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CoachGraduationRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCoachGraduation(userId: string, record: CoachGraduationRecord): void {
  if (typeof window === "undefined") return;
  const existing = loadCoachGraduations(userId).filter((r) => r.sessionId !== record.sessionId);
  existing.unshift(record);
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(existing.slice(0, 50)));
  } catch {
    /* private mode */
  }
}

export function isSessionGraduated(userId: string, sessionId: string): boolean {
  return loadCoachGraduations(userId).some((r) => r.sessionId === sessionId);
}

export function getGraduationForSession(
  userId: string,
  sessionId: string,
): CoachGraduationRecord | undefined {
  return loadCoachGraduations(userId).find((r) => r.sessionId === sessionId);
}

export function isGoalInMaintenance(userId: string, goalId: string): boolean {
  return loadCoachGraduations(userId).some((r) => r.goalId === goalId && r.maintenanceMode);
}

export function pastSuccessesFromGraduations(
  records: CoachGraduationRecord[],
): CoachGraduationRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.graduatedAt).getTime() - new Date(a.graduatedAt).getTime(),
  );
}
