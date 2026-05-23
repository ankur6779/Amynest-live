import { eq } from "drizzle-orm";
import {
  ensureLearningProfile,
  profileFromDbRow,
  type LearningProfile,
  type LearningProfileStore,
} from "@workspace/content-orchestration";
import { db, childContentLearningProfilesTable } from "@workspace/db";

export function createPostgresLearningProfileStore(
  userId: string,
): LearningProfileStore {
  return {
    async get(childId: string): Promise<LearningProfile | null> {
      const numericId = Number(childId);
      if (!Number.isFinite(numericId)) return null;

      const rows = await db
        .select()
        .from(childContentLearningProfilesTable)
        .where(eq(childContentLearningProfilesTable.childId, numericId))
        .limit(1);

      const row = rows[0];
      if (!row) return null;

      return profileFromDbRow({
        childId: String(row.childId),
        userId: row.userId,
        version: row.version,
        profile: row.profile as LearningProfile,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    },

    async upsert(profile: LearningProfile): Promise<LearningProfile> {
      const numericId = Number(profile.childId);
      if (!Number.isFinite(numericId)) {
        throw new Error("invalid_child_id");
      }

      const existing = await this.get(profile.childId);
      const payload = profile;

      if (!existing) {
        await db.insert(childContentLearningProfilesTable).values({
          childId: numericId,
          userId: userId,
          version: payload.version,
          profile: payload,
        });
        return payload;
      }

      await db
        .update(childContentLearningProfilesTable)
        .set({
          version: payload.version,
          profile: payload,
          updatedAt: new Date(),
        })
        .where(eq(childContentLearningProfilesTable.childId, numericId));

      return payload;
    },
  };
}

export async function getOrCreateLearningProfile(
  childId: string,
  userId: string,
): Promise<LearningProfile> {
  const store = createPostgresLearningProfileStore(userId);
  const existing = await store.get(childId);
  const profile = ensureLearningProfile(existing, childId, userId);
  if (!existing) {
    await store.upsert(profile);
  }
  return profile;
}
