import { Router, type IRouter } from "express";
import { eq, desc, inArray } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { db, childrenTable, routinesTable, behaviorsTable } from "@workspace/db";
import { GetDashboardSummaryResponse, GetRecentRoutinesResponse, GetBehaviorStatsResponse } from "@workspace/api-zod";
import { buildInsights, type RoutineItem } from "../services/insightsService";
import {
  DASHBOARD_BEHAVIOR_STATS_FALLBACK,
  DASHBOARD_RECENT_ROUTINES_FALLBACK,
  DASHBOARD_SUMMARY_FALLBACK,
} from "../lib/api-fallbacks.js";
import { safeRoute } from "../lib/safe-route-handler.js";

const router: IRouter = Router();

router.get(
  "/dashboard/summary",
  safeRoute(
    "GET /dashboard/summary",
    async (req, res): Promise<void> => {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const children = await db
        .select()
        .from(childrenTable)
        .where(eq(childrenTable.userId, userId));
      const childIds = children.map((c) => c.id);

      const routines =
        childIds.length > 0
          ? await db
              .select()
              .from(routinesTable)
              .where(inArray(routinesTable.childId, childIds))
          : [];

      const todayBehaviors =
        childIds.length > 0
          ? await db
              .select()
              .from(behaviorsTable)
              .where(eq(behaviorsTable.date, today!))
              .then((rows) => rows.filter((b) => childIds.includes(b.childId)))
          : [];

      const weekRoutines = routines.filter(
        (r) => r.createdAt.toISOString().split("T")[0]! >= weekAgo!,
      );

      const positiveBehaviorsToday = todayBehaviors.filter(
        (b) => b.type === "positive",
      ).length;
      const negativeBehaviorsToday = todayBehaviors.filter(
        (b) => b.type === "negative",
      ).length;

      res.json(
        GetDashboardSummaryResponse.parse({
          totalChildren: children.length,
          totalRoutines: routines.length,
          positiveBehaviorsToday,
          negativeBehaviorsToday,
          routinesGeneratedThisWeek: weekRoutines.length,
        }),
      );
    },
    (_req, res) => {
      res.status(200).json(DASHBOARD_SUMMARY_FALLBACK);
    },
  ),
);

router.get(
  "/dashboard/recent-routines",
  safeRoute(
    "GET /dashboard/recent-routines",
    async (req, res): Promise<void> => {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const children = await db
        .select()
        .from(childrenTable)
        .where(eq(childrenTable.userId, userId));
      const childMap = new Map(children.map((c) => [c.id, c.name]));
      const childIds = children.map((c) => c.id);

      const routines =
        childIds.length > 0
          ? await db
              .select()
              .from(routinesTable)
              .where(inArray(routinesTable.childId, childIds))
              .orderBy(desc(routinesTable.createdAt))
              .limit(5)
          : [];

      res.json(
        GetRecentRoutinesResponse.parse(
          routines.map((r) => ({
            ...r,
            childName: childMap.get(r.childId) ?? "Unknown",
            items: Array.isArray(r.items) ? (r.items as RoutineItem[]) : [],
            uiPrefs:
              r.uiPrefs &&
              typeof r.uiPrefs === "object" &&
              !Array.isArray(r.uiPrefs)
                ? (r.uiPrefs as Record<string, unknown>)
                : {},
            createdAt: r.createdAt.toISOString(),
          })),
        ),
      );
    },
    (_req, res) => {
      res.status(200).json(DASHBOARD_RECENT_ROUTINES_FALLBACK);
    },
  ),
);

router.get(
  "/dashboard/behavior-stats",
  safeRoute(
    "GET /dashboard/behavior-stats",
    async (req, res): Promise<void> => {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const children = await db
        .select()
        .from(childrenTable)
        .where(eq(childrenTable.userId, userId));
      const childIds = children.map((c) => c.id);

      const behaviors =
        childIds.length > 0
          ? await db
              .select()
              .from(behaviorsTable)
              .where(inArray(behaviorsTable.childId, childIds))
          : [];

      const stats = children.map((child) => {
        const childBehaviors = behaviors.filter((b) => b.childId === child.id);
        return {
          childId: child.id,
          childName: child.name,
          positive: childBehaviors.filter((b) => b.type === "positive").length,
          negative: childBehaviors.filter((b) => b.type === "negative").length,
          neutral: childBehaviors.filter((b) => b.type === "neutral").length,
        };
      });

      res.json(GetBehaviorStatsResponse.parse(stats));
    },
    (_req, res) => {
      res.status(200).json(DASHBOARD_BEHAVIOR_STATS_FALLBACK);
    },
  ),
);

router.get("/dashboard/insights", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const range = req.query.range === "month" ? "month" : "week";
    const insights = await buildInsights({ userId, range });
    res.json(insights);
  } catch {
    res.status(200).json({ insights: [], fallback: true });
  }
});

export default router;
