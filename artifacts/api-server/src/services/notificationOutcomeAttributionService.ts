import { and, desc, eq } from "drizzle-orm";
import {
  db,
  notificationLogTable,
  notificationOutcomeEventsTable,
} from "@workspace/db";
import {
  attributeOutcome,
  type OutcomeEventType,
} from "@workspace/notification-engine";
import { logger } from "../lib/logger.js";

/**
 * Record a downstream business outcome and attribute it to a recent notification.
 */
export async function recordNotificationOutcome(
  userId: string,
  outcomeEvent: OutcomeEventType,
  options: {
    notificationLogId?: number;
    outcomeAt?: Date;
  } = {},
): Promise<{ attributed: boolean; notificationLogId: number | null }> {
  const outcomeAt = options.outcomeAt ?? new Date();

  let logRow: typeof notificationLogTable.$inferSelect | undefined;

  if (options.notificationLogId) {
    [logRow] = await db
      .select()
      .from(notificationLogTable)
      .where(
        and(
          eq(notificationLogTable.id, options.notificationLogId),
          eq(notificationLogTable.userId, userId),
        ),
      )
      .limit(1);
  } else {
    [logRow] = await db
      .select()
      .from(notificationLogTable)
      .where(
        and(
          eq(notificationLogTable.userId, userId),
          eq(notificationLogTable.status, "sent"),
        ),
      )
      .orderBy(desc(notificationLogTable.sentAt))
      .limit(1);
  }

  if (!logRow) {
    return { attributed: false, notificationLogId: null };
  }

  const attribution = attributeOutcome({
    notificationLogId: logRow.id,
    userId,
    sentAt: logRow.sentAt,
    openedAt: logRow.openedAt,
    outcomeEvent,
    outcomeAt,
  });

  await db.insert(notificationOutcomeEventsTable).values({
    notificationLogId: logRow.id,
    userId,
    outcomeEvent,
    outcomeAt,
    attributed: attribution.attributed,
    attributionWindowHours: attribution.attributionWindowHours,
  });

  logger.info(
    { userId, outcomeEvent, notificationLogId: logRow.id, attributed: attribution.attributed },
    "Notification outcome recorded",
  );

  if (attribution.attributed) {
    const { bridgeNotificationOutcome } = await import("./realityValidationService.js");
    void bridgeNotificationOutcome(userId, outcomeEvent, logRow.id).catch(() => {});
  }

  return { attributed: attribution.attributed, notificationLogId: logRow.id };
}

export async function advanceCampaignStep(
  userId: string,
  campaignId: string,
  stepDay: number,
): Promise<void> {
  const { notificationCampaignProgressTable } = await import("@workspace/db");
  const [existing] = await db
    .select()
    .from(notificationCampaignProgressTable)
    .where(
      and(
        eq(notificationCampaignProgressTable.userId, userId),
        eq(notificationCampaignProgressTable.campaignId, campaignId),
      ),
    )
    .limit(1);

  const now = new Date();
  const stepKey = String(stepDay);

  if (existing) {
    const steps = { ...existing.stepCompletedAt, [stepKey]: now.toISOString() };
    await db
      .update(notificationCampaignProgressTable)
      .set({
        currentStep: existing.currentStep + 1,
        stepCompletedAt: steps,
        updatedAt: now,
      })
      .where(eq(notificationCampaignProgressTable.id, existing.id));
  } else {
    await db.insert(notificationCampaignProgressTable).values({
      userId,
      campaignId,
      currentStep: 2,
      stepCompletedAt: { [stepKey]: now.toISOString() },
    });
  }
}
