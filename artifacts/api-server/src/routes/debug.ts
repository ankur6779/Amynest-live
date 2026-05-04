import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { db, debugLogsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const apiCallSchema = z.object({
  endpoint: z.string().max(500),
  method: z.string().max(10),
  status: z.number().int().nullable().optional(),
  responseTime: z.number().nullable().optional(),
  requestPayload: z.unknown().optional(),
  responsePayload: z.unknown().optional(),
  error: z.string().max(500).nullable().optional(),
  timestamp: z.string().optional(),
  screen: z.string().max(200).optional(),
});

const userContextSchema = z
  .object({
    country: z.string().max(100).optional(),
    cuisine: z.string().max(100).optional(),
    dietType: z.string().max(100).optional(),
    childAge: z.number().optional(),
    language: z.string().max(20).optional(),
  })
  .passthrough();

const logBodySchema = z.object({
  platform: z.enum(["web", "mobile"]),
  screen: z.string().max(200),
  appVersion: z.string().max(50).optional(),
  sessionId: z.string().max(100).optional(),
  userContext: userContextSchema.optional(),
  apiCalls: z.array(apiCallSchema).max(60).optional(),
  features: z.record(z.string(), z.boolean()).optional(),
});

/**
 * POST /api/debug/log
 * Stores a platform snapshot (screen, user context, recent API calls, feature flags).
 * Used by both web and mobile to submit debug data for parity comparison.
 */
router.post("/debug/log", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = logBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    return;
  }

  const { platform, screen, appVersion, sessionId, userContext, apiCalls, features } = parsed.data;

  await db.insert(debugLogsTable).values({
    userId,
    platform,
    screen,
    appVersion: appVersion ?? null,
    sessionId: sessionId ?? null,
    userContext: (userContext ?? null) as never,
    apiCalls: (apiCalls ?? null) as never,
    features: (features ?? null) as never,
  });

  req.log.info({ platform, screen }, "debug_log_stored");
  res.json({ ok: true });
});

/**
 * GET /api/debug/parity
 * Fetches the latest debug snapshots for the current user from both platforms,
 * groups them by screen, and returns a parity comparison report.
 */
router.get("/debug/parity", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const logs = await db
    .select()
    .from(debugLogsTable)
    .where(eq(debugLogsTable.userId, userId))
    .orderBy(desc(debugLogsTable.createdAt))
    .limit(200);

  // Group by screen → take the latest per platform
  const byScreen: Record<
    string,
    { web?: (typeof logs)[0]; mobile?: (typeof logs)[0] }
  > = {};

  for (const log of logs) {
    if (!byScreen[log.screen]) byScreen[log.screen] = {};
    const entry = byScreen[log.screen];
    if (log.platform === "web" && !entry.web) entry.web = log;
    if (log.platform === "mobile" && !entry.mobile) entry.mobile = log;
  }

  const screens = Object.entries(byScreen).map(([screen, { web, mobile }]) => {
    const webFeats = (web?.features ?? {}) as Record<string, boolean>;
    const mobFeats = (mobile?.features ?? {}) as Record<string, boolean>;

    const allFeats = new Set([...Object.keys(webFeats), ...Object.keys(mobFeats)]);
    const featureComparison: Record<
      string,
      { web: boolean | null; mobile: boolean | null; match: boolean }
    > = {};
    for (const f of allFeats) {
      const w = f in webFeats ? webFeats[f] : null;
      const m = f in mobFeats ? mobFeats[f] : null;
      featureComparison[f] = { web: w ?? null, mobile: m ?? null, match: w === m };
    }

    const webCalls = ((web?.apiCalls ?? []) as { endpoint?: string }[]).map(
      (c) => c.endpoint ?? "",
    );
    const mobCalls = ((mobile?.apiCalls ?? []) as { endpoint?: string }[]).map(
      (c) => c.endpoint ?? "",
    );
    const webApiSet = new Set(webCalls.map((e) => e.replace(/\/[0-9a-f-]{8,}.*/, "/{id}")));
    const mobApiSet = new Set(mobCalls.map((e) => e.replace(/\/[0-9a-f-]{8,}.*/, "/{id}")));
    const onlyOnWeb = [...webApiSet].filter((a) => !mobApiSet.has(a));
    const onlyOnMobile = [...mobApiSet].filter((a) => !webApiSet.has(a));

    const featureMatch = Object.values(featureComparison).every((f) => f.match);
    const apiMatch = onlyOnWeb.length === 0 && onlyOnMobile.length === 0;

    return {
      screen,
      featureMatch,
      apiMatch,
      overallMatch: featureMatch && apiMatch,
      web: web
        ? {
            capturedAt: web.createdAt,
            userContext: web.userContext,
            features: webFeats,
            apiCalls: web.apiCalls,
          }
        : null,
      mobile: mobile
        ? {
            capturedAt: mobile.createdAt,
            userContext: mobile.userContext,
            features: mobFeats,
            apiCalls: mobile.apiCalls,
          }
        : null,
      featureComparison,
      apiComparison: { onlyOnWeb, onlyOnMobile },
    };
  });

  const matched = screens.filter((s) => s.overallMatch).length;
  const issues = screens.filter((s) => !s.overallMatch).length;

  res.json({
    report: {
      totalScreens: screens.length,
      matched,
      issues,
      generatedAt: new Date().toISOString(),
    },
    screens,
  });
});

/**
 * DELETE /api/debug/logs
 * Clears all debug logs for the current user.
 */
router.delete("/debug/logs", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await db.delete(debugLogsTable).where(eq(debugLogsTable.userId, userId));
  logger.info({ userId }, "debug_logs_cleared");
  res.json({ ok: true });
});

export default router;
