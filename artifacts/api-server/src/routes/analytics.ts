import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { getAuth } from "../lib/auth";
import { ANALYTICS_MAX_BATCH } from "@workspace/analytics-taxonomy";
import { ingestAnalyticsEvents } from "../services/analyticsIngestService";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const EventSchema = z.object({
  name: z.string().min(1).max(64),
  props: z.record(z.string(), z.unknown()).optional(),
  sessionId: z.string().max(128).optional(),
  clientTs: z.string().max(40).optional(),
  platform: z.string().max(32).optional(),
  appVersion: z.string().max(32).optional(),
});

const BatchSchema = z.object({
  events: z.array(EventSchema).min(1).max(ANALYTICS_MAX_BATCH),
  platform: z.string().max(32).optional(),
  appVersion: z.string().max(32).optional(),
});

/**
 * POST /api/analytics/events
 * Batch ingest of product analytics events. Each event is validated against
 * the analytics taxonomy; malformed events are dropped (not fatal) and
 * counted for data quality. Pure measurement — never feeds generation.
 */
router.post("/analytics/events", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = BatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });
    return;
  }

  try {
    const summary = await ingestAnalyticsEvents(parsed.data.events, {
      userId,
      platform: parsed.data.platform,
      appVersion: parsed.data.appVersion,
    });
    res.status(202).json({ ok: true, ...summary });
  } catch (err) {
    logger.error(
      `analytics ingest failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
