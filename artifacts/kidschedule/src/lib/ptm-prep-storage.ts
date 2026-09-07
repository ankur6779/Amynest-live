/**
 * PTM Prep localStorage helpers — always scoped by signed-in userId.
 *
 * Legacy unscoped keys (`amynest.ptm_prep.*.v1` without a uid suffix) caused
 * account-switch LWW sync to push User A's draft/history into User B's
 * server row. New writes use `:${userId}`; legacy is migrated only when the
 * stored session uid matches the active user, otherwise discarded.
 */

import {
  STORAGE_KEY_DRAFT,
  STORAGE_KEY_HISTORY,
  STORAGE_KEY_REMINDERS,
  type PtmPrepSyncPayload,
  type PtmReminder,
  type PtmSession,
} from "@workspace/ptm-prep";

export const STORAGE_KEY_CLIENT_UPDATED_AT = "amynest.ptm_prep.client_updated_at.v1";
const SESSION_UID_KEY = "amynest:session:uid:v1";

const PTM_PREFIX = "amynest.ptm_prep.";

export function ptmStorageKey(base: string, userId: string): string {
  return `${base}:${userId}`;
}

function readSessionUid(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_UID_KEY);
    return raw && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

function emptyPayload(): PtmPrepSyncPayload {
  return { draft: null, history: [], reminders: [], clientUpdatedAt: 0 };
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Remove every PTM prep key (legacy + per-user). Call on account switch. */
export function clearAllPtmPrepStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(PTM_PREFIX)) keys.push(key);
    }
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    /* private mode */
  }
}

function clearLegacyUnscoped(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY_DRAFT);
    window.localStorage.removeItem(STORAGE_KEY_HISTORY);
    window.localStorage.removeItem(STORAGE_KEY_REMINDERS);
    window.localStorage.removeItem(STORAGE_KEY_CLIENT_UPDATED_AT);
  } catch {
    /* private mode */
  }
}

function readLegacyPayload(): PtmPrepSyncPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const draftRaw = window.localStorage.getItem(STORAGE_KEY_DRAFT);
    const historyRaw = window.localStorage.getItem(STORAGE_KEY_HISTORY);
    const remindersRaw = window.localStorage.getItem(STORAGE_KEY_REMINDERS);
    const tsRaw = window.localStorage.getItem(STORAGE_KEY_CLIENT_UPDATED_AT);
    if (!draftRaw && !historyRaw && !remindersRaw && !tsRaw) return null;
    return {
      draft: draftRaw ? (JSON.parse(draftRaw) as PtmSession) : null,
      history: historyRaw ? (JSON.parse(historyRaw) as PtmSession[]) : [],
      reminders: remindersRaw ? (JSON.parse(remindersRaw) as PtmReminder[]) : [],
      clientUpdatedAt: Number(tsRaw ?? 0),
    };
  } catch {
    return null;
  }
}

export function loadPtmPrepLocal(userId: string | null | undefined): PtmPrepSyncPayload {
  if (!userId || typeof window === "undefined") return emptyPayload();

  const scopedDraft = readJson<PtmSession>(ptmStorageKey(STORAGE_KEY_DRAFT, userId));
  const scopedHistory = readJson<PtmSession[]>(ptmStorageKey(STORAGE_KEY_HISTORY, userId));
  const scopedReminders = readJson<PtmReminder[]>(ptmStorageKey(STORAGE_KEY_REMINDERS, userId));
  const scopedTsRaw = window.localStorage.getItem(
    ptmStorageKey(STORAGE_KEY_CLIENT_UPDATED_AT, userId),
  );
  const hasScoped =
    scopedDraft != null ||
    scopedHistory != null ||
    scopedReminders != null ||
    scopedTsRaw != null;

  if (hasScoped) {
    return {
      draft: scopedDraft,
      history: Array.isArray(scopedHistory) ? scopedHistory : [],
      reminders: Array.isArray(scopedReminders) ? scopedReminders : [],
      clientUpdatedAt: Number(scopedTsRaw ?? 0),
    };
  }

  const legacy = readLegacyPayload();
  if (legacy) {
    const sessionUid = readSessionUid();
    if (sessionUid === userId) {
      writePtmPrepLocal(userId, legacy);
      clearLegacyUnscoped();
      return legacy;
    }
    clearLegacyUnscoped();
  }

  return emptyPayload();
}

export function writePtmPrepLocal(
  userId: string,
  payload: PtmPrepSyncPayload,
): void {
  if (typeof window === "undefined") return;
  try {
    const draftKey = ptmStorageKey(STORAGE_KEY_DRAFT, userId);
    if (payload.draft) {
      window.localStorage.setItem(draftKey, JSON.stringify(payload.draft));
    } else {
      window.localStorage.removeItem(draftKey);
    }
    window.localStorage.setItem(
      ptmStorageKey(STORAGE_KEY_HISTORY, userId),
      JSON.stringify(payload.history),
    );
    window.localStorage.setItem(
      ptmStorageKey(STORAGE_KEY_REMINDERS, userId),
      JSON.stringify(payload.reminders),
    );
    window.localStorage.setItem(
      ptmStorageKey(STORAGE_KEY_CLIENT_UPDATED_AT, userId),
      String(payload.clientUpdatedAt),
    );
    clearLegacyUnscoped();
  } catch {
    /* quota */
  }
}
