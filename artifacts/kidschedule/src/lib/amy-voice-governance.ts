/**
 * Amy voice experiment governance — promotion rules, audit trail, safe evolution.
 */

import type {
  AmyVoiceExperimentAssignment,
  AmyVoiceExperimentId,
} from "@/lib/amy-voice-experiments";

export const EXPERIMENT_PROMOTION_RULES = {
  /** Variant must beat control by at least 8% on composite score. */
  minImprovementRatio: 0.08,
  /** Minimum speaks per evaluation window for control and variant. */
  minSamplePerWindow: 25,
  /** Require improvement across this many consecutive evaluation windows. */
  sustainedWindows: 3,
  /** Evaluate promotions every N experiment outcomes recorded. */
  evaluationIntervalSpeaks: 20,
} as const;

export type ExperimentAuditDecision = "promoted" | "rejected" | "pending";

export type ExperimentAuditEntry = {
  at: number;
  experiment: AmyVoiceExperimentId;
  fromVariant: string;
  toVariant: string;
  decision: ExperimentAuditDecision;
  reason: string;
  improvementRatio: number | null;
  controlSample: number;
  variantSample: number;
  sustainedWindows: number;
};

export type ExperimentPromotionStatus = {
  experiment: AmyVoiceExperimentId;
  promotedVariant: string | null;
  pendingVariant: string | null;
  lastEvaluationAt: number | null;
};

type WindowMetrics = {
  at: number;
  speaks: number;
  avgReplayCount: number;
  fallbackRate: number;
  compositeScore: number;
  improvementVsControl: number | null;
};

const PROMOTED_STORAGE_KEY = "amynest:amy-voice-promoted-v1";
const AUDIT_STORAGE_KEY = "amynest:amy-voice-experiment-audit-v1";

const windowHistory = new Map<string, WindowMetrics[]>();
const auditLog: ExperimentAuditEntry[] = [];
let promotedVariants: Partial<AmyVoiceExperimentAssignment> = {};
let outcomesSinceEvaluation = 0;

function compositeScore(avgReplayCount: number, fallbackRate: number): number {
  return avgReplayCount * 0.55 + fallbackRate * 2.2;
}

function improvementRatio(controlScore: number, variantScore: number): number {
  if (controlScore <= 0) return 0;
  return (controlScore - variantScore) / controlScore;
}

function windowKey(experiment: AmyVoiceExperimentId, variant: string): string {
  return `${experiment}:${variant}`;
}

function loadPromotedVariants(): Partial<AmyVoiceExperimentAssignment> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROMOTED_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<AmyVoiceExperimentAssignment>) : {};
  } catch {
    return {};
  }
}

function persistPromotedVariants(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PROMOTED_STORAGE_KEY, JSON.stringify(promotedVariants));
  } catch {
    /* ignore */
  }
}

function loadAuditLog(): ExperimentAuditEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ExperimentAuditEntry[]) : [];
  } catch {
    return [];
  }
}

function persistAuditLog(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(auditLog.slice(-40)));
  } catch {
    /* ignore */
  }
}

function recordAudit(entry: ExperimentAuditEntry): void {
  auditLog.push(entry);
  if (auditLog.length > 40) auditLog.shift();
  persistAuditLog();
  if (import.meta.env.DEV) {
    console.info("[AMY VOICE]", "experiment_audit", entry);
  }
}

function pushWindowMetrics(
  experiment: AmyVoiceExperimentId,
  variant: string,
  metrics: Omit<WindowMetrics, "improvementVsControl"> & { improvementVsControl?: number | null },
): void {
  const key = windowKey(experiment, variant);
  const history = windowHistory.get(key) ?? [];
  history.push({
    at: metrics.at,
    speaks: metrics.speaks,
    avgReplayCount: metrics.avgReplayCount,
    fallbackRate: metrics.fallbackRate,
    compositeScore: metrics.compositeScore,
    improvementVsControl: metrics.improvementVsControl ?? null,
  });
  while (history.length > EXPERIMENT_PROMOTION_RULES.sustainedWindows) {
    history.shift();
  }
  windowHistory.set(key, history);
}

function sustainedImprovement(history: WindowMetrics[]): boolean {
  if (history.length < EXPERIMENT_PROMOTION_RULES.sustainedWindows) return false;
  return history.every(
    (window) =>
      window.improvementVsControl != null &&
      window.improvementVsControl >= EXPERIMENT_PROMOTION_RULES.minImprovementRatio,
  );
}

function evaluateExperimentPromotion(
  experiment: AmyVoiceExperimentId,
  results: Array<{
    experiment: AmyVoiceExperimentId;
    variant: string;
    speaks: number;
    avgReplayCount: number;
    avgDurationMs: number;
    fallbackRate: number;
  }>,
): void {
  const control = results.find((r) => r.experiment === experiment && r.variant === "control");
  if (!control || control.speaks < EXPERIMENT_PROMOTION_RULES.minSamplePerWindow) return;

  const controlScore = compositeScore(control.avgReplayCount, control.fallbackRate);

  for (const row of results) {
    if (row.experiment !== experiment || row.variant === "control") continue;
    if (row.speaks < EXPERIMENT_PROMOTION_RULES.minSamplePerWindow) continue;

    const variantScore = compositeScore(row.avgReplayCount, row.fallbackRate);
    const improvement = improvementRatio(controlScore, variantScore);

    pushWindowMetrics(experiment, row.variant, {
      at: Date.now(),
      speaks: row.speaks,
      avgReplayCount: row.avgReplayCount,
      fallbackRate: row.fallbackRate,
      compositeScore: variantScore,
      improvementVsControl: improvement,
    });

    const history = windowHistory.get(windowKey(experiment, row.variant)) ?? [];
    const currentVariant = promotedVariants[experiment] ?? "control";

    if (sustainedImprovement(history)) {
      promotedVariants = { ...promotedVariants, [experiment]: row.variant };
      persistPromotedVariants();
      recordAudit({
        at: Date.now(),
        experiment,
        fromVariant: currentVariant,
        toVariant: row.variant,
        decision: "promoted",
        reason: `Sustained ${Math.round(improvement * 100)}% improvement over control`,
        improvementRatio: improvement,
        controlSample: control.speaks,
        variantSample: row.speaks,
        sustainedWindows: history.length,
      });
      continue;
    }

    if (history.length >= EXPERIMENT_PROMOTION_RULES.sustainedWindows) {
      recordAudit({
        at: Date.now(),
        experiment,
        fromVariant: currentVariant,
        toVariant: row.variant,
        decision: "rejected",
        reason:
          improvement < EXPERIMENT_PROMOTION_RULES.minImprovementRatio
            ? "Improvement below 8% threshold"
            : "Improvement not sustained across evaluation windows",
        improvementRatio: improvement,
        controlSample: control.speaks,
        variantSample: row.speaks,
        sustainedWindows: history.length,
      });
    } else {
      recordAudit({
        at: Date.now(),
        experiment,
        fromVariant: currentVariant,
        toVariant: row.variant,
        decision: "pending",
        reason: "Collecting sustained evaluation windows",
        improvementRatio: improvement,
        controlSample: control.speaks,
        variantSample: row.speaks,
        sustainedWindows: history.length,
      });
    }
  }
}

/** Promoted defaults merged into live experiment assignment — cannot bypass invariants. */
export function getPromotedExperimentVariants(): Partial<AmyVoiceExperimentAssignment> {
  bootstrapAmyVoiceGovernanceForRuntime();
  return { ...promotedVariants };
}

/** @alias getPromotedExperimentVariants */
export const getPromotedVariants = getPromotedExperimentVariants;

export function evaluateExperimentGovernanceFromResults(
  results: Array<{
    experiment: AmyVoiceExperimentId;
    variant: string;
    speaks: number;
    avgReplayCount: number;
    avgDurationMs: number;
    fallbackRate: number;
  }>,
): void {
  const experiments: AmyVoiceExperimentId[] = [
    "encouragement_frequency",
    "pacing",
    "instruction_style",
  ];
  for (const experiment of experiments) {
    evaluateExperimentPromotion(experiment, results);
  }
}

export function maybeEvaluateExperimentGovernance(
  results: Array<{
    experiment: AmyVoiceExperimentId;
    variant: string;
    speaks: number;
    avgReplayCount: number;
    avgDurationMs: number;
    fallbackRate: number;
  }>,
): void {
  outcomesSinceEvaluation += 1;
  if (outcomesSinceEvaluation < EXPERIMENT_PROMOTION_RULES.evaluationIntervalSpeaks) return;
  outcomesSinceEvaluation = 0;
  evaluateExperimentGovernanceFromResults(results);
}

/** @alias maybeEvaluateExperimentGovernance */
export const maybeEvaluateExperimentPromotion = maybeEvaluateExperimentGovernance;

export function getExperimentAuditLog(limit = 20): ExperimentAuditEntry[] {
  bootstrapAmyVoiceGovernanceForRuntime();
  return auditLog.slice(-limit);
}

export function getExperimentPromotionStatuses(): ExperimentPromotionStatus[] {
  const promoted = getPromotedExperimentVariants();
  return (["encouragement_frequency", "pacing", "instruction_style"] as AmyVoiceExperimentId[]).map(
    (experiment) => {
      const history = [...windowHistory.entries()]
        .filter(([key]) => key.startsWith(`${experiment}:`) && !key.endsWith(":control"))
        .flatMap(([, windows]) => windows);
      const last = history[history.length - 1];
      return {
        experiment,
        promotedVariant: promoted[experiment] ?? null,
        pendingVariant:
          last && last.improvementVsControl != null && last.improvementVsControl > 0
            ? last.improvementVsControl >= EXPERIMENT_PROMOTION_RULES.minImprovementRatio
              ? promoted[experiment] ?? null
              : null
            : null,
        lastEvaluationAt: last?.at ?? null,
      };
    },
  );
}

export function getAmyVoiceGovernanceSnapshot(): {
  promotionRules: typeof EXPERIMENT_PROMOTION_RULES;
  promotedVariants: Partial<AmyVoiceExperimentAssignment>;
  promotionStatuses: ExperimentPromotionStatus[];
  recentAudit: ExperimentAuditEntry[];
} {
  return {
    promotionRules: EXPERIMENT_PROMOTION_RULES,
    promotedVariants: getPromotedExperimentVariants(),
    promotionStatuses: getExperimentPromotionStatuses(),
    recentAudit: getExperimentAuditLog(10),
  };
}

export function resetAmyVoiceGovernanceForTests(): void {
  windowHistory.clear();
  auditLog.length = 0;
  promotedVariants = {};
  outcomesSinceEvaluation = 0;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(PROMOTED_STORAGE_KEY);
      localStorage.removeItem(AUDIT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function bootstrapAmyVoiceGovernanceForRuntime(): void {
  if (typeof window === "undefined") return;
  if (auditLog.length === 0) auditLog.push(...loadAuditLog());
  if (Object.keys(promotedVariants).length === 0) {
    promotedVariants = loadPromotedVariants();
  }
}
