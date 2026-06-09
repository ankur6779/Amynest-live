import type { AiJobRecord } from "../queue/types.js";
import { unwrapJobPayload } from "../queue/ai-job-payload.js";
import { resolveInfantAiQuotaFromDb } from "../lib/infant-child-access.js";
import {
  getOrCreateSubscription,
  incrementFeatureUsage,
  isPremiumNow,
  type FeatureKey,
} from "./subscriptionService.js";
import { logger } from "../lib/logger.js";

/** Refund one assistant-ai quota unit when a reserved async job does not succeed. */
export async function refundAssistantAiQuota(
  userId: string,
  pollContext: unknown,
): Promise<void> {
  if (!userId || userId === "anonymous") return;

  const sub = await getOrCreateSubscription(userId);
  if (isPremiumNow(sub)) return;

  const isInfantContext = await resolveInfantAiQuotaFromDb(userId, pollContext);
  const feature: FeatureKey = isInfantContext ? "infant_ai_query" : "ai_query";
  await incrementFeatureUsage(userId, feature, -1);
}

export async function refundAssistantAiQuotaFromJob(job: AiJobRecord): Promise<void> {
  const { routeName, pollContext } = unwrapJobPayload(job.payload);
  if (routeName !== "ai/assistant-ai") return;

  const ctx = (pollContext ?? {}) as { userId?: string };
  const userId = ctx.userId ?? job.userId;
  if (!userId || userId === "anonymous") return;

  try {
    await refundAssistantAiQuota(userId, pollContext);
  } catch (err) {
    logger.warn(
      {
        evt: "assistant_ai.quota_refund_failed",
        jobId: job.id,
        userId,
        message: err instanceof Error ? err.message : String(err),
      },
      "assistant-ai quota refund failed",
    );
  }
}
