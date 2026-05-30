/**
 * Caregiver wellbeing check-ins (non-medical).
 */
import { Router, type IRouter } from "express";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { canAccessChild } from "../lib/child-access";
import { db, infantWellbeingCheckinsTable } from "@workspace/db";

const router: IRouter = Router();

const postBodySchema = z.object({
  childId: z.number().int().positive(),
  energy: z.number().int().min(1).max(5),
  stress: z.number().int().min(1).max(5),
});

const childIdParamSchema = z.object({
  childId: z.coerce.number().int().positive(),
});

const AMY_MESSAGES: Record<string, string[]> = {
  low_energy: [
    "You're doing more than you realize. Rest when baby rests — even 10 minutes helps.",
    "Small wins count today. Amy sees how much care you're giving.",
  ],
  high_stress: [
    "It's okay to feel overwhelmed. Take three slow breaths — baby is safe with you.",
    "Hard moments pass. You're not failing — you're learning together.",
  ],
  balanced: [
    "You're showing up with love. That matters more than a perfect schedule.",
    "Steady days build confident babies. Keep going — you've got this.",
  ],
};

function pickAmyMessage(energy: number, stress: number): string {
  const pool =
    stress >= 4
      ? AMY_MESSAGES.high_stress!
      : energy <= 2
        ? AMY_MESSAGES.low_energy!
        : AMY_MESSAGES.balanced!;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

router.post("/infant-wellbeing/checkin", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = postBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  const child = await canAccessChild(parsed.data.childId, userId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const [row] = await db
    .insert(infantWellbeingCheckinsTable)
    .values({
      childId: parsed.data.childId,
      userId,
      energy: parsed.data.energy,
      stress: parsed.data.stress,
      loggedAt: new Date(),
    })
    .returning();

  res.json({
    ok: true,
    checkin: {
      id: row!.id,
      energy: row!.energy,
      stress: row!.stress,
      loggedAt: row!.loggedAt.toISOString(),
    },
    amyMessage: pickAmyMessage(parsed.data.energy, parsed.data.stress),
  });
});

router.get("/infant-wellbeing/:childId/latest", async (req, res): Promise<void> => {
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

  const rows = await db
    .select()
    .from(infantWellbeingCheckinsTable)
    .where(eq(infantWellbeingCheckinsTable.childId, parsed.data.childId))
    .orderBy(desc(infantWellbeingCheckinsTable.loggedAt))
    .limit(1);

  res.json({ ok: true, checkin: rows[0] ?? null });
});

export default router;
