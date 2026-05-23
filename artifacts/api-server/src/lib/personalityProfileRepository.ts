import { eq } from "drizzle-orm";
import {
  ensurePersonalityProfile,
  type PersonalityLearningStyle,
  type PersonalityProfile,
  type PersonalityProfileStore,
  type PersonalityTraits,
} from "@workspace/content-orchestration";
import { db, childPersonalityProfilesTable } from "@workspace/db";

function rowToProfile(row: {
  childId: number;
  version: number;
  traits: unknown;
  learningStyle: unknown;
  updatedAt: Date;
}): PersonalityProfile {
  return {
    childId: String(row.childId),
    version: row.version,
    traits: row.traits as PersonalityTraits,
    learningStyle: row.learningStyle as PersonalityLearningStyle,
    lastUpdated: row.updatedAt.toISOString(),
  };
}

export function createPostgresPersonalityProfileStore(
  userId: string,
): PersonalityProfileStore {
  return {
    async get(childId: string): Promise<PersonalityProfile | null> {
      const numericId = Number(childId);
      if (!Number.isFinite(numericId)) return null;

      const rows = await db
        .select()
        .from(childPersonalityProfilesTable)
        .where(eq(childPersonalityProfilesTable.childId, numericId))
        .limit(1);

      const row = rows[0];
      if (!row) return null;
      return rowToProfile(row);
    },

    async upsert(profile: PersonalityProfile): Promise<PersonalityProfile> {
      const numericId = Number(profile.childId);
      if (!Number.isFinite(numericId)) {
        throw new Error("invalid_child_id");
      }

      const existing = await this.get(profile.childId);
      if (!existing) {
        await db.insert(childPersonalityProfilesTable).values({
          childId: numericId,
          userId,
          version: profile.version,
          traits: profile.traits,
          learningStyle: profile.learningStyle,
        });
        return profile;
      }

      await db
        .update(childPersonalityProfilesTable)
        .set({
          version: profile.version,
          traits: profile.traits,
          learningStyle: profile.learningStyle,
          updatedAt: new Date(),
        })
        .where(eq(childPersonalityProfilesTable.childId, numericId));

      return profile;
    },
  };
}

export async function getOrCreatePersonalityProfile(
  childId: string,
  userId: string,
): Promise<PersonalityProfile> {
  const store = createPostgresPersonalityProfileStore(userId);
  const existing = await store.get(childId);
  const profile = ensurePersonalityProfile(existing, childId);
  if (!existing) {
    await store.upsert(profile);
  }
  return profile;
}
