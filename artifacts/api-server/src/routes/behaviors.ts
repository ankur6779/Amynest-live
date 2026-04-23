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

const router: IRouter = Router();

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

  let results;
  if (queryParams.data.childId && queryParams.data.date) {
    if (!childIds.includes(queryParams.data.childId)) {
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
    if (!childIds.includes(queryParams.data.childId)) {
      res.json(ListBehaviorsResponse.parse([]));
      return;
    }
    results = await db.select().from(behaviorsTable).where(eq(behaviorsTable.childId, queryParams.data.childId));
  } else if (queryParams.data.date) {
    results = await db
      .select()
      .from(behaviorsTable)
      .where(and(eq(behaviorsTable.date, queryParams.data.date), inArray(behaviorsTable.childId, childIds)));
  } else {
    results = await db.select().from(behaviorsTable).where(inArray(behaviorsTable.childId, childIds));
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
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId));
  const ownedChildIds = ownedChildren.map((c) => c.id);
  if (ownedChildIds.length === 0) {
    res.status(404).json({ error: "Behavior log not found" });
    return;
  }

  const [behavior] = await db
    .delete(behaviorsTable)
    .where(
      and(
        eq(behaviorsTable.id, params.data.id),
        inArray(behaviorsTable.childId, ownedChildIds),
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
