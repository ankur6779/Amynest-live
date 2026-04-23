import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { db, behaviorsTable, childrenTable } from "@workspace/db";
import {
  CreateBehaviorLogBody,
  DeleteBehaviorLogParams,
  ListBehaviorsQueryParams,
  ListBehaviorsResponse,
} from "@workspace/api-zod";
import { featureGate } from "../middlewares/featureGate.js";
import {
  getOrCreateSubscription,
  isPremiumNow,
  getFirstChildId,
} from "../services/subscriptionService.js";

const router: IRouter = Router();

/**
 * Derive the "first child" ID from an already-fetched children array,
 * using the same deterministic sort as getFirstChildId() so we avoid a
 * second round-trip to the database.
 */
function firstChildIdFrom(children: Array<{ id: number; createdAt: Date }>): number | null {
  if (children.length === 0) return null;
  const sorted = [...children].sort((a, b) => {
    const timeDiff = a.createdAt.getTime() - b.createdAt.getTime();
    return timeDiff !== 0 ? timeDiff : a.id - b.id;
  });
  return sorted[0].id;
}

router.get("/behaviors", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const queryParams = ListBehaviorsQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  const children = await db.select().from(childrenTable).where(eq(childrenTable.userId, userId));
  const childMap = new Map(children.map((c) => [c.id, c.name]));
  const childIds = children.map((c) => c.id);

  if (childIds.length === 0) {
    res.json(ListBehaviorsResponse.parse([]));
    return;
  }

  // Per-child paywall: free users may only read behaviors for their first child.
  // Derive the first child from the already-fetched children list to avoid an
  // extra database round-trip.
  const sub = await getOrCreateSubscription(userId);
  let allowedChildIds = childIds;
  if (!isPremiumNow(sub)) {
    const firstChildId = firstChildIdFrom(children);
    if (firstChildId === null) {
      res.json(ListBehaviorsResponse.parse([]));
      return;
    }
    // If a specific non-first child was requested, reject it with a paywall error.
    if (queryParams.data.childId && queryParams.data.childId !== firstChildId) {
      res.status(402).json({
        error: "child_locked",
        message: "Upgrade to premium to access this child's behavior data.",
      });
      return;
    }
    allowedChildIds = [firstChildId];
  }

  let results;
  if (queryParams.data.childId && queryParams.data.date) {
    if (!allowedChildIds.includes(queryParams.data.childId)) {
      res.json(ListBehaviorsResponse.parse([]));
      return;
    }
    results = await db.select().from(behaviorsTable).where(
      and(
        eq(behaviorsTable.childId, queryParams.data.childId),
        eq(behaviorsTable.date, queryParams.data.date),
      ),
    );
  } else if (queryParams.data.childId) {
    if (!allowedChildIds.includes(queryParams.data.childId)) {
      res.json(ListBehaviorsResponse.parse([]));
      return;
    }
    results = await db.select().from(behaviorsTable).where(eq(behaviorsTable.childId, queryParams.data.childId));
  } else if (queryParams.data.date) {
    results = await db
      .select()
      .from(behaviorsTable)
      .where(and(eq(behaviorsTable.date, queryParams.data.date), inArray(behaviorsTable.childId, allowedChildIds)));
  } else {
    results = await db.select().from(behaviorsTable).where(inArray(behaviorsTable.childId, allowedChildIds));
  }

  res.json(
    ListBehaviorsResponse.parse(
      results.map((b) => ({
        ...b,
        childName: childMap.get(b.childId) ?? "Unknown",
        notes: b.notes ?? null,
        createdAt: b.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/behaviors", featureGate("behavior_log"), async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateBehaviorLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Per-child paywall: free users may only log behaviors for their first child.
  const sub = await getOrCreateSubscription(userId);
  if (!isPremiumNow(sub)) {
    const firstChildId = await getFirstChildId(userId);
    if (parsed.data.childId !== firstChildId) {
      res.status(402).json({
        error: "child_locked",
        message: "Upgrade to premium to log behaviors for this child.",
      });
      return;
    }
  }

  const [child] = await db
    .select()
    .from(childrenTable)
    .where(and(eq(childrenTable.id, parsed.data.childId), eq(childrenTable.userId, userId)));

  if (!child) {
    res.status(403).json({ error: "Child not found or not yours" });
    return;
  }

  const [behavior] = await db.insert(behaviorsTable).values({
    childId: parsed.data.childId,
    date: parsed.data.date,
    behavior: parsed.data.behavior,
    type: parsed.data.type,
    notes: parsed.data.notes ?? null,
  }).returning();

  res.status(201).json({
    ...behavior,
    childName: child.name,
    notes: behavior.notes ?? null,
    createdAt: behavior.createdAt.toISOString(),
  });
});

router.delete("/behaviors/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = DeleteBehaviorLogParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // SECURITY: enforce ownership — only allow delete if the behavior belongs
  // to a child owned by the authenticated user. Without this join an attacker
  // could delete arbitrary behavior rows by guessing IDs (IDOR).
  const ownedChildren = await db
    .select({ id: childrenTable.id, createdAt: childrenTable.createdAt })
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId));
  const ownedChildIds = ownedChildren.map((c) => c.id);
  if (ownedChildIds.length === 0) {
    res.status(404).json({ error: "Behavior log not found" });
    return;
  }

  // Per-child paywall: free users may only delete behaviors for their first child.
  // For free users, look up the behavior first across ALL owned children so we can
  // distinguish "locked child" (→ 402) from "not found" (→ 404).
  const sub = await getOrCreateSubscription(userId);
  if (!isPremiumNow(sub)) {
    const firstChildId = firstChildIdFrom(ownedChildren);
    if (firstChildId === null) {
      res.status(404).json({ error: "Behavior log not found" });
      return;
    }

    // Check whether the log exists at all (across all owned children).
    const [existingBehavior] = await db
      .select({ id: behaviorsTable.id, childId: behaviorsTable.childId })
      .from(behaviorsTable)
      .where(
        and(
          eq(behaviorsTable.id, params.data.id),
          inArray(behaviorsTable.childId, ownedChildIds),
        ),
      );

    if (!existingBehavior) {
      res.status(404).json({ error: "Behavior log not found" });
      return;
    }

    // Log exists but belongs to a locked child.
    if (existingBehavior.childId !== firstChildId) {
      res.status(402).json({
        error: "child_locked",
        message: "Upgrade to premium to manage behaviors for this child.",
      });
      return;
    }
  }

  const allowedChildIds = isPremiumNow(sub) ? ownedChildIds : [firstChildIdFrom(ownedChildren)!];

  const [behavior] = await db
    .delete(behaviorsTable)
    .where(
      and(
        eq(behaviorsTable.id, params.data.id),
        inArray(behaviorsTable.childId, allowedChildIds),
      ),
    )
    .returning();
  if (!behavior) {
    res.status(404).json({ error: "Behavior log not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
