export type ExperimentDimension = "copy" | "timing" | "journey" | "campaign";

export interface ExperimentDefinition {
  id: string;
  name: string;
  dimension: ExperimentDimension;
  variants: string[];
  /** Optimize for business outcome, not CTR. */
  primaryMetric: "outcome_rate" | "routine_completion" | "learning_completion" | "retention" | "conversion";
  active: boolean;
}

export const ACTIVE_EXPERIMENTS: ExperimentDefinition[] = [
  {
    id: "coach_copy_v1",
    name: "Coach-style copy vs generic",
    dimension: "copy",
    variants: ["coach", "generic"],
    primaryMetric: "outcome_rate",
    active: true,
  },
  {
    id: "smart_timing_v1",
    name: "Smart delivery hour shift",
    dimension: "timing",
    variants: ["shifted", "fixed"],
    primaryMetric: "routine_completion",
    active: true,
  },
  {
    id: "streak_recovery_journey_v1",
    name: "Streak recovery ladder",
    dimension: "journey",
    variants: ["ladder", "single_nudge"],
    primaryMetric: "retention",
    active: true,
  },
  {
    id: "reading_campaign_v1",
    name: "7-day reading campaign",
    dimension: "campaign",
    variants: ["campaign", "pool_only"],
    primaryMetric: "learning_completion",
    active: true,
  },
];

export function assignExperimentVariant(
  userId: string,
  experimentId: string,
  variants: string[],
): string {
  if (variants.length === 0) return "control";
  let h = 0;
  const s = `${userId}:${experimentId}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return variants[h % variants.length]!;
}

export function resolveExperiments(userId: string): Record<string, string> {
  const assignments: Record<string, string> = {};
  for (const exp of ACTIVE_EXPERIMENTS) {
    if (!exp.active) continue;
    assignments[exp.id] = assignExperimentVariant(userId, exp.id, exp.variants);
  }
  return assignments;
}

export function getExperiment(id: string): ExperimentDefinition | undefined {
  return ACTIVE_EXPERIMENTS.find((e) => e.id === id);
}

export interface ExperimentResult {
  experimentId: string;
  variant: string;
  sent: number;
  opened: number;
  outcomes: number;
  openRate: number;
  outcomeRate: number;
}

export function aggregateExperimentResults(
  rows: Array<{
    experimentId: string | null;
    experimentVariant: string | null;
    openedAt: Date | null;
    outcomeAt: Date | null;
  }>,
): ExperimentResult[] {
  const map = new Map<string, { sent: number; opened: number; outcomes: number }>();

  for (const r of rows) {
    if (!r.experimentId || !r.experimentVariant) continue;
    const key = `${r.experimentId}:${r.experimentVariant}`;
    const cur = map.get(key) ?? { sent: 0, opened: 0, outcomes: 0 };
    cur.sent++;
    if (r.openedAt) cur.opened++;
    if (r.outcomeAt) cur.outcomes++;
    map.set(key, cur);
  }

  return [...map.entries()].map(([key, v]) => {
    const [experimentId, variant] = key.split(":");
    return {
      experimentId: experimentId!,
      variant: variant!,
      sent: v.sent,
      opened: v.opened,
      outcomes: v.outcomes,
      openRate: v.sent > 0 ? v.opened / v.sent : 0,
      outcomeRate: v.sent > 0 ? v.outcomes / v.sent : 0,
    };
  });
}
