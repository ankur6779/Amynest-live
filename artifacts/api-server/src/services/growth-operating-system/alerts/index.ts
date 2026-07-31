import type { GrowthAlert } from "../../growth-dashboard/types.js";
import type { GrowthOsAlertWorkflow } from "../types.js";
import { appendActionLog, loadGrowthOsPayload, saveGrowthOsPayload } from "../store.js";

function mapAlert(alert: GrowthAlert, existing?: GrowthOsAlertWorkflow): GrowthOsAlertWorkflow {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? `aw_${alert.id}`,
    alertId: alert.id,
    priority: alert.category,
    title: alert.title,
    description: alert.message,
    rootCause: existing?.rootCause ?? null,
    suggestedFix: existing?.suggestedFix ?? null,
    owner: existing?.owner ?? null,
    status: existing?.status ?? "open",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    history: existing?.history ?? [],
  };
}

function mergeAlertWorkflows(
  alerts: GrowthAlert[],
  existingWorkflows: GrowthOsAlertWorkflow[],
): GrowthOsAlertWorkflow[] {
  const byId = new Map(existingWorkflows.map((a) => [a.alertId, a]));
  const merged = alerts.map((a) => mapAlert(a, byId.get(a.id)));
  const preserved = existingWorkflows.filter((a) => !alerts.some((x) => x.id === a.alertId));
  return [...merged, ...preserved];
}

export async function syncAlertWorkflows(alerts: GrowthAlert[]): Promise<GrowthOsAlertWorkflow[]> {
  const payload = await loadGrowthOsPayload();
  const knownAlertIds = new Set(payload.alertWorkflows.map((a) => a.alertId));
  const hasNew = alerts.some((a) => !knownAlertIds.has(a.id));

  if (!hasNew) {
    return mergeAlertWorkflows(alerts, payload.alertWorkflows);
  }

  const fresh = await loadGrowthOsPayload();
  fresh.alertWorkflows = mergeAlertWorkflows(alerts, fresh.alertWorkflows);
  await saveGrowthOsPayload(fresh);
  return fresh.alertWorkflows;
}

export async function updateAlertWorkflow(input: {
  workflowId: string;
  userId: string;
  status?: GrowthOsAlertWorkflow["status"];
  owner?: string | null;
  rootCause?: string | null;
  suggestedFix?: string | null;
  note?: string;
}): Promise<GrowthOsAlertWorkflow | null> {
  const payload = await loadGrowthOsPayload();
  const idx = payload.alertWorkflows.findIndex((a) => a.id === input.workflowId);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  const prev = payload.alertWorkflows[idx]!;
  const updated: GrowthOsAlertWorkflow = {
    ...prev,
    status: input.status ?? prev.status,
    owner: input.owner !== undefined ? input.owner : prev.owner,
    rootCause: input.rootCause !== undefined ? input.rootCause : prev.rootCause,
    suggestedFix: input.suggestedFix !== undefined ? input.suggestedFix : prev.suggestedFix,
    updatedAt: now,
    history: [
      {
        at: now,
        by: input.userId,
        action: input.status ? `status_${input.status}` : "updated",
        note: input.note ?? null,
      },
      ...prev.history,
    ].slice(0, 50),
  };
  payload.alertWorkflows[idx] = updated;
  await saveGrowthOsPayload(payload);

  await appendActionLog({
    userId: input.userId,
    action: input.status ? `alert_${input.status}` : "alert_updated",
    reason: input.note ?? null,
    outcome: updated.title,
    entityType: "alert",
    entityId: input.workflowId,
  });

  return updated;
}

export async function getAlertsWorkflowPayload(alerts: GrowthAlert[]) {
  const workflows = await syncAlertWorkflows(alerts);
  const payload = await loadGrowthOsPayload();
  return {
    workflows,
    actionHistory: payload.actionHistory.filter((h) => h.entityType === "alert").slice(0, 50),
  };
}
