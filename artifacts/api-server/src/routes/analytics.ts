import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { getAuth } from "../lib/auth";
import { getRequestId, sendStructuredApiError } from "../lib/safe-api-response";
import { ANALYTICS_MAX_BATCH } from "@workspace/analytics-taxonomy";
import { ingestAnalyticsEvents } from "../services/analyticsIngestService";
import {
  ingestPreauthAnalyticsEvents,
  isValidPreauthDeviceId,
} from "../services/preauthAnalyticsService";
import { DEVICE_ID_HEADER } from "../services/deviceLimitService";
import { logger } from "../lib/logger";
import { recordApiDomainOutcome } from "../lib/api-domain-metrics";

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
  buildNumber: z.string().max(32).optional(),
  environment: z.string().max(32).optional(),
});

/**
 * POST /api/analytics/events
 * Batch ingest of product analytics events. Each event is validated against
 * the analytics taxonomy; malformed events are dropped (not fatal) and
 * counted for data quality. Pure measurement — never feeds generation.
 */
router.post("/analytics/events", async (req, res): Promise<void> => {
  const started = Date.now();
  const { userId } = getAuth(req);
  if (!userId) {
    recordApiDomainOutcome("analytics", false, Date.now() - started, "unauthorized");
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = BatchSchema.safeParse(req.body);
  if (!parsed.success) {
    recordApiDomainOutcome("analytics", false, Date.now() - started, "invalid_body");
    res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });
    return;
  }

  try {
    const summary = await ingestAnalyticsEvents(parsed.data.events, {
      userId,
      platform: parsed.data.platform,
      appVersion: parsed.data.appVersion ?? parsed.data.buildNumber,
    });
    recordApiDomainOutcome("analytics", true, Date.now() - started);
    res.status(202).json({ ok: true, ...summary });
  } catch (err) {
    const requestId = getRequestId(req);
    logger.error(
      {
        err,
        evt: "analytics.ingest_failed",
        userId,
        requestId,
      },
      "analytics ingest failed",
    );
    sendStructuredApiError(res, 500, {
      code: "server_error",
      message: err instanceof Error ? err.message : "analytics ingest failed",
      requestId,
    });
    recordApiDomainOutcome("analytics", false, Date.now() - started, "server_error");
  }
});

/**
 * POST /api/analytics/preauth-events
 * Device-scoped ingest for install/open events before Firebase sign-in.
 * Requires x-amynest-device-id; only pre-auth allowlisted events are stored.
 */
router.post("/analytics/preauth-events", async (req, res): Promise<void> => {
  const started = Date.now();
  const rawDeviceId = req.headers[DEVICE_ID_HEADER];
  const deviceId = typeof rawDeviceId === "string" ? rawDeviceId.trim() : "";
  if (!isValidPreauthDeviceId(deviceId)) {
    recordApiDomainOutcome("analytics", false, Date.now() - started, "missing_device_id");
    res.status(400).json({ error: "missing_device_id" });
    return;
  }

  const parsed = BatchSchema.safeParse(req.body);
  if (!parsed.success) {
    recordApiDomainOutcome("analytics", false, Date.now() - started, "invalid_body");
    res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });
    return;
  }

  try {
    const summary = await ingestPreauthAnalyticsEvents(parsed.data.events, {
      deviceId,
      platform: parsed.data.platform,
      appVersion: parsed.data.appVersion ?? parsed.data.buildNumber,
    });
    recordApiDomainOutcome("analytics", true, Date.now() - started);
    res.status(202).json({ ok: true, ...summary });
  } catch (err) {
    const requestId = getRequestId(req);
    logger.error(
      {
        err,
        evt: "analytics.preauth_ingest_failed",
        deviceId: deviceId.slice(0, 8),
        requestId,
      },
      "preauth analytics ingest failed",
    );
    sendStructuredApiError(res, 500, {
      code: "server_error",
      message: err instanceof Error ? err.message : "preauth analytics ingest failed",
      requestId,
    });
    recordApiDomainOutcome("analytics", false, Date.now() - started, "server_error");
  }
});

export default router;
