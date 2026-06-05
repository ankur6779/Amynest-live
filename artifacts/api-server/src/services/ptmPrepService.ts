import { eq } from "drizzle-orm";
import { db, ptmPrepDataTable } from "@workspace/db";
import {
  MAX_HISTORY,
  type PtmPrepSyncPayload,
  type PtmReminder,
  type PtmSession,
} from "@workspace/ptm-prep";

function capHistory(history: PtmSession[]): PtmSession[] {
  return history.slice(0, MAX_HISTORY);
}

export async function getPtmPrepSync(userId: string): Promise<PtmPrepSyncPayload> {
  const rows = await db
    .select()
    .from(ptmPrepDataTable)
    .where(eq(ptmPrepDataTable.userId, userId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return { draft: null, history: [], reminders: [], clientUpdatedAt: 0 };
  }

  return {
    draft: (row.draft as unknown as PtmSession | null) ?? null,
    history: capHistory(
      Array.isArray(row.history) ? (row.history as unknown as PtmSession[]) : [],
    ),
    reminders: Array.isArray(row.reminders)
      ? (row.reminders as unknown as PtmReminder[])
      : [],
    clientUpdatedAt: row.clientUpdatedAt ?? 0,
  };
}

export async function putPtmPrepSync(
  userId: string,
  payload: PtmPrepSyncPayload,
): Promise<PtmPrepSyncPayload> {
  const existing = await getPtmPrepSync(userId);
  if (payload.clientUpdatedAt < existing.clientUpdatedAt) {
    return existing;
  }

  const next: PtmPrepSyncPayload = {
    draft: payload.draft,
    history: capHistory(payload.history),
    reminders: payload.reminders,
    clientUpdatedAt: payload.clientUpdatedAt,
  };

  const draftJson = next.draft as unknown as Record<string, unknown> | null;
  const historyJson = next.history as unknown as Record<string, unknown>[];
  const remindersJson = next.reminders as unknown as Record<string, unknown>[];

  await db
    .insert(ptmPrepDataTable)
    .values({
      userId,
      draft: draftJson,
      history: historyJson,
      reminders: remindersJson,
      clientUpdatedAt: next.clientUpdatedAt,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: ptmPrepDataTable.userId,
      set: {
        draft: draftJson,
        history: historyJson,
        reminders: remindersJson,
        clientUpdatedAt: next.clientUpdatedAt,
        updatedAt: new Date(),
      },
    });

  return next;
}
