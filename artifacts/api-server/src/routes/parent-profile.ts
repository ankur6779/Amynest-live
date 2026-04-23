import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, parentProfilesTable } from "@workspace/db";
import { getAuth } from "../lib/auth";
import {
  GetParentProfileResponse,
  UpsertParentProfileBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/parent-profile", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [profile] = await db
    .select()
    .from(parentProfilesTable)
    .where(eq(parentProfilesTable.userId, userId));

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json(
    GetParentProfileResponse.parse({
      ...profile,
      freeSlots: (profile.freeSlots as any[]) ?? [],
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    }),
  );
});

router.put("/parent-profile", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = UpsertParentProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const now = new Date();
  const [existing] = await db
    .select()
    .from(parentProfilesTable)
    .where(eq(parentProfilesTable.userId, userId));

  let profile;
  if (existing) {
    [profile] = await db
      .update(parentProfilesTable)
      .set({ ...parsed.data, updatedAt: now })
      .where(eq(parentProfilesTable.userId, userId))
      .returning();
  } else {
    [profile] = await db
      .insert(parentProfilesTable)
      .values({ userId, ...parsed.data, updatedAt: now })
      .returning();
  }

  res.json(
    GetParentProfileResponse.parse({
      ...profile,
      freeSlots: (profile.freeSlots as any[]) ?? [],
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    }),
  );
});

export default router;
