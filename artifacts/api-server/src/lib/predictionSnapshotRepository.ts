import { desc, eq } from "drizzle-orm";
import type {
  PredictionSnapshotRecord,
  PredictionStore,
} from "@workspace/content-orchestration";
import { db, childPredictionSnapshotsTable } from "@workspace/db";

export function createPostgresPredictionStore(): PredictionStore {
  return {
    async save(snapshot: PredictionSnapshotRecord): Promise<void> {
      const numericId = Number(snapshot.childId);
      if (!Number.isFinite(numericId)) return;

      await db.insert(childPredictionSnapshotsTable).values({
        childId: numericId,
        predictedSkills: snapshot.predictedSkills,
        dropOffRisk: snapshot.dropOffRisk,
        engagementScore: snapshot.engagementScore,
        confidence: snapshot.confidence,
      });
    },

    async getLatest(childId: string): Promise<PredictionSnapshotRecord | null> {
      const numericId = Number(childId);
      if (!Number.isFinite(numericId)) return null;

      const rows = await db
        .select()
        .from(childPredictionSnapshotsTable)
        .where(eq(childPredictionSnapshotsTable.childId, numericId))
        .orderBy(desc(childPredictionSnapshotsTable.createdAt))
        .limit(1);

      const row = rows[0];
      if (!row) return null;

      return {
        childId: String(row.childId),
        predictedSkills: row.predictedSkills as PredictionSnapshotRecord["predictedSkills"],
        dropOffRisk: row.dropOffRisk,
        engagementScore: row.engagementScore,
        confidence: row.confidence,
        createdAt: row.createdAt.toISOString(),
      };
    },
  };
}
