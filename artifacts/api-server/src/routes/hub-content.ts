/**
 * Parent Hub content endpoint — single source of truth for the two-section
 * payload that web (`kidschedule`) and mobile (`amynest-mobile`) clients
 * both consume.
 *
 *   GET /api/hub/content?childId=123
 *
 * Returns Section 1 (current-band tagged + universal/untagged content) and
 * Section 2 (future content with a unified `previewOnly` flag per item),
 * plus the band-progress numbers and `nextBandEarlyUnlocked` flag clients
 * use to render the "preview & lock" UX.
 */
import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import { db, childrenTable } from "@workspace/db";
import { computeHubContent } from "../services/parentHubService";

const router: IRouter = Router();

const Query = z.object({
  childId: z.coerce.number().int().positive(),
});

router.get("/content", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = Query.safeParse(req.query);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }
  const { childId } = parsed.data;

  try {
    const childRows = await db
      .select({
        id: childrenTable.id,
        name: childrenTable.name,
        age: childrenTable.age,
        ageMonths: childrenTable.ageMonths,
      })
      .from(childrenTable)
      .where(
        and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)),
      )
      .limit(1);
    const child = childRows[0];
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    const payload = await computeHubContent(
      {
        id: child.id,
        name: child.name,
        age: child.age ?? 0,
        ageMonths: child.ageMonths ?? 0,
      },
      userId,
    );
    res.json(payload);
  } catch (err) {
    logger.error(
      `hub-content GET failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
