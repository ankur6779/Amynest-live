export type InfantSleepCoachContext = {
  childName: string;
  ageMonths: number;
  napSessions14d: Array<{
    kind: "nap" | "night";
    startedAt: string;
    endedAt: string | null;
    durationMin: number | null;
  }>;
  sleepPrediction: {
    nextWindowStart?: string;
    nextWindowEnd?: string;
    avgWakeWindowMin?: number;
    napsToday?: number;
    confidence?: string;
  } | null;
};

export type InfantSleepCoachPlan = {
  bedtimeRecommendation: string;
  wakeWindowAdjustments: string[];
  regressionAnalysis: string;
  napTransitionGuidance: string;
  weeklyFocus: string;
  actionSteps: string[];
};

const SAFETY_GUARDRAILS = `
SAFETY (mandatory — never violate):
- This is parenting guidance, NOT medical advice. Never diagnose sleep disorders.
- Under 3 months: any fever ≥38°C → seek urgent care; do not suggest sleep training.
- Never recommend unsafe sleep: no stomach sleeping, no loose blankets/pillows for under 12mo, no bed-sharing promotion.
- No cry-it-out or extinction methods for under 6 months.
- If patterns suggest possible apnea, reflux, or failure to thrive → advise pediatrician visit.
- Keep tone warm, practical, and age-appropriate.
`.trim();

export function buildInfantSleepCoachPrompt(ctx: InfantSleepCoachContext): string {
  const sessionsBlock =
    ctx.napSessions14d.length === 0
      ? "No nap sessions logged in the past 14 days."
      : ctx.napSessions14d
          .slice(0, 40)
          .map(
            (s) =>
              `- ${s.kind} ${s.startedAt}${s.endedAt ? ` → ${s.endedAt}` : " (ongoing)"}${s.durationMin != null ? ` (${s.durationMin} min)` : ""}`,
          )
          .join("\n");

  const predictBlock = ctx.sleepPrediction
    ? JSON.stringify(ctx.sleepPrediction, null, 2)
    : "No prediction available yet.";

  return `You are AmyNest Infant Sleep Coach — a warm, evidence-informed sleep guide for parents of babies 0–24 months.

${SAFETY_GUARDRAILS}

Child: ${ctx.childName}, ${ctx.ageMonths} months old.

Recent nap/night sessions (14 days):
${sessionsBlock}

Sleep prediction engine output:
${predictBlock}

Output ONLY valid JSON with this exact schema:
{
  "bedtimeRecommendation": "string — specific bedtime/wind-down advice for tonight",
  "wakeWindowAdjustments": ["string — up to 4 specific wake-window tweaks"],
  "regressionAnalysis": "string — brief analysis of any regression or pattern shift",
  "napTransitionGuidance": "string — guidance on nap count/duration transitions for this age",
  "weeklyFocus": "string — one priority focus for the coming week",
  "actionSteps": ["string — max 5 concrete action steps, ordered by priority"]
}

Keep each field concise (1–3 sentences). actionSteps must have at most 5 items.`;
}

export function sanitizeInfantSleepCoachPlan(raw: unknown): InfantSleepCoachPlan | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const actionSteps = (Array.isArray(o.actionSteps) ? o.actionSteps : [])
    .slice(0, 5)
    .map((s) => String(s).slice(0, 300))
    .filter(Boolean);
  if (actionSteps.length === 0) return null;

  const wakeWindowAdjustments = (Array.isArray(o.wakeWindowAdjustments) ? o.wakeWindowAdjustments : [])
    .slice(0, 4)
    .map((s) => String(s).slice(0, 300))
    .filter(Boolean);

  return {
    bedtimeRecommendation: String(o.bedtimeRecommendation ?? "").slice(0, 500) || "Follow age-appropriate wake windows tonight.",
    wakeWindowAdjustments,
    regressionAnalysis: String(o.regressionAnalysis ?? "").slice(0, 500) || "No major regression pattern detected.",
    napTransitionGuidance: String(o.napTransitionGuidance ?? "").slice(0, 500) || "Maintain consistent nap timing.",
    weeklyFocus: String(o.weeklyFocus ?? "").slice(0, 400) || "Consistency in wake windows and bedtime routine.",
    actionSteps,
  };
}
