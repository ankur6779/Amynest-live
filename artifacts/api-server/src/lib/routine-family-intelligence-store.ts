/**
 * Family intelligence persistence — child-scoped, bounded retention for scale.
 * Swap `FamilyIntelligenceStore` for Postgres/Redis at host boundary.
 */
import type { DevelopmentalTrajectory } from "./routine-developmental-trajectory.js";

export type TrajectorySnapshot = {
  childId: string;
  routineDate: string;
  trajectory: DevelopmentalTrajectory;
  completionRate: number;
  recordedAt: string;
};

export type WeeklyRhythmRecord = {
  childId: string;
  weekKey: string;
  avgCompletionRate: number;
  dominantCategories: string[];
  calmEveningRate: number;
  recordedAt: string;
};

export interface FamilyIntelligenceStore {
  appendTrajectory(snapshot: Omit<TrajectorySnapshot, "recordedAt">): void;
  listTrajectories(childId: string, limit?: number): TrajectorySnapshot[];
  upsertWeeklyRhythm(record: Omit<WeeklyRhythmRecord, "recordedAt">): void;
  getWeeklyRhythm(childId: string, weekKey: string): WeeklyRhythmRecord | null;
  clear(): void;
}

const MAX_TRAJECTORIES_PER_CHILD = 90;

export class InMemoryFamilyIntelligenceStore implements FamilyIntelligenceStore {
  private trajectories: TrajectorySnapshot[] = [];
  private weeklyRhythms = new Map<string, WeeklyRhythmRecord>();

  private weekKey(childId: string, weekKey: string): string {
    return `${childId}:${weekKey}`;
  }

  appendTrajectory(snapshot: Omit<TrajectorySnapshot, "recordedAt">): void {
    this.trajectories.push({
      ...snapshot,
      recordedAt: new Date().toISOString(),
    });
    const forChild = this.trajectories.filter((t) => t.childId === snapshot.childId);
    if (forChild.length > MAX_TRAJECTORIES_PER_CHILD) {
      const drop = forChild.length - MAX_TRAJECTORIES_PER_CHILD;
      let removed = 0;
      this.trajectories = this.trajectories.filter((t) => {
        if (t.childId === snapshot.childId && removed < drop) {
          removed += 1;
          return false;
        }
        return true;
      });
    }
  }

  listTrajectories(childId: string, limit = 14): TrajectorySnapshot[] {
    return this.trajectories.filter((t) => t.childId === childId).slice(-limit);
  }

  upsertWeeklyRhythm(record: Omit<WeeklyRhythmRecord, "recordedAt">): void {
    this.weeklyRhythms.set(this.weekKey(record.childId, record.weekKey), {
      ...record,
      recordedAt: new Date().toISOString(),
    });
  }

  getWeeklyRhythm(childId: string, weekKey: string): WeeklyRhythmRecord | null {
    return this.weeklyRhythms.get(this.weekKey(childId, weekKey)) ?? null;
  }

  clear(): void {
    this.trajectories = [];
    this.weeklyRhythms.clear();
  }
}

let defaultStore: FamilyIntelligenceStore = new InMemoryFamilyIntelligenceStore();

export function setFamilyIntelligenceStore(store: FamilyIntelligenceStore): void {
  defaultStore = store;
}

export function getFamilyIntelligenceStore(): FamilyIntelligenceStore {
  return defaultStore;
}

/** ISO week key YYYY-Www (deterministic from date string). */
export function weekKeyFromDate(routineDate: string): string {
  const d = new Date(`${routineDate}T12:00:00.000Z`);
  const onejan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
