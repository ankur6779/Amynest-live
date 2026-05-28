import {
  formatParentRoutineExplanation,
  type ParentExplanationContext,
  type ParentRoutineExplanation,
} from "@workspace/explainability";

export type FamilyTrustSignalId = "remembers" | "adapts" | "supports";

export type FamilyTrustSignal = {
  id: FamilyTrustSignalId;
  label: string;
  detail: string;
};

export type FamilyIntelligenceSurface = {
  explanation: ParentRoutineExplanation;
  signals: FamilyTrustSignal[];
  reassurance: string;
};

function normalizeLines(lines: readonly string[] | null | undefined): string[] {
  return (lines ?? []).filter((line): line is string => typeof line === "string" && line.trim().length > 0);
}

function firstMatching(lines: readonly string[], re: RegExp): string | null {
  return lines.find((line) => re.test(line)) ?? null;
}

function stripAmyPrefix(line: string): string {
  return line.replace(/^Amy\s+/i, "").trim();
}

function memorySignal(rawLines: readonly string[]): FamilyTrustSignal {
  const recent = firstMatching(rawLines, /building on\s+(\d+)\s+recent day/i);
  const count = recent?.match(/building on\s+(\d+)\s+recent day/i)?.[1];

  if (count) {
    return {
      id: "remembers",
      label: "Amy remembers your rhythm",
      detail: `Built from ${count} recent family day${count === "1" ? "" : "s"}, while keeping familiar anchors.`,
    };
  }

  return {
    id: "remembers",
    label: "Amy is learning your family",
    detail: "Each saved routine gives Amy more context for tomorrow's plan.",
  };
}

function adaptationSignal(explanation: ParentRoutineExplanation): FamilyTrustSignal {
  const candidate =
    explanation.grouped.environment[0] ??
    explanation.grouped.context[0] ??
    explanation.grouped.adjustments[0] ??
    explanation.bullets[0];

  return {
    id: "adapts",
    label: "Today is not a template",
    detail: candidate
      ? stripAmyPrefix(candidate)
      : "Amy adjusts around today's school, weather, caregiver, mood, and routine context.",
  };
}

function supportSignal(rawLines: readonly string[], ctx: ParentExplanationContext): FamilyTrustSignal {
  const hardDayLine =
    firstMatching(rawLines, /gentl|calm|soothing|lower-energy|low energy|mixed|variable|simplified|shorter blocks|recovery/i) ??
    (ctx.mood === "lazy" || ctx.mood === "angry"
      ? "Today needs gentler pacing."
      : null);

  return {
    id: "supports",
    label: hardDayLine ? "Hard days are handled gently" : "Small changes stay explainable",
    detail: hardDayLine
      ? "Amy softens pacing instead of pushing through when the day looks harder."
      : "Amy keeps changes small, visible, and parent-friendly.",
  };
}

export function buildFamilyIntelligenceSurface(
  adaptations: readonly string[] | null | undefined,
  ctx: ParentExplanationContext = {},
): FamilyIntelligenceSurface | null {
  const rawLines = normalizeLines(adaptations);
  const explanation = formatParentRoutineExplanation(rawLines, ctx);

  if (rawLines.length === 0 && explanation.bullets.length === 0) return null;

  return {
    explanation,
    signals: [
      memorySignal(rawLines),
      adaptationSignal(explanation),
      supportSignal(rawLines, ctx),
    ],
    reassurance:
      "Amy uses saved routines and today's inputs for planning support. This is not a score, diagnosis, or judgment.",
  };
}
