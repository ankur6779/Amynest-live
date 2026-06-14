import { createHash } from "node:crypto";

export const COACH_PLAN_NAMESPACE = "ai_coach_v4";

export type CoachPlanCacheInput = {
  goal?: string;
  ageGroup?: string;
  severity?: string;
  triggers?: string[];
  routine?: string;
  topicAnswers?: Record<string, string | string[]>;
};

const norm = (s: unknown): string =>
  String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 60);

function normTopicAnswers(ta?: Record<string, string | string[]>): string {
  if (!ta) return "";
  const keys = Object.keys(ta).sort();
  const parts: string[] = [];
  for (const k of keys) {
    const v = ta[k];
    const valStr = Array.isArray(v)
      ? v.map(norm).filter(Boolean).sort().join(",")
      : norm(v);
    if (!valStr) continue;
    parts.push(`${norm(k)}=${valStr}`);
  }
  return parts.join("|");
}

/** Content-addressed template key — goal + child profile inputs (shared audio/plan template). */
export function buildCoachPlanCacheKey(input: CoachPlanCacheInput): string {
  const triggers = (input.triggers ?? []).map(norm).filter(Boolean).sort().join("-");
  const ta = normTopicAnswers(input.topicAnswers);
  const raw = `${COACH_PLAN_NAMESPACE}_en_${norm(input.goal)}_${norm(input.ageGroup)}_${norm(input.severity)}_${triggers}_${norm(input.routine)}_${ta}`;
  return createHash("sha1").update(raw).digest("hex");
}

export type CoachSessionCacheContext = {
  goal?: string;
  ageGroup?: string;
  severity?: string;
  triggers?: string[];
  routine?: string;
  topicAnswers?: Record<string, string | string[]>;
  sessionId?: string;
  recentWinTitles?: string[];
  feedbackHistory?: { winNumber: number; feedback: string }[];
  progressPct?: number;
};

/** Session-scoped key — includes feedback + win history so stale templates cannot override adaptive paths. */
export function buildCoachSessionContextKey(ctx: CoachSessionCacheContext): string {
  const base = buildCoachPlanCacheKey(ctx);
  const titles = (ctx.recentWinTitles ?? []).map(norm).filter(Boolean).join("|");
  const feedback = (ctx.feedbackHistory ?? [])
    .map((f) => `${f.winNumber}:${norm(f.feedback)}`)
    .join("|");
  const progress = typeof ctx.progressPct === "number" ? String(Math.round(ctx.progressPct)) : "";
  const session = norm(ctx.sessionId);
  const raw = `coach_session_v1_${base}_${session}_${titles}_${feedback}_${progress}`;
  return createHash("sha1").update(raw).digest("hex");
}

/** Documents cache layer separation for certification. */
export function describeCoachCacheLayers(): {
  templateKey: { includes: string[]; excludes: string[]; purpose: string };
  sessionKey: { includes: string[]; purpose: string };
  nextWinBehavior: string;
} {
  return {
    templateKey: {
      includes: ["goal", "ageGroup", "severity", "triggers", "routine", "topicAnswers"],
      excludes: ["feedbackHistory", "recentWinTitles", "progressPct", "sessionId"],
      purpose: "Shared 12-win template + audio reuse for identical onboarding inputs",
    },
    sessionKey: {
      includes: [
        "goal",
        "ageGroup",
        "severity",
        "triggers",
        "routine",
        "topicAnswers",
        "sessionId",
        "recentWinTitles",
        "feedbackHistory",
        "progressPct",
      ],
      purpose: "Adaptive coaching path — prevents stale template from overriding feedback-driven wins",
    },
    nextWinBehavior: "POST /coach/next-win never reads template cache; uses existingWins + DB feedback history",
  };
}

/** Bypass full-plan template cache when user has personalized progress on this goal. */
export function shouldBypassCoachPlanCache(params: {
  hasSessionFeedback: boolean;
  resumeSessionId?: string;
}): boolean {
  return params.hasSessionFeedback || Boolean(params.resumeSessionId);
}

/** Static infant fallback plans — stable key per goal for audio reuse. */
export function buildInfantCoachPlanCacheKey(goalId: string): string {
  return createHash("sha1").update(`infant_coach_v1_${norm(goalId)}`).digest("hex");
}

export function hashCoachListenText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export type CoachWinListenFields = {
  win: number;
  title: string;
  objective: string;
  deep_explanation?: string;
  actions?: string[];
  example?: string;
  mistake_to_avoid?: string;
  micro_task?: string;
};

/** Verbatim listen-aloud script — must match client UI (Listen button). */
export function buildCoachWinListenText(win: CoachWinListenFields): string {
  return [
    `${win.win}. ${win.title}.`,
    win.objective,
    win.deep_explanation,
    win.actions?.length ? `${win.actions.join(". ")}` : "",
    win.example ? `${win.example}` : "",
    win.mistake_to_avoid ? `${win.mistake_to_avoid}.` : "",
    win.micro_task ? `${win.micro_task}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
