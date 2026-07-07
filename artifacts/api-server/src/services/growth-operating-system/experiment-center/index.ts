import type { GrowthOsExperiment } from "../types.js";
import { appendActionLog, loadGrowthOsPayload, saveGrowthOsPayload } from "../store.js";

export async function listExperiments(): Promise<GrowthOsExperiment[]> {
  const payload = await loadGrowthOsPayload();
  return payload.experiments;
}

export async function upsertExperiment(
  input: Omit<GrowthOsExperiment, "createdAt" | "updatedAt" | "id"> & { id?: string },
  userId: string,
): Promise<GrowthOsExperiment> {
  const payload = await loadGrowthOsPayload();
  const now = new Date().toISOString();
  const id = input.id ?? `exp_${Date.now()}`;
  const existing = payload.experiments.find((e) => e.id === id);
  const experiment: GrowthOsExperiment = {
    id,
    name: input.name,
    feature: input.feature,
    startDate: input.startDate,
    endDate: input.endDate,
    variantA: input.variantA,
    variantB: input.variantB,
    usersA: input.usersA,
    usersB: input.usersB,
    winner: input.winner,
    confidence: input.confidence,
    businessImpact: input.businessImpact,
    status: input.status,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (existing) {
    payload.experiments = payload.experiments.map((e) => (e.id === id ? experiment : e));
  } else {
    payload.experiments = [experiment, ...payload.experiments];
  }
  await saveGrowthOsPayload(payload);
  await appendActionLog({
    userId,
    action: existing ? "experiment_updated" : "experiment_created",
    reason: experiment.name,
    outcome: null,
    entityType: "experiment",
    entityId: id,
  });
  return experiment;
}

export async function getExperimentCenterPayload() {
  const experiments = await listExperiments();
  const payload = await loadGrowthOsPayload();
  return {
    experiments,
    actionHistory: payload.actionHistory.filter((h) => h.entityType === "experiment").slice(0, 30),
  };
}
