/**
 * Postgres-backed routine memory/outcome stores with in-memory fallback.
 * Keeps sync PersonalizationMemoryStore / RoutineOutcomeStore interfaces.
 */
import { db, routineActivityOutcomesTable, routinePersonalizationSnapshotsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { logger } from "../logger.js";
import {
  InMemoryPersonalizationMemoryStore,
  type PersonalizationMemoryStore,
  type RoutineGenerationSnapshot,
  setPersonalizationMemoryStore,
} from "./routine-personalization-memory.js";
import {
  InMemoryRoutineOutcomeStore,
  type RoutineOutcomeRecord,
  type RoutineOutcomeStore,
  setRoutineOutcomeStore,
} from "./routine-outcome-log.js";

const MAX_SNAPSHOTS_HYDRATE = 14;
const MAX_OUTCOMES_HYDRATE = 200;

class PersistingPersonalizationMemoryStore implements PersonalizationMemoryStore {
  private readonly inner = new InMemoryPersonalizationMemoryStore();

  appendSnapshot(snapshot: Omit<RoutineGenerationSnapshot, "recordedAt">): void {
    this.inner.appendSnapshot(snapshot);
    void this.persistSnapshot(snapshot).catch((err) => {
      logger.warn(
        { err, childId: snapshot.childId, routineDate: snapshot.routineDate },
        "routine memory snapshot persist failed",
      );
    });
  }

  listSnapshots(childId: string, limit?: number): RoutineGenerationSnapshot[] {
    return this.inner.listSnapshots(childId, limit);
  }

  clear(): void {
    this.inner.clear();
  }

  hydrateInner(rows: RoutineGenerationSnapshot[]): void {
    for (const row of rows) {
      this.inner.appendSnapshot({
        childId: row.childId,
        routineDate: row.routineDate,
        activityKeys: row.activityKeys,
      });
    }
  }

  private async persistSnapshot(
    snapshot: Omit<RoutineGenerationSnapshot, "recordedAt">,
  ): Promise<void> {
    await db
      .insert(routinePersonalizationSnapshotsTable)
      .values({
        childId: snapshot.childId,
        routineDate: snapshot.routineDate,
        activityKeys: snapshot.activityKeys,
      })
      .onConflictDoUpdate({
        target: [
          routinePersonalizationSnapshotsTable.childId,
          routinePersonalizationSnapshotsTable.routineDate,
        ],
        set: {
          activityKeys: snapshot.activityKeys,
          recordedAt: new Date(),
        },
      });
  }
}

class PersistingRoutineOutcomeStore implements RoutineOutcomeStore {
  private readonly inner = new InMemoryRoutineOutcomeStore();

  append(record: Omit<RoutineOutcomeRecord, "id" | "recordedAt">): RoutineOutcomeRecord {
    const entry = this.inner.append(record);
    void this.persistOutcome(entry).catch((err) => {
      logger.warn({ err, id: entry.id }, "routine outcome persist failed");
    });
    return entry;
  }

  list(filter?: { childId?: string; routineDate?: string }): RoutineOutcomeRecord[] {
    return this.inner.list(filter);
  }

  clear(): void {
    this.inner.clear();
  }

  hydrateInner(rows: RoutineOutcomeRecord[]): void {
    for (const row of rows) {
      this.inner.append({
        activity: row.activity,
        category: row.category,
        completed: row.completed,
        skipped: row.skipped,
        childId: row.childId,
        routineDate: row.routineDate,
        metadata: row.metadata,
      });
    }
  }

  private async persistOutcome(entry: RoutineOutcomeRecord): Promise<void> {
    await db
      .insert(routineActivityOutcomesTable)
      .values({
        id: entry.id,
        childId: entry.childId ?? null,
        routineDate: entry.routineDate ?? null,
        activity: entry.activity,
        category: entry.category,
        completed: entry.completed ? 1 : 0,
        skipped: entry.skipped ? 1 : 0,
        metadata: entry.metadata ?? {},
        recordedAt: new Date(entry.recordedAt),
      })
      .onConflictDoNothing();
  }
}

let persistenceInitialized = false;

/** Wire Postgres-backed stores when DATABASE_URL is available. */
export async function bootstrapRoutinePersistenceStores(): Promise<void> {
  if (persistenceInitialized) return;
  persistenceInitialized = true;

  const memoryStore = new PersistingPersonalizationMemoryStore();
  const outcomeStore = new PersistingRoutineOutcomeStore();

  try {
    const snapshotRows = await db
      .select()
      .from(routinePersonalizationSnapshotsTable)
      .orderBy(desc(routinePersonalizationSnapshotsTable.recordedAt))
      .limit(5000);

    const byChild = new Map<string, typeof snapshotRows>();
    for (const row of snapshotRows) {
      const list = byChild.get(row.childId) ?? [];
      if (list.length < MAX_SNAPSHOTS_HYDRATE) list.push(row);
      byChild.set(row.childId, list);
    }
    for (const rows of byChild.values()) {
      memoryStore.hydrateInner(
        rows
          .slice()
          .reverse()
          .map((r) => ({
            childId: r.childId,
            routineDate: r.routineDate,
            activityKeys: r.activityKeys ?? [],
            recordedAt: r.recordedAt.toISOString(),
          })),
      );
    }

    const outcomeRows = await db
      .select()
      .from(routineActivityOutcomesTable)
      .orderBy(desc(routineActivityOutcomesTable.recordedAt))
      .limit(MAX_OUTCOMES_HYDRATE);

    outcomeStore.hydrateInner(
      outcomeRows.map((r) => ({
        id: r.id,
        activity: r.activity,
        category: r.category,
        completed: r.completed === 1,
        skipped: r.skipped === 1,
        childId: r.childId ?? undefined,
        routineDate: r.routineDate ?? undefined,
        metadata: (r.metadata ?? {}) as Record<string, unknown>,
        recordedAt: r.recordedAt.toISOString(),
      })),
    );

    setPersonalizationMemoryStore(memoryStore);
    setRoutineOutcomeStore(outcomeStore);
    logger.info(
      {
        evt: "routine.persistence.ready",
        snapshots: snapshotRows.length,
        outcomes: outcomeRows.length,
      },
      "Routine personalization stores hydrated from Postgres",
    );
  } catch (err) {
    logger.warn(
      { err, evt: "routine.persistence.fallback" },
      "Routine persistence bootstrap failed — using in-memory stores",
    );
  }
}
