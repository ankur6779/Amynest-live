/**
 * Personalization memory — deterministic multi-day signals from outcome history.
 * In-memory today; interface supports future DB persistence.
 */
import type { RoutineActivityHistory } from "./routine-behavior-signature.js";
import { normalizeActivityKey } from "./routine-activity-metadata.js";
import { getRoutineOutcomeStore } from "./routine-outcome-log.js";

export type RoutineGenerationSnapshot = {
  childId: string;
  routineDate: string;
  activityKeys: string[];
  recordedAt: string;
};

export type PersonalizationMemory = {
  childId?: string;
  /** Recent day fingerprints (newest last). */
  recentDayKeys: string[][];
  skippedActivityKeys: string[];
  completedActivityKeys: string[];
  completionRate: number;
  preferredCategories: string[];
  lastRoutineDate?: string;
  snapshotCount: number;
};

export interface PersonalizationMemoryStore {
  appendSnapshot(snapshot: Omit<RoutineGenerationSnapshot, "recordedAt">): void;
  listSnapshots(childId: string, limit?: number): RoutineGenerationSnapshot[];
  clear(): void;
}

const MAX_SNAPSHOTS_PER_CHILD = 14;

export class InMemoryPersonalizationMemoryStore implements PersonalizationMemoryStore {
  private snapshots: RoutineGenerationSnapshot[] = [];

  appendSnapshot(snapshot: Omit<RoutineGenerationSnapshot, "recordedAt">): void {
    const sameDay = this.snapshots.find(
      (s) =>
        s.childId === snapshot.childId && s.routineDate === snapshot.routineDate,
    );
    if (sameDay) {
      sameDay.activityKeys = snapshot.activityKeys;
      sameDay.recordedAt = new Date().toISOString();
      return;
    }

    this.snapshots.push({
      ...snapshot,
      recordedAt: new Date().toISOString(),
    });

    const forChild = this.snapshots.filter((s) => s.childId === snapshot.childId);
    if (forChild.length > MAX_SNAPSHOTS_PER_CHILD) {
      const drop = forChild.length - MAX_SNAPSHOTS_PER_CHILD;
      let removed = 0;
      this.snapshots = this.snapshots.filter((s) => {
        if (removed < drop && s.childId === snapshot.childId) {
          removed++;
          return false;
        }
        return true;
      });
    }
  }

  listSnapshots(childId: string, limit = 5): RoutineGenerationSnapshot[] {
    return this.snapshots
      .filter((s) => s.childId === childId)
      .slice(-Math.min(limit, MAX_SNAPSHOTS_PER_CHILD));
  }

  clear(): void {
    this.snapshots = [];
  }
}

let memoryStore: PersonalizationMemoryStore = new InMemoryPersonalizationMemoryStore();

export function setPersonalizationMemoryStore(store: PersonalizationMemoryStore): void {
  memoryStore = store;
}

export function getPersonalizationMemoryStore(): PersonalizationMemoryStore {
  return memoryStore;
}

function activityKeysFromActivities(activities: string[]): string[] {
  return [...new Set(activities.map((a) => normalizeActivityKey(a)).filter(Boolean))];
}

/**
 * Build personalization memory from outcome log + optional behavior history.
 */
export function buildPersonalizationMemory(opts: {
  childId?: string;
  history?: RoutineActivityHistory;
  routineDate?: string;
}): PersonalizationMemory {
  const childId = opts.childId;
  const outcomes =
    childId != null ? getRoutineOutcomeStore().list({ childId }).slice(-80) : [];

  const skippedActivityKeys = [
    ...new Set(
      outcomes.filter((o) => o.skipped).map((o) => normalizeActivityKey(o.activity)),
    ),
  ].filter(Boolean);

  const completedActivityKeys = [
    ...new Set(
      outcomes
        .filter((o) => o.completed && !o.skipped)
        .map((o) => normalizeActivityKey(o.activity)),
    ),
  ].filter(Boolean);

  const done = outcomes.filter((o) => o.completed && !o.skipped).length;
  const completionRate =
    outcomes.length > 0 ? Math.round((done / outcomes.length) * 100) / 100 : 0.65;

  const categoryCounts = new Map<string, number>();
  for (const o of outcomes) {
    if (!o.completed || o.skipped) continue;
    const cat = (o.category ?? "unknown").toLowerCase();
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  }
  const preferredCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);

  const snapshots =
    childId != null ? memoryStore.listSnapshots(childId, 5) : [];
  const recentDayKeys = snapshots.map((s) => s.activityKeys);

  const lastRoutineDate =
    snapshots[snapshots.length - 1]?.routineDate ?? opts.routineDate;

  return {
    childId,
    recentDayKeys,
    skippedActivityKeys,
    completedActivityKeys,
    completionRate,
    preferredCategories,
    lastRoutineDate,
    snapshotCount: snapshots.length,
  };
}

/** Record today's activity fingerprints for multi-day continuity. */
export function recordRoutineGenerationMemory(opts: {
  childId: string;
  routineDate: string;
  activities: string[];
}): RoutineGenerationSnapshot {
  const snapshot = {
    childId: opts.childId,
    routineDate: opts.routineDate,
    activityKeys: activityKeysFromActivities(opts.activities),
  };
  memoryStore.appendSnapshot(snapshot);
  return { ...snapshot, recordedAt: new Date().toISOString() };
}
