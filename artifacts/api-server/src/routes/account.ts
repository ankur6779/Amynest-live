import { Router, type IRouter } from "express";
import { eq, inArray, or } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { adminAuth } from "../lib/firebase-admin";
import {
  db,
  childrenTable,
  routinesTable,
  behaviorsTable,
  parentProfilesTable,
  babysittersTable,
  onboardingProfilesTable,
  subscriptionsTable,
  usageDailyTable,
  userProgressTable,
  userCoachSessionsTable,
  userAiMessagesTable,
  referralsTable,
} from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.delete("/account", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      const userChildren = await tx
        .select({ id: childrenTable.id })
        .from(childrenTable)
        .where(eq(childrenTable.userId, userId));
      const childIds = userChildren.map((c) => c.id);

      if (childIds.length > 0) {
        await tx.delete(routinesTable).where(inArray(routinesTable.childId, childIds));
        await tx.delete(behaviorsTable).where(inArray(behaviorsTable.childId, childIds));
      }

      await tx.delete(babysittersTable).where(eq(babysittersTable.userId, userId));
      await tx.delete(parentProfilesTable).where(eq(parentProfilesTable.userId, userId));
      await tx.delete(onboardingProfilesTable).where(eq(onboardingProfilesTable.userId, userId));
      await tx.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
      await tx.delete(usageDailyTable).where(eq(usageDailyTable.userId, userId));
      await tx.delete(userProgressTable).where(eq(userProgressTable.userId, userId));
      await tx.delete(userCoachSessionsTable).where(eq(userCoachSessionsTable.userId, userId));
      await tx.delete(userAiMessagesTable).where(eq(userAiMessagesTable.userId, userId));
      await tx.delete(referralsTable).where(
        or(
          eq(referralsTable.referrerUserId, userId),
          eq(referralsTable.referredUserId, userId),
        ),
      );

      await tx.delete(childrenTable).where(eq(childrenTable.userId, userId));
    });

    try {
      await adminAuth().deleteUser(userId);
    } catch (err) {
      logger.warn({ err, userId }, "Firebase user delete failed (data already wiped)");
    }

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, userId }, "Account deletion failed");
    res.status(500).json({ error: "Account deletion failed" });
  }
});

export default router;
