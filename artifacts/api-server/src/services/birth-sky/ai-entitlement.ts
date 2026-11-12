/**
 * Birth Sky AI entitlement (Pack 2 + Addenda A/B).
 *
 * Free insight is consumed when a successful assistant delivery is persisted
 * server-side (stream `complete` path). Client ACK remains idempotent for UI
 * sync — it must never be the sole authority, or free users can skip ACK and
 * burn unlimited OpenAI cost.
 */

import { and, eq, isNull, sql } from "drizzle-orm";
import {
  db,
  birthProfilesTable,
  birthSkyAiDeliveriesTable,
} from "@workspace/db";
import { getOrCreateSubscription } from "../subscriptionService.js";
import { isPremiumNow } from "../subscription-premium-gate.js";

export type BirthSkyAiGate =
  | { allowed: true; isPremium: boolean; aiInsightsUsedCount: number }
  | {
      allowed: false;
      reason: "paywall" | "profile_not_found";
      isPremium: boolean;
      aiInsightsUsedCount: number;
    };

/** Only a successfully delivered (non-moderated) assistant turn consumes the free insight. */
export function shouldServerConsumeFreeInsightOnDelivery(
  assistantStatus: "complete" | "moderated" | "error" | "cancelled" | "timeout" | "failed",
): boolean {
  return assistantStatus === "complete";
}

export async function evaluateBirthSkyAiGate(
  userId: string,
  profileId: string,
): Promise<BirthSkyAiGate> {
  const profiles = await db
    .select()
    .from(birthProfilesTable)
    .where(
      and(
        eq(birthProfilesTable.id, profileId),
        eq(birthProfilesTable.userId, userId),
        isNull(birthProfilesTable.deletedAt),
      ),
    )
    .limit(1);
  const profile = profiles[0];
  if (!profile) {
    return {
      allowed: false,
      reason: "profile_not_found",
      isPremium: false,
      aiInsightsUsedCount: 0,
    };
  }

  const sub = await getOrCreateSubscription(userId);
  const premium = isPremiumNow(sub);
  const count = profile.aiInsightsUsedCount ?? 0;

  if (premium || count < 1) {
    return { allowed: true, isPremium: premium, aiInsightsUsedCount: count };
  }
  return {
    allowed: false,
    reason: "paywall",
    isPremium: false,
    aiInsightsUsedCount: count,
  };
}

export type AckDeliveryResult = {
  ok: true;
  aiInsightsUsedCount: number;
  consumedFreeInsight: boolean;
  alreadyAcked: boolean;
  isPremium: boolean;
};

/**
 * Idempotent delivery acknowledgment. Increments free count at most once per deliveryId.
 * Safe to call from the stream success path and again from the client ACK endpoint.
 */
export async function ackBirthSkyDelivery(input: {
  userId: string;
  profileId: string;
  conversationId: string;
  jobId: string;
  deliveryId: string;
}): Promise<AckDeliveryResult | { ok: false; error: string }> {
  const gate = await evaluateBirthSkyAiGate(input.userId, input.profileId);
  if (!gate.allowed && gate.reason === "profile_not_found") {
    return { ok: false, error: "profile_not_found" };
  }

  const existing = await db
    .select()
    .from(birthSkyAiDeliveriesTable)
    .where(eq(birthSkyAiDeliveriesTable.deliveryId, input.deliveryId))
    .limit(1);

  if (existing[0]) {
    const profiles = await db
      .select({ count: birthProfilesTable.aiInsightsUsedCount })
      .from(birthProfilesTable)
      .where(eq(birthProfilesTable.id, input.profileId))
      .limit(1);
    return {
      ok: true,
      alreadyAcked: true,
      consumedFreeInsight: existing[0].consumedFreeInsight,
      aiInsightsUsedCount: profiles[0]?.count ?? 0,
      isPremium: gate.isPremium,
    };
  }

  let consumed = false;
  let nextCount = gate.aiInsightsUsedCount;

  if (!gate.isPremium && gate.aiInsightsUsedCount < 1) {
    // Conditional update so concurrent ack/stream completions cannot both "consume".
    const claimed = await db
      .update(birthProfilesTable)
      .set({
        aiInsightsUsedCount: 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(birthProfilesTable.id, input.profileId),
          sql`COALESCE(${birthProfilesTable.aiInsightsUsedCount}, 0) < 1`,
        ),
      )
      .returning({ id: birthProfilesTable.id });
    if (claimed.length > 0) {
      consumed = true;
      nextCount = 1;
    } else {
      const profiles = await db
        .select({ count: birthProfilesTable.aiInsightsUsedCount })
        .from(birthProfilesTable)
        .where(eq(birthProfilesTable.id, input.profileId))
        .limit(1);
      nextCount = profiles[0]?.count ?? 1;
    }
  }

  await db.insert(birthSkyAiDeliveriesTable).values({
    deliveryId: input.deliveryId,
    profileId: input.profileId,
    userId: input.userId,
    conversationId: input.conversationId,
    jobId: input.jobId,
    consumedFreeInsight: consumed,
  });

  return {
    ok: true,
    alreadyAcked: false,
    consumedFreeInsight: consumed,
    aiInsightsUsedCount: nextCount,
    isPremium: gate.isPremium,
  };
}
