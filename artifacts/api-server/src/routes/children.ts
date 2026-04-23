import { Router, type IRouter } from "express";
import { eq, and, asc, sql } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { db, childrenTable } from "@workspace/db";
import {
  CreateChildBody,
  UpdateChildBody,
  GetChildParams,
  UpdateChildParams,
  DeleteChildParams,
  ListChildrenResponse,
  GetChildResponse,
  UpdateChildResponse,
} from "@workspace/api-zod";
import {
  getOrCreateSubscription,
  isPremiumNow,
  FREE_LIMITS,
} from "../services/subscriptionService";
import { markReferralValid } from "../services/referralService";

const router: IRouter = Router();

router.get("/children", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const children = await db
    .select()
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId))
    .orderBy(asc(childrenTable.createdAt), asc(childrenTable.id));
  res.json(ListChildrenResponse.parse(children.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))));
});

router.post("/children", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreateChildBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Enforce free-tier child cap
  const sub = await getOrCreateSubscription(userId);
  if (!isPremiumNow(sub)) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(childrenTable)
      .where(eq(childrenTable.userId, userId));
    if ((n ?? 0) >= FREE_LIMITS.childrenMax) {
      res.status(402).json({
        error: "child_limit_reached",
        message: `Free plan supports up to ${FREE_LIMITS.childrenMax} child. Upgrade to add more.`,
        limit: FREE_LIMITS.childrenMax,
      });
      return;
    }
  }

  const [child] = await db.insert(childrenTable).values({ ...parsed.data, userId }).returning();

  // Referral system: creating a child counts as the user's first
  // meaningful feature use. Idempotent (only flips pending → valid).
  markReferralValid(userId).catch(() => {});

  res.status(201).json(GetChildResponse.parse({ ...child, createdAt: child.createdAt.toISOString() }));
});

router.get("/children/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = GetChildParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [child] = await db
    .select()
    .from(childrenTable)
    .where(and(eq(childrenTable.id, params.data.id), eq(childrenTable.userId, userId)));
  if (!child) {
    res.status(404).json({ error: "Child not found" });
    return;
  }
  res.json(GetChildResponse.parse({ ...child, createdAt: child.createdAt.toISOString() }));
});

router.patch("/children/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = UpdateChildParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateChildBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [child] = await db
    .update(childrenTable)
    .set(parsed.data)
    .where(and(eq(childrenTable.id, params.data.id), eq(childrenTable.userId, userId)))
    .returning();
  if (!child) {
    res.status(404).json({ error: "Child not found" });
    return;
  }
  res.json(UpdateChildResponse.parse({ ...child, createdAt: child.createdAt.toISOString() }));
});

router.delete("/children/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = DeleteChildParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [child] = await db
    .delete(childrenTable)
    .where(and(eq(childrenTable.id, params.data.id), eq(childrenTable.userId, userId)))
    .returning();
  if (!child) {
    res.status(404).json({ error: "Child not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
