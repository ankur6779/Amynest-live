import { getCached, setCached, cacheKey, rangeKey } from "../growth-dashboard/cache.js";
import { computeGrowthDashboard } from "../growth-dashboard/index.js";
import { computeGrowthObservatory } from "../growth-observatory/index.js";
import { detectMeaningfulChanges } from "./change-detection.js";
import { buildEvidenceChains } from "./correlation-engine.js";
import { rankOpportunities } from "./priority-scoring.js";
import { detectDeployRegressions } from "./regression-intelligence.js";
import { decideExperiments } from "./experiment-decisions.js";
import { buildFounderActionQueue } from "./action-queue.js";
import { buildWeeklyExecutiveReview } from "./weekly-brief.js";
import { entriesFromOperations, persistKnowledgeBase } from "./knowledge-base.js";
import { syncObservatoryAlertWorkflows } from "./alert-bridge.js";
import type { GrowthOperationsPayload } from "./types.js";

export async function computeGrowthOperations(input: {
  preset?: string;
  start?: string;
  end?: string;
  persistKnowledge?: boolean;
}): Promise<GrowthOperationsPayload> {
  const observatory = await computeGrowthObservatory(input);
  const key = cacheKey("growth-operations", rangeKey(observatory.timeRange.start, observatory.timeRange.end));
  const cached = getCached<GrowthOperationsPayload>(key);
  if (cached) return cached;

  const dashboard = await computeGrowthDashboard(input);

  const changes = detectMeaningfulChanges({ observatory, dashboard });
  const correlations = buildEvidenceChains({ observatory, dashboard, changes });
  const opportunities = rankOpportunities(observatory);
  const regressions = await detectDeployRegressions();
  const experiments = decideExperiments(observatory.experiments);

  const actionQueue = buildFounderActionQueue({
    changes,
    correlations,
    opportunities,
    regressions,
    experiments,
    alerts: observatory.alerts,
  });

  const weeklyReview = buildWeeklyExecutiveReview({
    observatory,
    dashboard,
    changes,
    regressions,
    experiments,
    actionQueue,
  });

  const kbIncoming = entriesFromOperations({
    changes,
    regressions,
    experiments,
    alerts: observatory.alerts,
    actions: actionQueue,
  });

  const knowledgeBase = input.persistKnowledge
    ? await persistKnowledgeBase(kbIncoming)
    : kbIncoming;

  if (input.persistKnowledge) {
    await syncObservatoryAlertWorkflows({
      alerts: observatory.alerts,
      correlations,
    });
  }

  const payload: GrowthOperationsPayload = {
    generatedAt: new Date().toISOString(),
    timeRange: observatory.timeRange,
    changes,
    correlations,
    opportunities,
    regressions,
    experiments,
    actionQueue,
    weeklyReview,
    knowledgeBase,
    dataQuality: {
      gaps: observatory.dataGaps,
      sampleWarnings: changes
        .filter((c) => c.status !== "verified")
        .map((c) => `${c.label}: ${c.status}`),
    },
  };

  setCached(key, payload);
  return payload;
}

export type { GrowthOperationsPayload } from "./types.js";
export { buildWeeklyExecutiveReview } from "./weekly-brief.js";
