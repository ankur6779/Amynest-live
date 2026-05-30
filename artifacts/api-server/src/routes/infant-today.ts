/**
 * Baby Today aggregate card + weekly progress.
 */
import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { canAccessChild } from "../lib/child-access";
import { buildBabyTodayPayload } from "../lib/infant-today-service";

const router: IRouter = Router();

const childIdParamSchema = z.object({
  childId: z.coerce.number().int().positive(),
});

const querySchema = z.object({
  tzOffsetMin: z.coerce.number().int().min(-840).max(840).default(0),
});

router.get("/infant-today/:childId", async (req, res): Promise<void> => {
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

  const q = querySchema.safeParse(req.query);
  const tzOffsetMin = q.success ? q.data.tzOffsetMin : 0;

  const child = await canAccessChild(parsed.data.childId, userId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const payload = await buildBabyTodayPayload(
    child.id,
    child.name,
    child.ageMonths,
    tzOffsetMin,
  );

  res.json({ ok: true, today: payload });
});

export default router;
