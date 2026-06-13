import { eq, sql } from "drizzle-orm";
import {
  db,
  phonicsV3FluencyTable,
  phonicsV3MasteryTable,
  phonicsV3MissionsTable,
  phonicsV3RetentionTable,
  phonicsV3StoryProgressTable,
} from "@workspace/db";
import {
  defaultFluencyPayload,
  defaultMasteryPayload,
  defaultRetentionPayload,
  defaultStoryProgressPayload,
  mergeDomainEnvelope,
  mergeFluencyPayload,
  mergeMasteryPayload,
  mergeMissionPayload,
  mergeRetentionPayload,
  mergeStoryProgressPayload,
  type PhonicsFluencyPayload,
  type PhonicsMasteryPayload,
  type PhonicsMissionPayload,
  type PhonicsRetentionPayload,
  type PhonicsStoryProgressPayload,
  type PhonicsV3Domain,
  type PhonicsV3DomainEnvelope,
  type PhonicsV3ProgressBundle,
} from "@workspace/phonics-v3-progress";
import { withSafeDb } from "./db-safe.js";

function emptyPhonicsV3Bundle(): PhonicsV3ProgressBundle {
  return {
    mastery: null,
    fluency: null,
    stories: null,
    missions: null,
    retention: null,
  };
}

function rowToEnvelope<T>(
  payload: T,
  clientUpdatedAt: number,
): PhonicsV3DomainEnvelope<T> {
  return { payload, clientUpdatedAt };
}

export async function getPhonicsV3ProgressBundle(
  childId: number,
): Promise<PhonicsV3ProgressBundle> {
  return withSafeDb(
    "phonics.v3.getBundle",
    async () => {
      const [masteryRow, fluencyRow, storiesRow, missionsRow, retentionRow] = await Promise.all([
        db.select().from(phonicsV3MasteryTable).where(eq(phonicsV3MasteryTable.childId, childId)).limit(1),
        db.select().from(phonicsV3FluencyTable).where(eq(phonicsV3FluencyTable.childId, childId)).limit(1),
        db
          .select()
          .from(phonicsV3StoryProgressTable)
          .where(eq(phonicsV3StoryProgressTable.childId, childId))
          .limit(1),
        db.select().from(phonicsV3MissionsTable).where(eq(phonicsV3MissionsTable.childId, childId)).limit(1),
        db.select().from(phonicsV3RetentionTable).where(eq(phonicsV3RetentionTable.childId, childId)).limit(1),
      ]);

      return {
        mastery: masteryRow[0]
          ? rowToEnvelope(masteryRow[0].payload, masteryRow[0].clientUpdatedAt)
          : null,
        fluency: fluencyRow[0]
          ? rowToEnvelope(fluencyRow[0].payload, fluencyRow[0].clientUpdatedAt)
          : null,
        stories: storiesRow[0]
          ? rowToEnvelope(storiesRow[0].payload, storiesRow[0].clientUpdatedAt)
          : null,
        missions: missionsRow[0]
          ? rowToEnvelope(missionsRow[0].payload, missionsRow[0].clientUpdatedAt)
          : null,
        retention: retentionRow[0]
          ? rowToEnvelope(retentionRow[0].payload, retentionRow[0].clientUpdatedAt)
          : null,
      };
    },
    emptyPhonicsV3Bundle(),
  );
}

async function upsertMastery(
  childId: number,
  userId: string,
  merged: PhonicsV3DomainEnvelope<PhonicsMasteryPayload>,
): Promise<void> {
  const now = sql`now()`;
  await db
    .insert(phonicsV3MasteryTable)
    .values({
      childId,
      userId,
      payload: merged.payload,
      clientUpdatedAt: merged.clientUpdatedAt,
    })
    .onConflictDoUpdate({
      target: phonicsV3MasteryTable.childId,
      set: {
        payload: merged.payload,
        clientUpdatedAt: merged.clientUpdatedAt,
        updatedAt: now,
      },
    });
}

async function upsertFluency(
  childId: number,
  userId: string,
  merged: PhonicsV3DomainEnvelope<PhonicsFluencyPayload>,
): Promise<void> {
  const now = sql`now()`;
  await db
    .insert(phonicsV3FluencyTable)
    .values({
      childId,
      userId,
      payload: merged.payload,
      clientUpdatedAt: merged.clientUpdatedAt,
    })
    .onConflictDoUpdate({
      target: phonicsV3FluencyTable.childId,
      set: {
        payload: merged.payload,
        clientUpdatedAt: merged.clientUpdatedAt,
        updatedAt: now,
      },
    });
}

async function upsertStories(
  childId: number,
  userId: string,
  merged: PhonicsV3DomainEnvelope<PhonicsStoryProgressPayload>,
): Promise<void> {
  const now = sql`now()`;
  await db
    .insert(phonicsV3StoryProgressTable)
    .values({
      childId,
      userId,
      payload: merged.payload,
      clientUpdatedAt: merged.clientUpdatedAt,
    })
    .onConflictDoUpdate({
      target: phonicsV3StoryProgressTable.childId,
      set: {
        payload: merged.payload,
        clientUpdatedAt: merged.clientUpdatedAt,
        updatedAt: now,
      },
    });
}

async function upsertMissions(
  childId: number,
  userId: string,
  merged: PhonicsV3DomainEnvelope<PhonicsMissionPayload>,
): Promise<void> {
  const now = sql`now()`;
  await db
    .insert(phonicsV3MissionsTable)
    .values({
      childId,
      userId,
      payload: merged.payload,
      clientUpdatedAt: merged.clientUpdatedAt,
    })
    .onConflictDoUpdate({
      target: phonicsV3MissionsTable.childId,
      set: {
        payload: merged.payload,
        clientUpdatedAt: merged.clientUpdatedAt,
        updatedAt: now,
      },
    });
}

async function upsertRetention(
  childId: number,
  userId: string,
  merged: PhonicsV3DomainEnvelope<PhonicsRetentionPayload>,
): Promise<void> {
  const now = sql`now()`;
  await db
    .insert(phonicsV3RetentionTable)
    .values({
      childId,
      userId,
      payload: merged.payload,
      clientUpdatedAt: merged.clientUpdatedAt,
    })
    .onConflictDoUpdate({
      target: phonicsV3RetentionTable.childId,
      set: {
        payload: merged.payload,
        clientUpdatedAt: merged.clientUpdatedAt,
        updatedAt: now,
      },
    });
}

export async function syncPhonicsV3Progress(
  childId: number,
  userId: string,
  clientBundle: Partial<PhonicsV3ProgressBundle>,
): Promise<PhonicsV3ProgressBundle> {
  const serverBundle = await getPhonicsV3ProgressBundle(childId);

  if (clientBundle.mastery) {
    const merged = mergeDomainEnvelope(
      clientBundle.mastery,
      serverBundle.mastery,
      mergeMasteryPayload,
    );
    if (merged) await upsertMastery(childId, userId, merged);
  }
  if (clientBundle.fluency) {
    const merged = mergeDomainEnvelope(
      clientBundle.fluency,
      serverBundle.fluency,
      mergeFluencyPayload,
    );
    if (merged) await upsertFluency(childId, userId, merged);
  }
  if (clientBundle.stories) {
    const merged = mergeDomainEnvelope(
      clientBundle.stories,
      serverBundle.stories,
      mergeStoryProgressPayload,
    );
    if (merged) await upsertStories(childId, userId, merged);
  }
  if (clientBundle.missions) {
    const local = clientBundle.missions;
    const remote = serverBundle.missions;
    if (local && remote) {
      const payload = mergeMissionPayload(
        local.payload,
        remote.payload,
        local.clientUpdatedAt,
        remote.clientUpdatedAt,
      );
      if (payload) {
        await upsertMissions(childId, userId, {
          payload,
          clientUpdatedAt: Math.max(local.clientUpdatedAt, remote.clientUpdatedAt),
        });
      }
    } else if (local) {
      await upsertMissions(childId, userId, local);
    }
  }
  if (clientBundle.retention) {
    const merged = mergeDomainEnvelope(
      clientBundle.retention,
      serverBundle.retention,
      mergeRetentionPayload,
    );
    if (merged) await upsertRetention(childId, userId, merged);
  }

  return getPhonicsV3ProgressBundle(childId);
}

export async function postPhonicsV3Progress(
  childId: number,
  userId: string,
  body: {
    mastery?: PhonicsMasteryPayload;
    fluency?: PhonicsFluencyPayload;
    stories?: PhonicsStoryProgressPayload;
    missions?: PhonicsMissionPayload;
    retention?: PhonicsRetentionPayload;
    clientUpdatedAt: number;
  },
): Promise<PhonicsV3ProgressBundle> {
  const patch: Partial<PhonicsV3ProgressBundle> = {};
  if (body.mastery) {
    patch.mastery = { payload: body.mastery, clientUpdatedAt: body.clientUpdatedAt };
  }
  if (body.fluency) {
    patch.fluency = { payload: body.fluency, clientUpdatedAt: body.clientUpdatedAt };
  }
  if (body.stories) {
    patch.stories = { payload: body.stories, clientUpdatedAt: body.clientUpdatedAt };
  }
  if (body.missions) {
    patch.missions = { payload: body.missions, clientUpdatedAt: body.clientUpdatedAt };
  }
  if (body.retention) {
    patch.retention = { payload: body.retention, clientUpdatedAt: body.clientUpdatedAt };
  }
  return syncPhonicsV3Progress(childId, userId, patch);
}

export async function patchPhonicsV3Domain(
  childId: number,
  userId: string,
  domain: PhonicsV3Domain,
  payload:
    | PhonicsMasteryPayload
    | PhonicsFluencyPayload
    | PhonicsStoryProgressPayload
    | PhonicsMissionPayload
    | PhonicsRetentionPayload,
  clientUpdatedAt: number,
): Promise<PhonicsV3ProgressBundle> {
  const envelope = { payload, clientUpdatedAt } as PhonicsV3DomainEnvelope<typeof payload>;
  const patch: Partial<PhonicsV3ProgressBundle> = { [domain]: envelope };
  return syncPhonicsV3Progress(childId, userId, patch);
}

export function emptyPhonicsV3Bundle(): PhonicsV3ProgressBundle {
  return {
    mastery: { payload: defaultMasteryPayload(), clientUpdatedAt: 0 },
    fluency: { payload: defaultFluencyPayload(), clientUpdatedAt: 0 },
    stories: { payload: defaultStoryProgressPayload(), clientUpdatedAt: 0 },
    missions: null,
    retention: { payload: defaultRetentionPayload(), clientUpdatedAt: 0 },
  };
}
