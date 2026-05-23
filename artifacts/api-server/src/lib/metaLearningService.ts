import { desc } from "drizzle-orm";
import {
  clearHumanOverride,
  getHumanOverride,
  getSystemHealth,
  loadMetaStateFromRecord,
  persistMetaState,
  setHumanOverride,
  setMetaStateStore,
  tickAutonomousEcosystem,
  type HumanOverride,
  type MetaStateRecord,
} from "@workspace/content-orchestration";
import { db, systemMetaStateTable } from "@workspace/db";

function createPostgresMetaStateStore() {
  return {
    async get(): Promise<MetaStateRecord | null> {
      const rows = await db
        .select()
        .from(systemMetaStateTable)
        .orderBy(desc(systemMetaStateTable.updatedAt))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        metrics: row.metrics as MetaStateRecord["metrics"],
        activeModels: row.activeModels as MetaStateRecord["activeModels"],
        experiments: row.experiments as MetaStateRecord["experiments"],
        updatedAt: row.updatedAt.toISOString(),
      };
    },
    async upsert(record: MetaStateRecord): Promise<void> {
      await db.insert(systemMetaStateTable).values({
        metrics: record.metrics,
        activeModels: record.activeModels,
        experiments: record.experiments,
      });
      loadMetaStateFromRecord(record);
    },
  };
}

let storeInitialized = false;

export async function ensureMetaLearningStore(): Promise<void> {
  if (!storeInitialized) {
    setMetaStateStore(createPostgresMetaStateStore());
    storeInitialized = true;
  }
  const store = createPostgresMetaStateStore();
  const record = await store.get();
  if (record) loadMetaStateFromRecord(record);
}

export async function fetchSystemHealth() {
  await ensureMetaLearningStore();
  return getSystemHealth();
}

export async function runMetaEcosystemTick(force = false) {
  await ensureMetaLearningStore();
  return tickAutonomousEcosystem(force);
}

export function applyHumanOverride(override: HumanOverride) {
  setHumanOverride(override);
}

export function resetHumanOverride() {
  clearHumanOverride();
}

export function readHumanOverride() {
  return getHumanOverride();
}

export async function saveMetaStateSnapshot() {
  await ensureMetaLearningStore();
  await persistMetaState();
}
