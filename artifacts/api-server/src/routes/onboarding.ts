import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, onboardingProfilesTable, childrenTable, parentProfilesTable } from "@workspace/db";
import { getAuth } from "../lib/auth";
import {
  ONBOARDING_SAVE_FALLBACK,
  ONBOARDING_STATUS_FALLBACK,
} from "../lib/api-fallbacks.js";
import { safeRoute } from "../lib/safe-route-handler.js";

const router: IRouter = Router();

router.get(
  "/onboarding",
  safeRoute(
    "GET /onboarding",
    async (req, res): Promise<void> => {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const [profile] = await db
        .select()
        .from(onboardingProfilesTable)
        .where(eq(onboardingProfilesTable.userId, userId));

      const [childRow] = await db
        .select({ id: childrenTable.id })
        .from(childrenTable)
        .where(eq(childrenTable.userId, userId))
        .limit(1);

      const [parentRow] = await db
        .select({ id: parentProfilesTable.id })
        .from(parentProfilesTable)
        .where(eq(parentProfilesTable.userId, userId))
        .limit(1);

      const hasChild = !!childRow;
      const hasParent = !!parentRow;
      const profileComplete = hasChild;
      const onboardingComplete = !!profile?.onboardingComplete || hasChild;

      res.json({
        onboardingComplete,
        profileComplete,
        children: profile?.children ?? [],
        parent: profile?.parent ?? {},
        priorityGoal: profile?.priorityGoal ?? null,
      });
    },
    (_req, res) => {
      res.status(200).json({ ...ONBOARDING_STATUS_FALLBACK });
    },
  ),
);

router.post(
  "/onboarding",
  safeRoute(
    "POST /onboarding",
    async (req, res): Promise<void> => {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { children, parent, priorityGoal, onboardingComplete } = req.body;
      const now = new Date();

      const [existing] = await db
        .select()
        .from(onboardingProfilesTable)
        .where(eq(onboardingProfilesTable.userId, userId));

      let profile;
      if (existing) {
        [profile] = await db
          .update(onboardingProfilesTable)
          .set({ children, parent, priorityGoal, onboardingComplete, updatedAt: now })
          .where(eq(onboardingProfilesTable.userId, userId))
          .returning();
      } else {
        [profile] = await db
          .insert(onboardingProfilesTable)
          .values({ userId, children, parent, priorityGoal, onboardingComplete, updatedAt: now })
          .returning();
      }

      res.json({ success: true, onboardingComplete: profile.onboardingComplete });
    },
    (_req, res) => {
      res.status(200).json({ ...ONBOARDING_SAVE_FALLBACK });
    },
  ),
);

export default router;
