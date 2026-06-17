import type { PersistedSessionState } from "@workspace/speech-coach-v2";

const STORAGE_PREFIX = "amynest:speech-coach-v2:";

export interface SpeechCoachV2LocalSnapshot {
  childId: number;
  sessionId: string;
  tabLockToken: string;
  sessionState: PersistedSessionState;
  updatedAt: string;
}

function storageKey(childId: number): string {
  return `${STORAGE_PREFIX}snapshot:${childId}`;
}

export function loadLocalSnapshot(childId: number): SpeechCoachV2LocalSnapshot | null {
  try {
    const raw = localStorage.getItem(storageKey(childId));
    if (!raw) return null;
    return JSON.parse(raw) as SpeechCoachV2LocalSnapshot;
  } catch {
    return null;
  }
}

export function saveLocalSnapshot(snapshot: SpeechCoachV2LocalSnapshot): void {
  try {
    localStorage.setItem(storageKey(snapshot.childId), JSON.stringify(snapshot));
  } catch {
    // ignore quota errors
  }
}

export function clearLocalSnapshot(childId: number): void {
  try {
    localStorage.removeItem(storageKey(childId));
  } catch {
    // ignore
  }
}

export function generateTabLockToken(): string {
  return crypto.randomUUID();
}
