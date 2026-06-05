/**
 * Evidence-backed personalization strength — gates memory / continuity language.
 */
import type { PersonalizationMemory } from "./routine-personalization-memory.js";

export type EvidenceStrength = "NONE" | "LOW" | "MEDIUM" | "HIGH";

export type GenerationSource = "ai" | "hybrid" | "fallback";

export type EvidenceInput = {
  childId?: string;
  memory?: Pick<
    PersonalizationMemory,
    | "snapshotCount"
    | "completedActivityKeys"
    | "completionRate"
    | "recentDayKeys"
  >;
  continuityAdjustments?: number;
  freshnessAdjustments?: number;
};

/**
 * Derive how strongly we can claim memory / pattern recognition.
 *
 * HIGH requires both persisted routine history AND completed activity evidence.
 * MEDIUM requires meaningful completion OR multi-day persisted history with completions.
 */
export function calculateEvidenceStrength(input: EvidenceInput): EvidenceStrength {
  if (!input.childId) return "NONE";

  const snapshots = input.memory?.snapshotCount ?? 0;
  const completedKeys = input.memory?.completedActivityKeys?.length ?? 0;
  const completionRate = input.memory?.completionRate ?? 0;
  const distinctDays =
    input.memory?.recentDayKeys?.filter((k) => k.length > 0).length ?? 0;

  const hasCompletionEvidence = completedKeys >= 3;
  const hasPersistedHistory = snapshots >= 2 && distinctDays >= 2;

  if (
    snapshots >= 5 &&
    completedKeys >= 12 &&
    completionRate >= 0.35 &&
    hasPersistedHistory &&
    hasCompletionEvidence
  ) {
    return "HIGH";
  }

  if (
    hasCompletionEvidence &&
    (snapshots >= 3 || completedKeys >= 8)
  ) {
    return "MEDIUM";
  }

  if (snapshots >= 1 || completedKeys >= 1) {
    return "LOW";
  }

  return "NONE";
}

/** Whether continuity / "building on recent days" language is evidence-backed. */
export function hasContinuityEvidence(input: EvidenceInput): boolean {
  const strength = calculateEvidenceStrength(input);
  if (strength === "HIGH" || strength === "MEDIUM") return true;
  const completed = input.memory?.completedActivityKeys?.length ?? 0;
  const snapshots = input.memory?.snapshotCount ?? 0;
  return completed >= 5 && snapshots >= 2;
}

export function memoryClaimForStrength(strength: EvidenceStrength): string | null {
  switch (strength) {
    case "HIGH":
      return "Amy remembers what tends to work for your family — familiar anchors stay, with small refreshes.";
    case "MEDIUM":
      return "Amy is noticing patterns from recent days and adjusting gently.";
    case "LOW":
      return "Amy is learning your family's rhythm — each saved day adds context.";
    default:
      return null;
  }
}

export function continuityClaimForEvidence(input: EvidenceInput): string {
  if (hasContinuityEvidence(input)) {
    const days = Math.min(input.memory?.snapshotCount ?? 0, 14);
    return `Amy is building on ${days} recent day${days === 1 ? "" : "s"} with your family — familiar anchors stay, with small refreshes.`;
  }
  return "Amy is still learning what works best for your family.";
}

export function buildGenerationTransparencyMessage(
  source: GenerationSource,
): string {
  switch (source) {
    case "ai":
      return "Amy created a personalized routine.";
    case "hybrid":
      return "Amy combined personalized planning with trusted fallback logic.";
    case "fallback":
      return "Amy generated a simplified routine instantly.";
    default:
      return "Amy created today's routine.";
  }
}

export function resolveGenerationSource(opts: {
  aiAttempted?: boolean;
  fallback?: boolean;
  reverted?: boolean;
}): GenerationSource {
  if (opts.fallback || opts.reverted) return "fallback";
  if (opts.aiAttempted) return "hybrid";
  return "ai";
}
