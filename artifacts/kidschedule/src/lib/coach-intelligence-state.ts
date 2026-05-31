import {
  applyCoachIntelligenceEvent,
  createEmptyCoachIntelligence,
  type CoachIntelligenceEvent,
  type CoachIntelligencePublicView,
  type CoachIntelligenceSnapshot,
} from "@workspace/coach-journey";

const SNAPSHOT_PREFIX = "amynest_coach_intel_v1";
const PUBLIC_PREFIX = "amynest_coach_intel_public_v1";

function snapshotKey(userId: string): string {
  return `${SNAPSHOT_PREFIX}:${userId || "anon"}`;
}

function publicKey(userId: string): string {
  return `${PUBLIC_PREFIX}:${userId || "anon"}`;
}

export function loadLocalCoachIntelligence(userId: string): CoachIntelligenceSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(snapshotKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CoachIntelligenceSnapshot;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocalCoachIntelligence(userId: string, snapshot: CoachIntelligenceSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(snapshotKey(userId), JSON.stringify(snapshot));
  } catch {
    /* private mode */
  }
}

export function loadLocalCoachIntelligencePublic(userId: string): CoachIntelligencePublicView | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(publicKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as CoachIntelligencePublicView;
  } catch {
    return null;
  }
}

export function saveLocalCoachIntelligencePublic(
  userId: string,
  view: CoachIntelligencePublicView,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(publicKey(userId), JSON.stringify(view));
  } catch {
    /* private mode */
  }
}

export function applyLocalCoachIntelligenceEvent(
  userId: string,
  event: CoachIntelligenceEvent,
): CoachIntelligenceSnapshot {
  const current = loadLocalCoachIntelligence(userId) ?? createEmptyCoachIntelligence();
  const next = applyCoachIntelligenceEvent(current, event);
  saveLocalCoachIntelligence(userId, next);
  return next;
}

export function mergeCoachIntelligencePublicView(
  local: CoachIntelligencePublicView | null,
  remote: CoachIntelligencePublicView,
): CoachIntelligencePublicView {
  if (!local) return remote;
  if (new Date(remote.lastUpdated).getTime() >= new Date(local.lastUpdated).getTime()) {
    return remote;
  }
  return local;
}

export function syncCoachIntelligenceFromServer(
  userId: string,
  remote: CoachIntelligencePublicView,
): CoachIntelligencePublicView {
  const localPublic = loadLocalCoachIntelligencePublic(userId);
  const merged = mergeCoachIntelligencePublicView(localPublic, remote);
  saveLocalCoachIntelligencePublic(userId, merged);
  return merged;
}

export function getCoachIntelligenceForUi(userId: string): CoachIntelligencePublicView | null {
  return loadLocalCoachIntelligencePublic(userId);
}

/** Optimistic local update after feedback when server persists separately. */
export function mirrorWinFeedbackLocally(
  userId: string,
  event: Extract<CoachIntelligenceEvent, { type: "win_feedback" }>,
): void {
  applyLocalCoachIntelligenceEvent(userId, event);
  const local = loadLocalCoachIntelligence(userId);
  if (!local) return;
  const publicView: CoachIntelligencePublicView = {
    lastUpdated: local.lastUpdated,
    familyReference: null,
    crossGoalInsight: null,
    completedGoalCount: local.completedGoals.length,
    coachingActive: local.winRecords.length > 0,
    usedPhraseHashes: local.usedPhraseHashes,
    contentDensity: local.profile.contentDensity,
  };
  saveLocalCoachIntelligencePublic(userId, publicView);
}
