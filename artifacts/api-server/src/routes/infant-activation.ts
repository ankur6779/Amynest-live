import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { getInfantActivationStatus } from "../lib/infant-activation-service.js";

const router: IRouter = Router();

router.get("/infant-activation/:childId", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = z.coerce.number().int().positive().safeParse(req.params.childId);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_child_id" });
    return;
  }

  const status = await getInfantActivationStatus(parsed.data, userId);
  if (!status) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  res.json({ ok: true, activation: status });
});

export default router;
