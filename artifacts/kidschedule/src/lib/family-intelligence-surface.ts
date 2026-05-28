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
  /** One-line headline for compact surfaces (dashboard timeline, hub tile). */
  headline: string;
};

export type RoutineIntelligencePick = {
  id: number;
  childName?: string;
  date?: string;
  adaptations?: string[] | null;
};

export type FamilyIntelligenceContext = ParentExplanationContext & {
  energyProfile?: {
    peakFocusStart?: string | null;
    peakFocusEnd?: string | null;
    sampleCount?: number;
  } | null;
};

const REASSURANCE =
  "Amy uses saved routines and today's inputs for planning support. This is not a score, diagnosis, or judgment.";

function normalizeLines(lines: readonly string[] | null | undefined): string[] {
  return (lines ?? []).filter((line): line is string => typeof line === "string" && line.trim().length > 0);
}

function firstMatching(lines: readonly string[], re: RegExp): string | null {
  return lines.find((line) => re.test(line)) ?? null;
}

function stripAmyPrefix(line: string): string {
  return line.replace(/^Amy\s+/i, "").trim();
}

function formatTimeWindow(start?: string | null, end?: string | null): string | null {
  if (!start || !end) return null;
  return `${start}–${end}`;
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

  if (firstMatching(rawLines, /learning your (family's )?rhythm|learning your rhythm/i)) {
    return {
      id: "remembers",
      label: "Amy is learning your family",
      detail: "Each saved routine gives Amy more context for tomorrow's plan.",
    };
  }

  return {
    id: "remembers",
    label: "Amy is learning your family",
    detail: "Save a few routines and Amy will keep familiar anchors while gently refreshing the week.",
  };
}

function adaptationSignal(
  explanation: ParentRoutineExplanation,
  ctx: FamilyIntelligenceContext,
): FamilyTrustSignal {
  const peak =
    ctx.energyProfile && (ctx.energyProfile.sampleCount ?? 0) >= 3
      ? formatTimeWindow(ctx.energyProfile.peakFocusStart, ctx.energyProfile.peakFocusEnd)
      : null;

  const candidate =
    explanation.grouped.behavior[0] ??
    explanation.grouped.environment[0] ??
    explanation.grouped.context[0] ??
    explanation.grouped.adjustments[0] ??
    explanation.bullets[0];

  let detail = candidate
    ? stripAmyPrefix(candidate)
    : "Amy adjusts around today's school, weather, caregiver, mood, and routine context.";

  if (peak && !/focus|learning|peak/i.test(detail)) {
    detail = `Learning blocks tend to land best around ${peak}. ${detail}`;
  }

  return {
    id: "adapts",
    label: "Today is not a template",
    detail,
  };
}

function parentMoodSupportLine(mood?: string): string | null {
  switch (mood) {
    case "happy":
      return "Today's plan keeps energy up — your child seems in a good mood.";
    case "lazy":
      return "Today's plan is gentler with extra breaks for a lower-energy day.";
    case "angry":
      return "Today's plan favors calm, soothing activities.";
    case "low":
      return "Today's plan is paced gently — Amy keeps transitions soft when energy is low.";
    case "active":
      return "Today's plan makes room for movement while keeping recovery time.";
    default:
      return null;
  }
}

function supportSignal(rawLines: readonly string[], ctx: FamilyIntelligenceContext): FamilyTrustSignal {
  const moodLine = parentMoodSupportLine(ctx.mood);
  const hardDayLine =
    moodLine ??
    firstMatching(
      rawLines,
      /gentl|calm|soothing|lower-energy|low energy|mixed|variable|simplified|shorter blocks|recovery|needs_support|paced gently/i,
    );

  return {
    id: "supports",
    label: hardDayLine ? "Hard days are handled gently" : "Small changes stay explainable",
    detail: hardDayLine
      ? hardDayLine.endsWith(".")
        ? hardDayLine
        : `${hardDayLine}.`
      : "Amy keeps changes small, visible, and parent-friendly.",
  };
}

function buildHeadline(signals: FamilyTrustSignal[]): string {
  const memory = signals.find((s) => s.id === "remembers");
  const adapt = signals.find((s) => s.id === "adapts");
  if (memory && adapt) {
    return `${memory.label} — ${adapt.detail.split(".")[0]}.`;
  }
  return adapt?.detail ?? memory?.detail ?? "Amy adapts today's plan to your family.";
}

/** Pick today's routine with adaptations, else the most recent dated routine that has them. */
export function pickRoutineForIntelligence(
  routines: readonly RoutineIntelligencePick[],
  todayKey = new Date().toISOString().slice(0, 10),
): RoutineIntelligencePick | null {
  const withAdaptations = routines.filter((r) => (r.adaptations?.length ?? 0) > 0);
  if (withAdaptations.length === 0) return null;

  const today = withAdaptations.filter((r) => (r.date ?? "").slice(0, 10) === todayKey);
  if (today.length === 1) return today[0]!;
  if (today.length > 1) {
    return [...today].sort((a, b) => b.id - a.id)[0]!;
  }

  return [...withAdaptations].sort((a, b) => {
    const dateCmp = (b.date ?? "").localeCompare(a.date ?? "");
    return dateCmp !== 0 ? dateCmp : b.id - a.id;
  })[0]!;
}

/** Early-family copy when routines exist but adaptations are not persisted yet. */
export function buildLearningPhaseSurface(): FamilyIntelligenceSurface {
  const signals: FamilyTrustSignal[] = [
    {
      id: "remembers",
      label: "Amy is learning your family",
      detail: "Save today's routine and Amy starts remembering what works for your household.",
    },
    {
      id: "adapts",
      label: "Today is not a template",
      detail: "School, weather, mood, and caregiver choices shape each plan before you save it.",
    },
    {
      id: "supports",
      label: "Small changes stay explainable",
      detail: "Amy keeps adjustments visible so you always know why the day shifted.",
    },
  ];

  return {
    explanation: {
      summary: "Amy is building your family's rhythm — each saved day makes plans feel more personal.",
      bullets: signals.map((s) => s.detail),
      grouped: {
        context: [],
        environment: [],
        behavior: [signals[0]!.detail],
        adjustments: [signals[1]!.detail],
      },
    },
    signals,
    reassurance: REASSURANCE,
    headline: buildHeadline(signals),
  };
}

export function buildFamilyIntelligenceSurface(
  adaptations: readonly string[] | null | undefined,
  ctx: FamilyIntelligenceContext = {},
): FamilyIntelligenceSurface | null {
  const rawLines = normalizeLines(adaptations);
  const explanation = formatParentRoutineExplanation(rawLines, ctx);

  if (rawLines.length === 0 && explanation.bullets.length === 0) return null;

  const signals = [
    memorySignal(rawLines),
    adaptationSignal(explanation, ctx),
    supportSignal(rawLines, ctx),
  ];

  return {
    explanation,
    signals,
    reassurance: REASSURANCE,
    headline: buildHeadline(signals),
  };
}

export function resolveFamilyIntelligenceSurface(opts: {
  routines?: readonly RoutineIntelligencePick[];
  adaptations?: readonly string[] | null;
  ctx?: FamilyIntelligenceContext;
  todayKey?: string;
}): FamilyIntelligenceSurface | null {
  const picked = opts.routines ? pickRoutineForIntelligence(opts.routines, opts.todayKey) : null;
  const adaptations = opts.adaptations ?? picked?.adaptations;
  const fromAdaptations = buildFamilyIntelligenceSurface(adaptations, opts.ctx ?? {});
  if (fromAdaptations) return fromAdaptations;
  if (opts.routines && opts.routines.length > 0) return buildLearningPhaseSurface();
  return null;
}
