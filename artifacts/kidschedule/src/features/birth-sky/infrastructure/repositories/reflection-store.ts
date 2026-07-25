/**
 * Persisted reflections + milestone emission records (Pack 5 + Addendum A).
 * Saved entries restore across reloads. Unsaved drafts are NOT stored here.
 */

import { randomUUID } from "../../lib/random-id";
import {
  type ReflectionEntry,
  type ReflectionMilestoneId,
  type ReflectionStoreState,
  type ReflectionTimelineItem,
} from "../../domain/models/reflection";
import { evaluateMilestoneEmission } from "../../application/orchestrators/reflection-milestones";

const PREFIX = "amynest:birth-sky:reflections:v1:";

function key(profileId: string): string {
  return `${PREFIX}${profileId}`;
}

function emptyState(profileId: string): ReflectionStoreState {
  return {
    profileId,
    entries: [],
    emittedMilestones: [],
    timelineItems: [],
  };
}

export function loadReflectionStore(profileId: string): ReflectionStoreState {
  try {
    const raw = localStorage.getItem(key(profileId));
    if (!raw) return emptyState(profileId);
    const parsed = JSON.parse(raw) as ReflectionStoreState;
    if (parsed.profileId !== profileId || !Array.isArray(parsed.entries)) {
      return emptyState(profileId);
    }
    // Version compatibility: keep schema v1 entries only; never mutate snapshots.
    const entries = parsed.entries.filter(
      (e) =>
        e &&
        e.reflectionSchemaVersion === "1" &&
        typeof e.reflectionId === "string" &&
        typeof e.body === "string" &&
        typeof e.snapshotVersion === "string",
    );
    const emitted = (parsed.emittedMilestones ?? []).filter(
      (m): m is ReflectionMilestoneId =>
        m === "reflection_milestone_1" ||
        m === "reflection_milestone_5" ||
        m === "reflection_milestone_12",
    );
    const timelineItems = (parsed.timelineItems ?? []).filter(
      (t) => t && t.type === "reflection" && typeof t.reflectionId === "string",
    );
    return { profileId, entries, emittedMilestones: emitted, timelineItems };
  } catch {
    return emptyState(profileId);
  }
}

function persist(state: ReflectionStoreState): void {
  try {
    localStorage.setItem(key(state.profileId), JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export type SaveReflectionResult = {
  entry: ReflectionEntry;
  state: ReflectionStoreState;
  milestoneId: ReflectionMilestoneId | null;
  milestoneEmitted: boolean;
};

export function saveReflectionEntry(input: {
  profileId: string;
  snapshotVersion: string;
  promptId: string;
  body: string;
}): SaveReflectionResult {
  const state = loadReflectionStore(input.profileId);
  const entry: ReflectionEntry = {
    reflectionId: randomUUID(),
    profileId: input.profileId,
    snapshotVersion: input.snapshotVersion,
    promptId: input.promptId,
    body: input.body.trim(),
    createdAt: new Date().toISOString(),
    reflectionSchemaVersion: "1",
  };
  const entries = [...state.entries, entry];
  const timelineItem: ReflectionTimelineItem = {
    itemId: `tl_${entry.reflectionId}`,
    profileId: input.profileId,
    type: "reflection",
    occurredAt: entry.createdAt,
    reflectionId: entry.reflectionId,
    snapshotVersion: entry.snapshotVersion,
  };
  const emission = evaluateMilestoneEmission(entries.length, state.emittedMilestones);
  const next: ReflectionStoreState = {
    profileId: input.profileId,
    entries,
    emittedMilestones: emission.nextEmitted,
    timelineItems: [...state.timelineItems, timelineItem],
  };
  persist(next);
  return {
    entry,
    state: next,
    milestoneId: emission.milestoneId,
    milestoneEmitted: emission.shouldEmit,
  };
}

/** Replay-safe: recording an already-emitted milestone is a no-op. */
export function recordMilestoneEmitted(
  profileId: string,
  milestoneId: ReflectionMilestoneId,
): ReflectionStoreState {
  const state = loadReflectionStore(profileId);
  if (state.emittedMilestones.includes(milestoneId)) return state;
  const next = {
    ...state,
    emittedMilestones: [...state.emittedMilestones, milestoneId],
  };
  persist(next);
  return next;
}

/** Pack 7 delete reflections (one). */
export function deleteReflectionEntry(
  profileId: string,
  reflectionId: string,
): ReflectionStoreState {
  const state = loadReflectionStore(profileId);
  const next: ReflectionStoreState = {
    ...state,
    entries: state.entries.filter((e) => e.reflectionId !== reflectionId),
    timelineItems: state.timelineItems.filter((t) => t.reflectionId !== reflectionId),
  };
  persist(next);
  return next;
}

/** Pack 7 delete all reflections for profile (Birth Sky cascade / privacy). */
export function clearReflectionStore(profileId: string): void {
  try {
    localStorage.removeItem(key(profileId));
  } catch {
    /* ignore */
  }
}
