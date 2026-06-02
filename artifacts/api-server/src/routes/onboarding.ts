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

async function readOnboardingState(userId: string) {
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
  // Do not treat a lone child row as onboarding complete — that skips finish
  // writes when a prior attempt partially saved a child. Legacy users with
  // both child + parent are repaired below.
  let onboardingComplete = !!profile?.onboardingComplete;

  if (!onboardingComplete && hasChild && hasParent) {
    const now = new Date();
    if (profile) {
      await db
        .update(onboardingProfilesTable)
        .set({ onboardingComplete: true, updatedAt: now })
        .where(eq(onboardingProfilesTable.userId, userId));
    } else {
      await db.insert(onboardingProfilesTable).values({
        userId,
        children: [],
        parent: {},
        priorityGoal: null,
        onboardingComplete: true,
        updatedAt: now,
      });
    }
    onboardingComplete = true;
  }

  return {
    profile,
    hasChild,
    hasParent,
    profileComplete,
    onboardingComplete,
  };
}

async function upsertOnboardingCompletion(
  userId: string,
  body: {
    children?: unknown;
    parent?: unknown;
    priorityGoal?: unknown;
    onboardingComplete?: boolean;
  },
): Promise<{ onboardingComplete: boolean; alreadyCompleted: boolean }> {
  const { children, parent, priorityGoal, onboardingComplete } = body;
  const [existing] = await db
    .select()
    .from(onboardingProfilesTable)
    .where(eq(onboardingProfilesTable.userId, userId));

  const now = new Date();
  const wasAlreadyComplete = !!existing?.onboardingComplete;
  const nextComplete = onboardingComplete !== false ? true : wasAlreadyComplete;

  let profile;
  const childrenJson = Array.isArray(children) ? children : [];
  const parentJson =
    parent != null && typeof parent === "object" && !Array.isArray(parent)
      ? parent
      : {};
  const priorityGoalText = typeof priorityGoal === "string" ? priorityGoal : null;

  if (existing) {
    [profile] = await db
      .update(onboardingProfilesTable)
      .set({
        children: childrenJson,
        parent: parentJson,
        priorityGoal: priorityGoalText,
        onboardingComplete: nextComplete,
        updatedAt: now,
      })
      .where(eq(onboardingProfilesTable.userId, userId))
      .returning();
  } else {
    [profile] = await db
      .insert(onboardingProfilesTable)
      .values({
        userId,
        children: childrenJson,
        parent: parentJson,
        priorityGoal: priorityGoalText,
        onboardingComplete: nextComplete,
        updatedAt: now,
      })
      .returning();
  }

  return {
    onboardingComplete: !!profile?.onboardingComplete,
    alreadyCompleted: wasAlreadyComplete,
  };
}

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

      const state = await readOnboardingState(userId);

      res.json({
        onboardingComplete: state.onboardingComplete,
        profileComplete: state.profileComplete,
        children: state.profile?.children ?? [],
        parent: state.profile?.parent ?? {},
        priorityGoal: state.profile?.priorityGoal ?? null,
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

      const result = await upsertOnboardingCompletion(userId, req.body);
      res.json({
        success: true,
        onboardingComplete: result.onboardingComplete,
        alreadyCompleted: result.alreadyCompleted,
      });
    },
    (_req, res) => {
      res.status(200).json({ ...ONBOARDING_SAVE_FALLBACK });
    },
  ),
);

router.post(
  "/onboarding/complete",
  safeRoute(
    "POST /onboarding/complete",
    async (req, res): Promise<void> => {
      const { userId } = getAuth(req);
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const result = await upsertOnboardingCompletion(userId, {
        ...req.body,
        onboardingComplete: true,
      });
      res.json({
        success: true,
        onboardingComplete: result.onboardingComplete,
        alreadyCompleted: result.alreadyCompleted,
      });
    },
    (_req, res) => {
      res.status(200).json({ ...ONBOARDING_SAVE_FALLBACK });
    },
  ),
);

export default router;
