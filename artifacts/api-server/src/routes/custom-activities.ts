import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth.js";
import {
  UserCustomActivityInput,
  UserCustomActivityPatch,
  createUserCustomActivity,
  deleteUserCustomActivity,
  listUserCustomActivities,
  serializeUserCustomActivity,
  updateUserCustomActivity,
} from "../services/userCustomActivityService.js";

const router: IRouter = Router();

const IdParams = z.object({ id: z.coerce.number().int().positive() });
const ListQuery = z.object({
  childId: z.coerce.number().int().positive().optional(),
});

router.get("/custom-activities", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = ListQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const rows = await listUserCustomActivities(userId, parsed.data.childId ?? null);
  res.json({ activities: rows.map(serializeUserCustomActivity) });
});

router.post("/custom-activities", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = UserCustomActivityInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const row = await createUserCustomActivity(userId, parsed.data);
    res.status(201).json({ activity: serializeUserCustomActivity(row) });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    res.status(status).json({ error: err instanceof Error ? err.message : "Could not create activity" });
  }
});

router.patch("/custom-activities/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = IdParams.safeParse(req.params);
  const parsed = UserCustomActivityPatch.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const row = await updateUserCustomActivity(userId, params.data.id, parsed.data);
    if (!row) {
      res.status(404).json({ error: "Activity not found" });
      return;
    }
    res.json({ activity: serializeUserCustomActivity(row) });
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    res.status(status).json({ error: err instanceof Error ? err.message : "Could not update activity" });
  }
});

router.delete("/custom-activities/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = IdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const deleted = await deleteUserCustomActivity(userId, params.data.id);
  if (!deleted) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
