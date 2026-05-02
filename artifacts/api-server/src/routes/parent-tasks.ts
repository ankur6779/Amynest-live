import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import {
  db,
  childrenTable,
  parentTaskCompletionsTable,
} from "@workspace/db";
import {
  ListParentTaskCompletionsQueryParams,
  ListParentTaskCompletionsResponse,
  SetParentTaskCompletionBody,
  ClearParentTaskCompletionQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const MAX_TASK_KEY_LEN = 240;

function normalizeTaskKey(raw: string): string {
  // The taskKey is the human-readable task string from age-content. Trim to a
  // sane bound so we never blow up the column on a runaway client value.
  return raw.trim().slice(0, MAX_TASK_KEY_LEN);
}

async function getOwnedChildIds(userId: string): Promise<number[]> {
  const rows = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId));
  return rows.map((r) => r.id);
}

router.get("/parent-tasks", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = ListParentTaskCompletionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const ownedChildIds = await getOwnedChildIds(userId);
  if (!ownedChildIds.includes(parsed.data.childId)) {
    // Don't leak existence of the child — just return an empty list.
    res.json(ListParentTaskCompletionsResponse.parse([]));
    return;
  }

  const where = parsed.data.date
    ? and(
        eq(parentTaskCompletionsTable.childId, parsed.data.childId),
        eq(parentTaskCompletionsTable.date, parsed.data.date),
      )
    : eq(parentTaskCompletionsTable.childId, parsed.data.childId);

  const rows = await db
    .select()
    .from(parentTaskCompletionsTable)
    .where(where);

  res.json(
    ListParentTaskCompletionsResponse.parse(
      rows.map((r) => ({
        id: r.id,
        childId: r.childId,
        date: r.date,
        taskKey: r.taskKey,
        createdAt: r.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/parent-tasks", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = SetParentTaskCompletionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const ownedChildIds = await getOwnedChildIds(userId);
  if (!ownedChildIds.includes(parsed.data.childId)) {
    res.status(403).json({ error: "Child not found or not yours" });
    return;
  }

  const taskKey = normalizeTaskKey(parsed.data.taskKey);
  if (!taskKey) {
    res.status(400).json({ error: "taskKey is required" });
    return;
  }

  // Idempotent: re-toggling the same task on the same day for the same child
  // returns the existing row instead of inserting a duplicate. The unique
  // index (child_id, date, task_key) is the source of truth here.
  const inserted = await db
    .insert(parentTaskCompletionsTable)
    .values({
      userId,
      childId: parsed.data.childId,
      date: parsed.data.date,
      taskKey,
    })
    .onConflictDoNothing({
      target: [
        parentTaskCompletionsTable.childId,
        parentTaskCompletionsTable.date,
        parentTaskCompletionsTable.taskKey,
      ],
    })
    .returning();

  let row = inserted[0];
  if (!row) {
    const [existing] = await db
      .select()
      .from(parentTaskCompletionsTable)
      .where(
        and(
          eq(parentTaskCompletionsTable.childId, parsed.data.childId),
          eq(parentTaskCompletionsTable.date, parsed.data.date),
          eq(parentTaskCompletionsTable.taskKey, taskKey),
        ),
      )
      .limit(1);
    if (!existing) {
      res.status(500).json({ error: "Could not save Parent Task completion" });
      return;
    }
    row = existing;
  }

  res.status(200).json({
    id: row.id,
    childId: row.childId,
    date: row.date,
    taskKey: row.taskKey,
    createdAt: row.createdAt.toISOString(),
  });
});

router.delete("/parent-tasks", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = ClearParentTaskCompletionQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const ownedChildIds = await getOwnedChildIds(userId);
  if (!ownedChildIds.includes(parsed.data.childId)) {
    // Don't leak existence — treat as already-cleared.
    res.sendStatus(204);
    return;
  }

  const taskKey = normalizeTaskKey(parsed.data.taskKey);
  if (!taskKey) {
    res.sendStatus(204);
    return;
  }

  await db
    .delete(parentTaskCompletionsTable)
    .where(
      and(
        eq(parentTaskCompletionsTable.childId, parsed.data.childId),
        eq(parentTaskCompletionsTable.date, parsed.data.date),
        eq(parentTaskCompletionsTable.taskKey, taskKey),
      ),
    );

  res.sendStatus(204);
});

/**
 * Used by the weekly recap composer to surface how many Parent Tasks the user
 * checked off across all of their children in the given inclusive date range.
 * Returns a per-child breakdown plus a grand total so the recap can phrase it
 * naturally ("You completed 12 Parent Tasks this week — 8 with Maya and 4
 * with Arjun.").
 *
 * Kept as a separate exported helper rather than a route so the cron uses the
 * service path directly without an HTTP round-trip and so it can be unit
 * tested in isolation.
 */
export async function getParentTaskCompletionCounts(args: {
  userId: string;
  fromDate: string;
  toDate: string;
}): Promise<{
  total: number;
  perChild: Array<{ childId: number; childName: string; count: number }>;
}> {
  const children = await db
    .select({ id: childrenTable.id, name: childrenTable.name })
    .from(childrenTable)
    .where(eq(childrenTable.userId, args.userId));
  if (children.length === 0) return { total: 0, perChild: [] };

  const childIds = children.map((c) => c.id);
  const rows = await db
    .select()
    .from(parentTaskCompletionsTable)
    .where(inArray(parentTaskCompletionsTable.childId, childIds));

  const inRange = rows.filter(
    (r) => r.date >= args.fromDate && r.date <= args.toDate,
  );
  const perChildMap = new Map<number, number>();
  for (const r of inRange) {
    perChildMap.set(r.childId, (perChildMap.get(r.childId) ?? 0) + 1);
  }
  const perChild = children
    .map((c) => ({
      childId: c.id,
      childName: c.name,
      count: perChildMap.get(c.id) ?? 0,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  return { total: inRange.length, perChild };
}

export default router;
