/**
 * Unsigned pre-auth analytics ingest.
 *
 * Mounted BEFORE global requireAuth so first_open can land before Firebase
 * login. This is not an open analytics sink: device-id format, allowlist,
 * taxonomy, size, rate limit, and server-owned identity are enforced here.
 */
import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { ANALYTICS_MAX_BATCH } from "@workspace/analytics-taxonomy";
import { getRequestId, sendStructuredApiError } from "../lib/safe-api-response";
import { checkDistributedRateLimit } from "../lib/distributed-rate-limit";
import { logger } from "../lib/logger";
import { recordApiDomainOutcome } from "../lib/api-domain-metrics";
import { DEVICE_ID_HEADER } from "../services/deviceLimitService";
import {
  ingestPreauthAnalyticsEvents,
  isValidPreauthDeviceId,
  sanitizePreauthEvents,
} from "../services/preauthAnalyticsService";

const router: IRouter = Router();

const PREAUTH_MAX_BODY_BYTES = 32 * 1024;
const PREAUTH_DEVICE_WINDOW_MS = 60_000;
const PREAUTH_DEVICE_MAX = 30;
const PREAUTH_IP_WINDOW_MS = 60_000;
const PREAUTH_IP_MAX = 60;

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

function clientIp(req: { ip?: string; headers: Record<string, unknown> }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.ip?.trim() || "unknown";
}

function payloadBytes(body: unknown): number {
  try {
    return JSON.stringify(body)?.length ?? PREAUTH_MAX_BODY_BYTES + 1;
  } catch {
    return PREAUTH_MAX_BODY_BYTES + 1;
  }
}

/**
 * POST /api/analytics/preauth-events
 * Device-scoped ingest for install/open events before Firebase sign-in.
 * No Firebase bearer. Identity is always device:{header device id}.
 */
router.post("/analytics/preauth-events", async (req, res): Promise<void> => {
  const started = Date.now();
  const ipLimit = await checkDistributedRateLimit(`preauth-ip:${clientIp(req)}`, {
    windowMs: PREAUTH_IP_WINDOW_MS,
    maxPerWindow: PREAUTH_IP_MAX,
  });
  if (!ipLimit.allowed) {
    recordApiDomainOutcome("analytics", false, Date.now() - started, "rate_limited");
    res.status(429).json({ error: "rate_limited", retryAfterMs: ipLimit.retryAfterMs });
    return;
  }

  const rawDeviceId = req.headers[DEVICE_ID_HEADER];
  const deviceId = typeof rawDeviceId === "string" ? rawDeviceId.trim() : "";
  if (!isValidPreauthDeviceId(deviceId)) {
    recordApiDomainOutcome("analytics", false, Date.now() - started, "missing_device_id");
    res.status(400).json({ error: "missing_device_id" });
    return;
  }

  const deviceLimit = await checkDistributedRateLimit(`preauth-device:${deviceId}`, {
    windowMs: PREAUTH_DEVICE_WINDOW_MS,
    maxPerWindow: PREAUTH_DEVICE_MAX,
  });
  if (!deviceLimit.allowed) {
    recordApiDomainOutcome("analytics", false, Date.now() - started, "rate_limited");
    res.status(429).json({ error: "rate_limited", retryAfterMs: deviceLimit.retryAfterMs });
    return;
  }

  if (payloadBytes(req.body) > PREAUTH_MAX_BODY_BYTES) {
    recordApiDomainOutcome("analytics", false, Date.now() - started, "payload_too_large");
    res.status(413).json({ error: "payload_too_large" });
    return;
  }

  const parsed = BatchSchema.safeParse(req.body);
  if (!parsed.success) {
    recordApiDomainOutcome("analytics", false, Date.now() - started, "invalid_body");
    res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });
    return;
  }

  try {
    const events = sanitizePreauthEvents(parsed.data.events);
    const summary = await ingestPreauthAnalyticsEvents(events, {
      deviceId,
      platform: parsed.data.platform,
      appVersion: parsed.data.appVersion ?? parsed.data.buildNumber,
    });
    recordApiDomainOutcome("analytics", true, Date.now() - started);
    res.status(202).json({ ok: true, ack: true, ...summary });
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
