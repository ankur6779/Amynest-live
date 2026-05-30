/**
 * Co-parent / caregiver sharing for infant logs.
 */
import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { getAuth } from "../lib/auth";
import { canAccessChild, isChildOwner } from "../lib/child-access";
import { db, childCaregiversTable } from "@workspace/db";

const router: IRouter = Router();

const childIdParamSchema = z.object({
  childId: z.coerce.number().int().positive(),
});

const acceptBodySchema = z.object({
  inviteCode: z.string().min(8).max(32),
});

function makeInviteCode(): string {
  return randomBytes(6).toString("hex").toUpperCase();
}

router.post("/child-caregivers/:childId/invite", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = childIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_params" });
    return;
  }

  if (!(await isChildOwner(parsed.data.childId, userId))) {
    res.status(403).json({ error: "owner_only" });
    return;
  }

  const inviteCode = makeInviteCode();
  const [row] = await db
    .insert(childCaregiversTable)
    .values({
      childId: parsed.data.childId,
      userId: `pending:${inviteCode}`,
      role: "co_parent",
      status: "pending",
      inviteCode,
      invitedByUserId: userId,
      invitedAt: new Date(),
    })
    .returning();

  res.json({
    ok: true,
    inviteCode: row!.inviteCode,
    expiresHint: "Share this code with your co-parent. They tap Accept in Infant Hub.",
  });
});

router.post("/child-caregivers/accept", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = acceptBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  const rows = await db
    .select()
    .from(childCaregiversTable)
    .where(
      and(
        eq(childCaregiversTable.inviteCode, parsed.data.inviteCode.toUpperCase()),
        eq(childCaregiversTable.status, "pending"),
      ),
    )
    .limit(1);

  const invite = rows[0];
  if (!invite) {
    res.status(404).json({ error: "invite_not_found" });
    return;
  }

  await db
    .update(childCaregiversTable)
    .set({
      userId,
      status: "active",
      acceptedAt: new Date(),
    })
    .where(eq(childCaregiversTable.id, invite.id));

  res.json({ ok: true, childId: invite.childId });
});

router.get("/child-caregivers/:childId", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = childIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_params" });
    return;
  }

  const child = await canAccessChild(parsed.data.childId, userId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const members = await db
    .select()
    .from(childCaregiversTable)
    .where(
      and(
        eq(childCaregiversTable.childId, parsed.data.childId),
        eq(childCaregiversTable.status, "active"),
      ),
    );

  res.json({
    ok: true,
    ownerUserId: child.userId,
    coParents: members.map((m) => ({
      userId: m.userId,
      role: m.role,
      acceptedAt: m.acceptedAt?.toISOString() ?? null,
    })),
  });
});

export default router;
