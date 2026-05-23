import { eq } from "drizzle-orm";
import {
  buildCohortKey,
  derivePersonalityCluster,
  ensureGlobalGraphLoaded,
  getGlobalPlanContext,
  loadGlobalGraphFromRows,
  runGlobalGraphBatch,
  setGlobalGraphStore,
  toGlobalApiPayload,
  type CountryCode,
  type GlobalLearningGraphRow,
} from "@workspace/content-orchestration";
import { db, globalLearningGraphTable } from "@workspace/db";
import { getOrCreatePersonalityProfile } from "./personalityProfileRepository.js";
import type { AgeBand } from "@workspace/content-orchestration";

function createPostgresGlobalGraphStore() {
  return {
    async getAll(): Promise<GlobalLearningGraphRow[]> {
      const rows = await db.select().from(globalLearningGraphTable);
      return rows.map((r) => ({
        skill: r.skill,
        successRate: r.successRate,
        engagementScore: r.engagementScore,
        transitions: (r.transitions ?? {}) as Record<string, number>,
        updatedAt: r.updatedAt.toISOString(),
      }));
    },
    async upsertSkill(row: GlobalLearningGraphRow): Promise<void> {
      const existing = await db
        .select()
        .from(globalLearningGraphTable)
        .where(eq(globalLearningGraphTable.skill, row.skill))
        .limit(1);
      if (existing[0]) {
        await db
          .update(globalLearningGraphTable)
          .set({
            successRate: row.successRate,
            engagementScore: row.engagementScore,
            transitions: row.transitions,
            updatedAt: new Date(),
          })
          .where(eq(globalLearningGraphTable.skill, row.skill));
      } else {
        await db.insert(globalLearningGraphTable).values({
          skill: row.skill,
          successRate: row.successRate,
          engagementScore: row.engagementScore,
          transitions: row.transitions,
        });
      }
    },
    async upsertMany(rows: GlobalLearningGraphRow[]): Promise<void> {
      for (const row of rows) {
        await this.upsertSkill(row);
      }
      loadGlobalGraphFromRows(rows);
    },
  };
}

let storeInitialized = false;
let postgresStore: ReturnType<typeof createPostgresGlobalGraphStore> | null = null;

export async function ensureGlobalLearningStore(): Promise<void> {
  if (!storeInitialized) {
    postgresStore = createPostgresGlobalGraphStore();
    setGlobalGraphStore(postgresStore);
    storeInitialized = true;
  }
  const rows = await postgresStore!.getAll();
  ensureGlobalGraphLoaded(rows);
}

export async function fetchGlobalInsightsForUser(
  userId: string,
  countryCode: CountryCode,
  ageBand: AgeBand,
  childId?: string,
) {
  await ensureGlobalLearningStore();
  let personality;
  if (childId) {
    personality = await getOrCreatePersonalityProfile(childId, userId);
  }
  const ctx = getGlobalPlanContext(countryCode, ageBand, personality ?? undefined);
  return toGlobalApiPayload(ctx);
}

export async function runGlobalLearningBatchJob(force = false) {
  await ensureGlobalLearningStore();
  return runGlobalGraphBatch(force);
}

export { buildCohortKey, derivePersonalityCluster };
