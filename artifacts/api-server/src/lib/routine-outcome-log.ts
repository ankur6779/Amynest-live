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

class InMemoryRoutineOutcomeStore implements RoutineOutcomeStore {
  private records: RoutineOutcomeRecord[] = [];

  append(
    record: Omit<RoutineOutcomeRecord, "id" | "recordedAt">,
  ): RoutineOutcomeRecord {
    const entry: RoutineOutcomeRecord = {
      ...record,
      id: `out_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      recordedAt: new Date().toISOString(),
    };
    this.records.push(entry);
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
