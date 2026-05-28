/**
 * Parent-facing intelligence visibility — insights and memory without internal jargon.
 */
import type { AdaptiveCompletionSummary } from "./routine-adaptive-completion.js";
import type { FamilyIntelligenceMoatResult } from "./routine-family-intelligence-moat.js";

export type IntelligenceTier = "full" | "simplified" | "baseline";

const ENGINE_REASON_PREFIX =
  /^(emotion|continuity|freshness|autonomy|memory|optimize|dailyload|daily load|load balance)(?:\([^)]*\))?:\s*/i;

/** Map scheduleDecision / pass reasons to parent-natural copy. */
export function toParentScheduleReason(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "Placed to fit today's rhythm.";

  let body = trimmed.replace(ENGINE_REASON_PREFIX, "").trim();
  if (body === trimmed) {
    body = trimmed
      .replace(/^Emotion:\s*/i, "")
      .replace(/^Continuity:\s*/i, "")
      .replace(/^Freshness:\s*/i, "")
      .replace(/^Autonomy:\s*/i, "")
      .replace(/^Memory:\s*/i, "")
      .trim();
  }

  if (!body) return "Adjusted to match how today is feeling.";
  const first = body.charAt(0).toUpperCase();
  const rest = body.slice(1);
  if (/[.!?]$/.test(rest)) return first + rest;
  return `${first}${rest}.`;
}

export function deriveIntelligenceTier(opts: {
  reverted: boolean;
  childId?: string;
  snapshotCount: number;
  infantExclusive?: boolean;
}): IntelligenceTier {
  if (opts.reverted) return "simplified";
  if (!opts.childId || opts.infantExclusive) return "baseline";
  if (opts.snapshotCount < 2) return "baseline";
  return "full";
}

/**
 * Short lines merged into adaptations — surfaces memory + insights to parents.
 */
export function buildParentIntelligenceAdaptations(opts: {
  familyIntelligence?: FamilyIntelligenceMoatResult;
  adaptiveCompletion?: AdaptiveCompletionSummary;
  reverted: boolean;
  childId?: string;
  intelligenceTier?: IntelligenceTier;
}): string[] {
  const lines: string[] = [];
  const tier = opts.intelligenceTier ?? "baseline";
  const memory = opts.familyIntelligence?.profile.memory;
  const snapshotCount = memory?.snapshotCount ?? 0;

  if (opts.reverted) {
    lines.push(
      "Amy simplified today's plan so times stay realistic and easy to follow.",
    );
    return lines;
  }

  if (opts.childId && snapshotCount >= 2) {
    const days = Math.min(snapshotCount, 14);
    lines.push(
      `Amy is building on ${days} recent day${days === 1 ? "" : "s"} with your family — familiar anchors stay, with small refreshes.`,
    );
  } else if (opts.childId && tier === "baseline") {
    lines.push(
      "Amy is learning your family's rhythm — each saved day makes tomorrow's plan more personal.",
    );
  }

  const insights = opts.familyIntelligence?.insights ?? [];
  const gated =
    snapshotCount >= 2
      ? insights.slice(0, 2)
      : insights.filter((i) => i.id === "rhythm-steady").slice(0, 1);

  for (const ins of gated) {
    if (ins.message?.trim()) lines.push(ins.message.trim());
  }

  const freshness = opts.adaptiveCompletion?.freshnessAdjustments.length ?? 0;
  if (freshness > 0 && snapshotCount >= 2) {
    lines.push(
      "A few activities were refreshed so the week does not feel repetitive.",
    );
  }

  return lines;
}

/** Internal engine readiness (not a clinical or parenting score). */
export function engineReadinessLabel(score: number): string | null {
  if (score >= 80) return null;
  if (score >= 60) return "Amy is tuning pacing as more routine days are saved.";
  return null;
}
