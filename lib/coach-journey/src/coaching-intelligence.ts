import type { CoachFeedback } from "./progress-view.js";

export type CoachStrategyTag =
  | "emotional_validation"
  | "routine_structure"
  | "practical_action"
  | "choices_autonomy"
  | "movement_break"
  | "visual_cues"
  | "repair_reconnect"
  | "calm_parent_response";

export type CoachContentDensity = "concise" | "standard" | "detailed";
export type CoachParentStyle = "action_first" | "explain_first" | "balanced";
export type StrategyConfidenceTier = "primary" | "moderate" | "explore";

export interface CoachWinEffectivenessRecord {
  winTitle: string;
  goalId: string;
  sessionId: string;
  strategyTags: CoachStrategyTag[];
  feedback: CoachFeedback;
  at: string;
}

export interface CoachIntelligenceSnapshot {
  version: 1;
  childAgeGroup?: string;
  completedGoals: { goalId: string; goalTitle: string; completedAt: string }[];
  winRecords: CoachWinEffectivenessRecord[];
  checkInSummaries: { goalId: string; label: string; at: string; positive: boolean }[];
  graduationHistory: { goalId: string; path: string; at: string }[];
  maintenanceGoalIds: string[];
  repeatedChallenges: { goalId: string; label: string; count: number; lastAt: string }[];
  strategyScores: Partial<
    Record<
      CoachStrategyTag,
      { worked: number; partial: number; failed: number; lastWorkedAt?: string }
    >
  >;
  usedPhraseHashes: string[];
  profile: {
    parentStyle: CoachParentStyle;
    childStrengths: CoachStrategyTag[];
    contentDensity: CoachContentDensity;
    updatedAt: string;
  };
  lastUpdated: string;
}

export interface CoachWinFeedbackEvent {
  type: "win_feedback";
  sessionId: string;
  goalId: string;
  goalTitle: string;
  winNumber: number;
  winTitle: string;
  winObjective?: string;
  winActions?: string[];
  feedback: CoachFeedback;
  at?: string;
  childAgeGroup?: string;
}

export interface CoachCheckInIntelEvent {
  type: "check_in";
  sessionId: string;
  goalId: string;
  optionLabel: string;
  positive: boolean;
  at?: string;
}

export interface CoachGraduationIntelEvent {
  type: "graduation";
  goalId: string;
  goalTitle: string;
  path: string;
  maintenanceMode?: boolean;
  at?: string;
}

export type CoachIntelligenceEvent =
  | CoachWinFeedbackEvent
  | CoachCheckInIntelEvent
  | CoachGraduationIntelEvent;

const STRATEGY_LABELS: Record<CoachStrategyTag, string> = {
  emotional_validation: "naming emotions and validation",
  routine_structure: "predictable routines",
  practical_action: "small practical actions",
  choices_autonomy: "offering choices",
  movement_break: "movement and sensory breaks",
  visual_cues: "visual cues and previews",
  repair_reconnect: "repair after hard moments",
  calm_parent_response: "staying calm in the moment",
};

const MAX_WIN_RECORDS = 120;
const MAX_PHRASE_HASHES = 200;

export function createEmptyCoachIntelligence(): CoachIntelligenceSnapshot {
  const now = new Date().toISOString();
  return {
    version: 1,
    completedGoals: [],
    winRecords: [],
    checkInSummaries: [],
    graduationHistory: [],
    maintenanceGoalIds: [],
    repeatedChallenges: [],
    strategyScores: {},
    usedPhraseHashes: [],
    profile: {
      parentStyle: "balanced",
      childStrengths: [],
      contentDensity: "standard",
      updatedAt: now,
    },
    lastUpdated: now,
  };
}

export function classifyWinStrategy(input: {
  title: string;
  objective?: string;
  actions?: string[];
}): CoachStrategyTag[] {
  const blob = [input.title, input.objective, ...(input.actions ?? [])].join(" ").toLowerCase();
  const tags = new Set<CoachStrategyTag>();
  if (/valid|emotion|name|feel|empath|connect|breathe|calm/.test(blob)) {
    tags.add("emotional_validation");
  }
  if (/routine|predict|schedule|when-then|visual|before|same time|ritual/.test(blob)) {
    tags.add("routine_structure");
  }
  if (/choice|option|pick|autonomy|decide|offer/.test(blob)) {
    tags.add("choices_autonomy");
  }
  if (/walk|move|stretch|break|sensory|jump|shake/.test(blob)) {
    tags.add("movement_break");
  }
  if (/chart|picture|visual|timer|card|list/.test(blob)) {
    tags.add("visual_cues");
  }
  if (/repair|reconnect|sorry|hug|after|apolog/.test(blob)) {
    tags.add("repair_reconnect");
  }
  if (/pause|wait|lower|whisper|soft|your tone|stay calm/.test(blob)) {
    tags.add("calm_parent_response");
  }
  if (/try|step|today|action|practice|do this|micro/.test(blob)) {
    tags.add("practical_action");
  }
  if (tags.size === 0) tags.add("practical_action");
  return [...tags];
}

function scoreDelta(feedback: CoachFeedback): { worked: number; partial: number; failed: number } {
  if (feedback === "yes") return { worked: 1, partial: 0, failed: 0 };
  if (feedback === "somewhat") return { worked: 0, partial: 1, failed: 0 };
  return { worked: 0, partial: 0, failed: 1 };
}

function bumpStrategyScores(
  scores: CoachIntelligenceSnapshot["strategyScores"],
  tags: CoachStrategyTag[],
  feedback: CoachFeedback,
  at: string,
): CoachIntelligenceSnapshot["strategyScores"] {
  const next = { ...scores };
  const delta = scoreDelta(feedback);
  for (const tag of tags) {
    const cur = next[tag] ?? { worked: 0, partial: 0, failed: 0 };
    next[tag] = {
      worked: cur.worked + delta.worked,
      partial: cur.partial + delta.partial,
      failed: cur.failed + delta.failed,
      lastWorkedAt: feedback === "yes" ? at : cur.lastWorkedAt,
    };
  }
  return next;
}

function strategyEffectiveness(
  score: { worked: number; partial: number; failed: number } | undefined,
): number {
  if (!score) return 0;
  return score.worked * 2 + score.partial * 0.75 - score.failed * 1.5;
}

export function deriveCoachingProfile(
  snapshot: CoachIntelligenceSnapshot,
): CoachIntelligenceSnapshot["profile"] {
  const entries = Object.entries(snapshot.strategyScores) as [
    CoachStrategyTag,
    { worked: number; partial: number; failed: number },
  ][];
  const ranked = entries
    .map(([tag, s]) => ({ tag, value: strategyEffectiveness(s) }))
    .sort((a, b) => b.value - a.value);

  const childStrengths = ranked.filter((r) => r.value > 0).slice(0, 3).map((r) => r.tag);
  const top = ranked[0]?.tag;
  const actionScore =
    strategyEffectiveness(snapshot.strategyScores.practical_action) +
    strategyEffectiveness(snapshot.strategyScores.calm_parent_response);
  const explainScore =
    strategyEffectiveness(snapshot.strategyScores.emotional_validation) +
    strategyEffectiveness(snapshot.strategyScores.routine_structure);

  let parentStyle: CoachParentStyle = "balanced";
  if (actionScore > explainScore + 2) parentStyle = "action_first";
  else if (explainScore > actionScore + 2) parentStyle = "explain_first";

  let contentDensity: CoachContentDensity = "standard";
  if (parentStyle === "action_first") contentDensity = "concise";
  if (parentStyle === "explain_first") contentDensity = "detailed";

  const recentFails = snapshot.winRecords
    .slice(-8)
    .filter((r) => r.feedback === "no").length;
  if (recentFails >= 3) contentDensity = "concise";

  return {
    parentStyle,
    childStrengths: childStrengths.length > 0 ? childStrengths : top ? [top] : ["practical_action"],
    contentDensity,
    updatedAt: new Date().toISOString(),
  };
}

export function rankStrategyConfidence(
  snapshot: CoachIntelligenceSnapshot,
  goalId: string,
): { strategy: CoachStrategyTag; tier: StrategyConfidenceTier }[] {
  const global = Object.entries(snapshot.strategyScores) as [
    CoachStrategyTag,
    { worked: number; partial: number; failed: number },
  ][];
  const goalRecords = snapshot.winRecords.filter((r) => r.goalId === goalId);
  const goalTags = new Map<CoachStrategyTag, number>();
  for (const r of goalRecords) {
    for (const t of r.strategyTags) {
      const d = r.feedback === "yes" ? 2 : r.feedback === "somewhat" ? 0.5 : -1;
      goalTags.set(t, (goalTags.get(t) ?? 0) + d);
    }
  }

  const combined = new Map<CoachStrategyTag, number>();
  for (const [tag, s] of global) {
    combined.set(tag, (combined.get(tag) ?? 0) + strategyEffectiveness(s) * 0.6);
  }
  for (const [tag, s] of goalTags) {
    combined.set(tag, (combined.get(tag) ?? 0) + s);
  }

  const allTags: CoachStrategyTag[] = [
    "emotional_validation",
    "routine_structure",
    "practical_action",
    "choices_autonomy",
    "movement_break",
    "visual_cues",
    "repair_reconnect",
    "calm_parent_response",
  ];

  const ranked = allTags
    .map((strategy) => ({ strategy, score: combined.get(strategy) ?? 0 }))
    .sort((a, b) => b.score - a.score);

  return ranked.map((r, i) => ({
    strategy: r.strategy,
    tier: i === 0 ? "primary" : i <= 2 ? "moderate" : "explore",
  }));
}

export function strategiesToPrefer(snapshot: CoachIntelligenceSnapshot): CoachStrategyTag[] {
  return rankStrategyConfidence(snapshot, "")
    .filter((r) => r.tier !== "explore")
    .slice(0, 3)
    .map((r) => r.strategy);
}

export function strategiesToAvoid(snapshot: CoachIntelligenceSnapshot): CoachStrategyTag[] {
  return (Object.entries(snapshot.strategyScores) as [CoachStrategyTag, { worked: number; partial: number; failed: number }][])
    .filter(([, s]) => s.failed >= 2 && s.worked === 0)
    .map(([tag]) => tag);
}

export function hashPhrase(text: string): string {
  let h = 0;
  const norm = text.toLowerCase().replace(/\s+/g, " ").trim();
  for (let i = 0; i < norm.length; i += 1) {
    h = (h * 31 + norm.charCodeAt(i)) >>> 0;
  }
  return `p${h.toString(16)}`;
}

export function pickVariedPhrase(
  seed: number,
  options: string[],
  usedHashes: string[],
): { text: string; hash: string } {
  const used = new Set(usedHashes);
  const fresh = options.filter((o) => !used.has(hashPhrase(o)));
  const pool = fresh.length > 0 ? fresh : options;
  const text = pool[seed % pool.length]!;
  return { text, hash: hashPhrase(text) };
}

export function registerUsedPhrase(
  snapshot: CoachIntelligenceSnapshot,
  hash: string,
): CoachIntelligenceSnapshot {
  const usedPhraseHashes = [hash, ...snapshot.usedPhraseHashes.filter((h) => h !== hash)].slice(
    0,
    MAX_PHRASE_HASHES,
  );
  return { ...snapshot, usedPhraseHashes };
}

export function buildFamilyReferenceLine(
  snapshot: CoachIntelligenceSnapshot,
  goalId: string,
): string | null {
  const cross = buildCrossGoalInsight(snapshot, goalId);
  if (cross) return cross;

  const worked = snapshot.winRecords
    .filter((r) => r.goalId === goalId && r.feedback === "yes")
    .slice(-3);
  if (worked.length === 0) return null;

  const tag = worked[worked.length - 1]!.strategyTags[0];
  if (!tag) return null;
  const label = STRATEGY_LABELS[tag];
  const monthsAgo = worked.length >= 2 ? "Last month" : "Recently";
  return `${monthsAgo}, ${label} helped in this area. Amy is building on that success.`;
}

export function buildCrossGoalInsight(
  snapshot: CoachIntelligenceSnapshot,
  goalId: string,
): string | null {
  const globalBest = rankStrategyConfidence(snapshot, goalId).find((r) => r.tier === "primary");
  if (!globalBest) return null;

  const fromOtherGoal = snapshot.winRecords.find(
    (r) =>
      r.goalId !== goalId &&
      r.feedback === "yes" &&
      r.strategyTags.includes(globalBest.strategy),
  );
  if (!fromOtherGoal) return null;

  const label = STRATEGY_LABELS[globalBest.strategy];
  return `In another goal, ${label} worked well for your family — Amy is leaning on that strength here too.`;
}

export function detectIntelligencePlateau(
  snapshot: CoachIntelligenceSnapshot,
  goalId: string,
  progressPct: number,
): boolean {
  if (progressPct < 15 || progressPct >= 90) return false;
  const recent = snapshot.winRecords.filter((r) => r.goalId === goalId).slice(-6);
  if (recent.length < 4) return false;
  const yes = recent.filter((r) => r.feedback === "yes").length;
  const no = recent.filter((r) => r.feedback === "no").length;
  const somewhat = recent.filter((r) => r.feedback === "somewhat").length;
  return yes <= 1 && somewhat >= 2 && no >= 1;
}

export function renderCoachIntelligencePromptBlock(
  snapshot: CoachIntelligenceSnapshot,
  goalId: string,
): string {
  const prefer = strategiesToPrefer(snapshot);
  const avoid = strategiesToAvoid(snapshot);
  const ranked = rankStrategyConfidence(snapshot, goalId);
  const density = snapshot.profile.contentDensity;
  const parentStyle = snapshot.profile.parentStyle;

  const preferLines = prefer
    .map((t) => STRATEGY_LABELS[t])
    .filter(Boolean)
    .join("; ");
  const avoidLines = avoid
    .map((t) => STRATEGY_LABELS[t])
    .filter(Boolean)
    .join("; ");

  const primary = ranked.find((r) => r.tier === "primary");
  const explore = ranked.filter((r) => r.tier === "explore").slice(0, 2);

  const lines = [
    "FAMILY COACHING CONTEXT (use naturally; never mention scores or profiles):",
    `- Parent responds best to: ${parentStyle === "action_first" ? "short actionable steps first" : parentStyle === "explain_first" ? "brief why-it-works before actions" : "a balance of explanation and action"}.`,
    `- Content density: ${density === "concise" ? "keep explanations shorter" : density === "detailed" ? "include a little more context before actions" : "standard depth"}.`,
  ];

  if (preferLines) lines.push(`- Strategies that have worked for this family: ${preferLines}.`);
  if (avoidLines) lines.push(`- Avoid repeating strategies that haven't landed: ${avoidLines}.`);
  if (primary) lines.push(`- Lead with approaches like ${STRATEGY_LABELS[primary.strategy]}.`);
  if (explore.length > 0) {
    lines.push(
      `- If stuck, try fresh angles such as ${explore.map((e) => STRATEGY_LABELS[e.strategy]).join(" or ")}.`,
    );
  }

  const ref = buildFamilyReferenceLine(snapshot, goalId);
  if (ref) lines.push(`- Continuity note you may weave in once: ${ref}`);

  if (detectIntelligencePlateau(snapshot, goalId, 40)) {
    lines.push("- Progress has plateaued: do NOT repeat prior win angles — ask a deeper clarifying angle or shrink the step.");
  }

  return lines.join("\n");
}

export function applyCoachIntelligenceEvent(
  snapshot: CoachIntelligenceSnapshot,
  event: CoachIntelligenceEvent,
): CoachIntelligenceSnapshot {
  const at = event.type === "win_feedback" ? event.at ?? new Date().toISOString() : event.at ?? new Date().toISOString();
  let next = { ...snapshot, lastUpdated: at };

  if (event.type === "win_feedback") {
    if (event.childAgeGroup) next.childAgeGroup = event.childAgeGroup;
    const tags = classifyWinStrategy({
      title: event.winTitle,
      objective: event.winObjective,
      actions: event.winActions,
    });
    const record: CoachWinEffectivenessRecord = {
      winTitle: event.winTitle,
      goalId: event.goalId,
      sessionId: event.sessionId,
      strategyTags: tags,
      feedback: event.feedback,
      at,
    };
    next.winRecords = [...next.winRecords, record].slice(-MAX_WIN_RECORDS);
    next.strategyScores = bumpStrategyScores(next.strategyScores, tags, event.feedback, at);

    if (event.feedback === "no") {
      const label = event.winTitle.slice(0, 80);
      const existing = next.repeatedChallenges.find(
        (c) => c.goalId === event.goalId && c.label === label,
      );
      next.repeatedChallenges = existing
        ? next.repeatedChallenges.map((c) =>
            c === existing ? { ...c, count: c.count + 1, lastAt: at } : c,
          )
        : [...next.repeatedChallenges, { goalId: event.goalId, label, count: 1, lastAt: at }].slice(
            -30,
          );
    }
  }

  if (event.type === "check_in") {
    next.checkInSummaries = [
      { goalId: event.goalId, label: event.optionLabel, at, positive: event.positive },
      ...next.checkInSummaries,
    ].slice(0, 40);
  }

  if (event.type === "graduation") {
    next.completedGoals = [
      { goalId: event.goalId, goalTitle: event.goalTitle, completedAt: at },
      ...next.completedGoals.filter((g) => g.goalId !== event.goalId),
    ].slice(0, 30);
    next.graduationHistory = [
      { goalId: event.goalId, path: event.path, at },
      ...next.graduationHistory,
    ].slice(0, 30);
    if (event.maintenanceMode) {
      next.maintenanceGoalIds = [...new Set([...next.maintenanceGoalIds, event.goalId])];
    }
  }

  next.profile = deriveCoachingProfile(next);
  return next;
}

export function mergeCoachIntelligenceSnapshots(
  local: CoachIntelligenceSnapshot | null,
  remote: CoachIntelligenceSnapshot | null,
): CoachIntelligenceSnapshot {
  if (!local) return remote ?? createEmptyCoachIntelligence();
  if (!remote) return local;
  if (new Date(remote.lastUpdated).getTime() >= new Date(local.lastUpdated).getTime()) {
    return remote;
  }
  return local;
}

/** Safe fields for client UI — never exposes raw profile scores or strategy rankings. */
export interface CoachIntelligencePublicView {
  lastUpdated: string;
  familyReference: string | null;
  crossGoalInsight: string | null;
  completedGoalCount: number;
  coachingActive: boolean;
  usedPhraseHashes: string[];
  contentDensity: CoachContentDensity;
}

export function buildPublicCoachIntelligenceView(
  snapshot: CoachIntelligenceSnapshot,
  activeGoalId: string,
): CoachIntelligencePublicView {
  return {
    lastUpdated: snapshot.lastUpdated,
    familyReference: activeGoalId ? buildFamilyReferenceLine(snapshot, activeGoalId) : null,
    crossGoalInsight: activeGoalId ? buildCrossGoalInsight(snapshot, activeGoalId) : null,
    completedGoalCount: snapshot.completedGoals.length,
    coachingActive: snapshot.winRecords.length > 0,
    usedPhraseHashes: snapshot.usedPhraseHashes,
    contentDensity: snapshot.profile.contentDensity,
  };
}

export { STRATEGY_LABELS };
