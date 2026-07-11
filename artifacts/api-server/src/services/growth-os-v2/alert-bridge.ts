import type { ObservatoryAlert } from "../growth-observatory/types.js";
import type { GrowthOsAlertWorkflow } from "../growth-operating-system/types.js";
import { loadGrowthOsPayload, saveGrowthOsPayload } from "../growth-operating-system/store.js";
import type { EvidenceChain } from "./types.js";

function mapObservatoryAlert(
  alert: ObservatoryAlert,
  correlation: EvidenceChain | undefined,
  existing?: GrowthOsAlertWorkflow,
): GrowthOsAlertWorkflow {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? `aw_obs_${alert.id}`,
    alertId: alert.id,
    priority: alert.category,
    title: alert.title,
    description: alert.message,
    rootCause: existing?.rootCause ?? correlation?.hypothesis ?? null,
    suggestedFix:
      existing?.suggestedFix ?? correlation?.recommendedInvestigation ?? `Evidence: ${alert.evidence}`,
    owner: existing?.owner ?? null,
    status: existing?.status ?? "open",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    history: existing?.history ?? [],
  };
}

export async function syncObservatoryAlertWorkflows(input: {
  alerts: ObservatoryAlert[];
  correlations: EvidenceChain[];
}): Promise<GrowthOsAlertWorkflow[]> {
  const payload = await loadGrowthOsPayload();
  const byId = new Map(payload.alertWorkflows.map((a) => [a.alertId, a]));

  const merged = input.alerts.map((alert) => {
    const corr = input.correlations.find((c) =>
      c.triggerMetric === alert.metric || c.chain.some((l) => l.metric === alert.metric),
    );
    return mapObservatoryAlert(alert, corr, byId.get(alert.id));
  });

  const preserved = payload.alertWorkflows.filter(
    (a) => !input.alerts.some((x) => x.id === a.alertId),
  );
  payload.alertWorkflows = [...merged, ...preserved];
  await saveGrowthOsPayload(payload);
  return payload.alertWorkflows;
}
