/**
 * Feedback-ready outcome logging — structured hooks for future ML adaptation.
 * Persistence is in-memory for now; swap `RoutineOutcomeStore` for DB later.
 */

export type RoutineOutcomeRecord = {
  id: string;
  activity: string;
  category: string;
  completed: boolean;
  skipped: boolean;
  childId?: string;
  routineDate?: string;
  recordedAt: string;
  metadata?: Record<string, unknown>;
};

export interface RoutineOutcomeStore {
  append(record: Omit<RoutineOutcomeRecord, "id" | "recordedAt">): RoutineOutcomeRecord;
  list(filter?: { childId?: string; routineDate?: string }): RoutineOutcomeRecord[];
  clear(): void;
}

const MAX_OUTCOMES_PER_CHILD = 200;
const MAX_OUTCOMES_GLOBAL = 5_000;

function normalizeOutcomeKey(activity: string): string {
  return activity.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 48);
}

function outcomeRecordId(
  record: Omit<RoutineOutcomeRecord, "id" | "recordedAt">,
): string {
  const child = record.childId ?? "anon";
  const date = record.routineDate ?? "nodate";
  const key = normalizeOutcomeKey(record.activity);
  const flags = `${record.completed ? 1 : 0}${record.skipped ? 1 : 0}`;
  return `out_${child}_${date}_${key}_${flags}`;
}

export class InMemoryRoutineOutcomeStore implements RoutineOutcomeStore {
  private records: RoutineOutcomeRecord[] = [];

  private trim(): void {
    if (this.records.length <= MAX_OUTCOMES_GLOBAL) return;
    this.records.splice(0, this.records.length - MAX_OUTCOMES_GLOBAL);
  }

  private trimChild(childId: string): void {
    const indices: number[] = [];
    for (let i = 0; i < this.records.length; i++) {
      if (this.records[i]!.childId === childId) indices.push(i);
    }
    if (indices.length <= MAX_OUTCOMES_PER_CHILD) return;
    const drop = indices.length - MAX_OUTCOMES_PER_CHILD;
    for (let d = 0; d < drop; d++) {
      const idx = indices[d]!;
      this.records[idx] = undefined as unknown as RoutineOutcomeRecord;
    }
    this.records = this.records.filter(Boolean);
  }

  append(
    record: Omit<RoutineOutcomeRecord, "id" | "recordedAt">,
  ): RoutineOutcomeRecord {
    const id = outcomeRecordId(record);
    const existing = this.records.find((r) => r.id === id);
    if (existing) return existing;

    const entry: RoutineOutcomeRecord = {
      ...record,
      id,
      recordedAt: new Date().toISOString(),
    };
    this.records.push(entry);
    if (record.childId) this.trimChild(record.childId);
    this.trim();
    return entry;
  }

  list(filter?: { childId?: string; routineDate?: string }): RoutineOutcomeRecord[] {
    if (!filter) return [...this.records];
    return this.records.filter((r) => {
      if (filter.childId && r.childId !== filter.childId) return false;
      if (filter.routineDate && r.routineDate !== filter.routineDate) return false;
      return true;
    });
  }

  clear(): void {
    this.records = [];
  }
}

let defaultStore: RoutineOutcomeStore = new InMemoryRoutineOutcomeStore();

/** Test / future DI hook — replace the default in-memory store. */
export function setRoutineOutcomeStore(store: RoutineOutcomeStore): void {
  defaultStore = store;
}

export function getRoutineOutcomeStore(): RoutineOutcomeStore {
  return defaultStore;
}

/**
 * Records whether an activity was completed or skipped.
 * Does not implement learning yet — only captures structured signals.
 */
export function logRoutineOutcome(
  activity: string,
  completed: boolean,
  skipped: boolean,
  opts?: {
    category?: string;
    childId?: string;
    routineDate?: string;
    metadata?: Record<string, unknown>;
  },
): RoutineOutcomeRecord {
  return defaultStore.append({
    activity,
    category: opts?.category ?? "unknown",
    completed,
    skipped,
    childId: opts?.childId,
    routineDate: opts?.routineDate,
    metadata: opts?.metadata,
  });
}
