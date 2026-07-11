import type { KnowledgeBaseEntry } from "./types.js";
import type { GrowthOsKnowledgeBase } from "../growth-operating-system/types.js";
import type {
  DeployRegression,
  ExperimentDecision,
  FounderAction,
  MetricChange,
} from "./types.js";
import type { ObservatoryAlert } from "../growth-observatory/types.js";
import { loadGrowthOsPayload, saveGrowthOsPayload } from "../growth-operating-system/store.js";

const MAX_KB_ENTRIES = 200;

function entryId(prefix: string): string {
  return `kb_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function entriesFromOperations(input: {
  changes: MetricChange[];
  regressions: DeployRegression[];
  experiments: ExperimentDecision[];
  alerts: ObservatoryAlert[];
  actions: FounderAction[];
}): KnowledgeBaseEntry[] {
  const entries: KnowledgeBaseEntry[] = [];

  for (const alert of input.alerts.filter((a) => a.category === "critical")) {
    entries.push({
      id: entryId("incident"),
      at: new Date().toISOString(),
      type: "incident",
      title: alert.title,
      summary: alert.message,
      evidence: alert.evidence,
      outcome: null,
      tags: [alert.metric, "alert", alert.category],
    });
  }

  for (const reg of input.regressions.filter((r) => r.exceedsThreshold)) {
    entries.push({
      id: entryId("regression"),
      at: reg.releaseAt,
      type: "regression",
      title: `${reg.label} regression on v${reg.releaseVersion}`,
      summary: `${reg.changePct}% change post-release`,
      evidence: reg.evidence,
      outcome: null,
      tags: [reg.metric, reg.releaseVersion, "deploy"],
    });
  }

  for (const exp of input.experiments.filter((e) => e.decision === "ship" || e.decision === "rollback")) {
    entries.push({
      id: entryId("experiment"),
      at: new Date().toISOString(),
      type: exp.decision === "ship" ? "experiment_success" : "experiment_failure",
      title: `${exp.name}: ${exp.decision}`,
      summary: exp.recommendedAction,
      evidence: `Primary: ${exp.primaryMetric}, confidence ${exp.confidencePct ?? "—"}%`,
      outcome: exp.decision,
      tags: [exp.featureFlag ?? exp.id, exp.decision],
    });
  }

  for (const change of input.changes.filter((c) => c.meaningful && Math.abs(c.changeVs7dPct ?? 0) >= 20)) {
    entries.push({
      id: entryId("change"),
      at: new Date().toISOString(),
      type: "deployment",
      title: `Major change: ${change.label}`,
      summary: `${change.direction} ${change.changeVs7dPct}% vs 7d`,
      evidence: change.evidence,
      outcome: null,
      tags: [change.metric, change.category],
    });
  }

  return entries;
}

export function mergeKnowledgeBase(
  existing: GrowthOsKnowledgeBase[],
  incoming: KnowledgeBaseEntry[],
): GrowthOsKnowledgeBase[] {
  const seen = new Set(existing.map((e) => `${e.type}:${e.title}:${e.at.slice(0, 10)}`));
  const merged = [...existing];
  for (const entry of incoming) {
    const key = `${entry.type}:${entry.title}:${entry.at.slice(0, 10)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.unshift(entry);
  }
  return merged.slice(0, MAX_KB_ENTRIES);
}

export async function persistKnowledgeBase(incoming: KnowledgeBaseEntry[]): Promise<KnowledgeBaseEntry[]> {
  const payload = await loadGrowthOsPayload();
  payload.knowledgeBase = mergeKnowledgeBase(payload.knowledgeBase ?? [], incoming);
  await saveGrowthOsPayload(payload);
  return payload.knowledgeBase as KnowledgeBaseEntry[];
}

export function filterKnowledgeForRecommendations(
  kb: KnowledgeBaseEntry[],
  tags: string[],
): KnowledgeBaseEntry[] {
  return kb.filter((e) => tags.some((t) => e.tags.includes(t))).slice(0, 5);
}

export function avoidRepeatedFailures(
  kb: KnowledgeBaseEntry[],
  proposedTitle: string,
): string | null {
  const failed = kb.filter((e) => e.type === "experiment_failure" || e.type === "regression");
  const similar = failed.find((e) =>
    proposedTitle.toLowerCase().includes(e.title.toLowerCase().slice(0, 20)),
  );
  if (similar) {
    return `Previously attempted (${similar.at.slice(0, 10)}): ${similar.summary} — review before repeating.`;
  }
  return null;
}
