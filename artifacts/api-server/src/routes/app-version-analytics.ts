import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { logger } from "../lib/logger";

const VERSION_ANALYTICS_EVENTS = [
  "app_version_policy_fetched",
  "force_update_displayed",
  "force_update_update_clicked",
  "optional_update_displayed",
  "optional_update_dismissed",
  "version_policy_fetch_failed",
  "cached_policy_used",
] as const;

const VersionAnalyticsEventSchema = z.object({
  eventId: z.string().trim().min(12).max(160),
  name: z.enum(VERSION_ANALYTICS_EVENTS),
  clientTs: z.string().trim().max(40),
  sessionId: z.string().trim().min(4).max(128),
  platform: z.enum(["ios", "android"]).optional(),
  installedVersion: z.string().trim().max(32).nullable().optional(),
  minimumVersion: z.string().trim().max(32).optional(),
  latestVersion: z.string().trim().max(32).optional(),
  forceUpdate: z.boolean().optional(),
  source: z.enum(["network", "cache"]).optional(),
  reason: z.string().trim().max(160).optional(),
  updateType: z.enum(["hard", "soft"]).optional(),
});

const VersionAnalyticsBatchSchema = z.object({
  events: z.array(VersionAnalyticsEventSchema).min(1).max(20),
});

const router: IRouter = Router();

const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_DEDUPE_IDS = 5_000;
const seenEventIds = new Map<string, number>();

function pruneSeenEventIds(now = Date.now()): void {
  for (const [eventId, seenAt] of seenEventIds) {
    if (now - seenAt > DEDUPE_TTL_MS) {
      seenEventIds.delete(eventId);
    }
  }

  if (seenEventIds.size <= MAX_DEDUPE_IDS) return;
  const overflow = seenEventIds.size - MAX_DEDUPE_IDS;
  let removed = 0;
  for (const eventId of seenEventIds.keys()) {
    seenEventIds.delete(eventId);
    removed += 1;
    if (removed >= overflow) break;
  }
}

router.post("/app-version-analytics/events", (req, res): void => {
  const parsed = VersionAnalyticsBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.issues });
    return;
  }

  const now = Date.now();
  pruneSeenEventIds(now);

  let accepted = 0;
  let duplicate = 0;
  for (const event of parsed.data.events) {
    if (seenEventIds.has(event.eventId)) {
      duplicate += 1;
      continue;
    }
    seenEventIds.set(event.eventId, now);
    accepted += 1;
    logger.info(
      {
        kind: "app_version_analytics",
        anonymous: true,
        ...event,
      },
      `[app-version] ${event.name}`,
    );
  }

  res.status(202).json({ ok: true, accepted, duplicate });
});

export default router;
