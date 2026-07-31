/**
 * Local Attention Engine store — session-scoped, no cloud, no PII beyond childId.
 * Shared across all Discovery Worlds in the same browser tab session.
 */

import type { WorldId } from "@workspace/world-engine";
import {
  buildAttentionSnapshot,
  createAttentionSession,
  markAttentionPrompt,
  reduceAttentionEvent,
  type AttentionEvent,
  type AttentionEventType,
  type AttentionSessionState,
  type AttentionSnapshot,
} from "@/lib/sound-world-attention-engine";

const MEMORY = new Map<number, AttentionSessionState>();
const LISTENERS = new Set<(snap: AttentionSnapshot) => void>();
const STORAGE_PREFIX = "amynest:sound-world:attention:v1:";

function storageKey(childId: number): string {
  return `${STORAGE_PREFIX}${childId}`;
}

function persist(state: AttentionSessionState): void {
  try {
    // sessionStorage only — clears when tab closes; no long-term profiling.
    sessionStorage.setItem(
      storageKey(state.childId),
      JSON.stringify({
        sessionId: state.sessionId,
        childId: state.childId,
        startedAt: state.startedAt,
        lastActivityAt: state.lastActivityAt,
        completed: state.completed,
        peakScore: state.peakScore,
        sawDropOff: state.sawDropOff,
        recoveredAfterDrop: state.recoveredAfterDrop,
        counters: {
          ...state.counters,
          // Cap unique item ids retained
          uniqueItems: state.counters.uniqueItems.slice(-80),
          scoreHistory: state.counters.scoreHistory.slice(-40),
        },
      }),
    );
  } catch {
    /* private mode / quota */
  }
}

function hydrate(childId: number): AttentionSessionState | null {
  try {
    const raw = sessionStorage.getItem(storageKey(childId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AttentionSessionState;
    if (!parsed?.sessionId || parsed.childId !== childId) return null;
    // Resume only if same tab session is recent (< 3h).
    if (Date.now() - parsed.startedAt > 3 * 60 * 60 * 1000) return null;
    return {
      ...createAttentionSession(childId, parsed.startedAt),
      ...parsed,
      counters: {
        ...createAttentionSession(childId).counters,
        ...parsed.counters,
        uniqueItems: parsed.counters?.uniqueItems ?? [],
        scoreHistory: parsed.counters?.scoreHistory ?? [],
      },
    };
  } catch {
    return null;
  }
}

function ensure(childId: number): AttentionSessionState {
  let state = MEMORY.get(childId);
  if (!state) {
    const hydrated = hydrate(childId);
    if (hydrated) {
      state = hydrated;
    } else {
      const created = createAttentionSession(childId);
      state = reduceAttentionEvent(created, { type: "session_start", at: created.startedAt });
    }
    MEMORY.set(childId, state);
  }
  return state;
}

function publish(state: AttentionSessionState): AttentionSnapshot {
  MEMORY.set(state.childId, state);
  persist(state);
  const snap = buildAttentionSnapshot(state);
  for (const listener of LISTENERS) {
    try {
      listener(snap);
    } catch {
      /* listener errors must not break play */
    }
  }
  return snap;
}

export function getAttentionSession(childId: number): AttentionSessionState {
  return ensure(childId);
}

export function getAttentionSnapshot(childId: number, now = Date.now()): AttentionSnapshot {
  return buildAttentionSnapshot(ensure(childId), now);
}

export function subscribeAttention(listener: (snap: AttentionSnapshot) => void): () => void {
  LISTENERS.add(listener);
  return () => LISTENERS.delete(listener);
}

export function recordAttentionEvent(
  childId: number,
  type: AttentionEventType,
  detail: Omit<AttentionEvent, "type" | "at"> & { at?: number } = {},
): AttentionSnapshot {
  const state = ensure(childId);
  const event: AttentionEvent = {
    type,
    at: detail.at ?? Date.now(),
    worldId: detail.worldId,
    itemId: detail.itemId,
    idleMs: detail.idleMs,
    gapMs: detail.gapMs,
  };
  const next = reduceAttentionEvent(state, event);
  return publish(next);
}

export function noteAttentionPrompt(childId: number, at = Date.now()): void {
  const state = ensure(childId);
  MEMORY.set(childId, markAttentionPrompt(state, at));
}

export function recordAttentionIdle(childId: number, idleMs: number, worldId?: WorldId): AttentionSnapshot {
  return recordAttentionEvent(childId, "idle_sample", { idleMs, worldId });
}

export function recordAttentionActivity(
  childId: number,
  worldId?: WorldId,
  itemId?: string,
): AttentionSnapshot {
  return recordAttentionEvent(childId, "pointer_activity", { worldId, itemId });
}

/** Reset in-memory + session storage (tests / new day). */
export function resetAttentionSession(childId: number): void {
  MEMORY.delete(childId);
  try {
    sessionStorage.removeItem(storageKey(childId));
  } catch {
    /* */
  }
}

/** Test helper */
export function __setAttentionSessionForTests(state: AttentionSessionState): void {
  MEMORY.set(state.childId, state);
}
