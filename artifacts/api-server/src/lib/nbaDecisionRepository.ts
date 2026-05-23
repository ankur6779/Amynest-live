import type { NbaDecisionLog } from "@workspace/content-orchestration";
import { db, nbaDecisionLogsTable } from "@workspace/db";

export async function persistNbaDecisionLog(
  log: NbaDecisionLog,
  userId?: string,
): Promise<void> {
  const childId = Number(log.childId);
  if (!Number.isFinite(childId)) return;

  await db.insert(nbaDecisionLogsTable).values({
    childId,
    userId: userId ?? null,
    timestamp: new Date(log.timestamp),
    features: log.features,
    normalizedFeatures: log.normalizedFeatures,
    actionTaken: log.actionTaken,
    mappedAction: log.mappedAction,
    source: log.source,
    confidence: log.confidence,
    rewardEstimate: log.rewardEstimate ?? null,
    outcome: log.outcome ?? null,
    reward: log.reward ?? null,
  });
}
