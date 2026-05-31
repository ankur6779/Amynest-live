import {
  computeProgressTrend,
  pickVariedPhrase,
  type CoachContentDensity,
  type ProgressTrend,
} from "@workspace/coach-journey";

export type CoachFeedback = "yes" | "somewhat" | "no";

export interface CoachWinRationaleInput {
  goalId: string;
  goalTitle: string;
  win: { win: number; title: string; objective?: string };
  winDeckIndex: number;
  answers: Record<string, string | string[]>;
  feedbackByWin: Record<number, CoachFeedback>;
  progressPct: number;
  isFirstCoachingWin: boolean;
  usedPhraseHashes?: string[];
  familyReference?: string | null;
  contentDensity?: CoachContentDensity;
}

function hashSeed(parts: (string | number)[]): number {
  let h = 0;
  for (const p of parts) {
    const s = String(p);
    for (let i = 0; i < s.length; i += 1) {
      h = (h * 31 + s.charCodeAt(i)) >>> 0;
    }
  }
  return h;
}

function pickRationale(
  seed: number,
  options: string[],
  usedHashes: string[] = [],
): { text: string; hash: string } {
  return pickVariedPhrase(seed, options, usedHashes);
}

function maybeWeaveFamilyReference(
  text: string,
  familyReference: string | null | undefined,
  seed: number,
): string {
  if (!familyReference || seed % 4 !== 0) return text;
  return `${familyReference} ${text}`;
}

function trimForDensity(text: string, density?: CoachContentDensity): string {
  if (density !== "concise" || text.length <= 240) return text;
  const cut = text.lastIndexOf(". ", 240);
  if (cut > 120) return `${text.slice(0, cut + 1)}`;
  return text;
}

function winFocusPhrase(win: { title: string; objective?: string }): string {
  const title = win.title.trim();
  if (title.length <= 72) return title.charAt(0).toLowerCase() + title.slice(1);
  const objective = win.objective?.trim();
  if (objective && objective.length <= 80) {
    return objective.charAt(0).toLowerCase() + objective.slice(1);
  }
  return title.charAt(0).toLowerCase() + title.slice(1);
}

function ageClause(answers: Record<string, string | string[]>): string | null {
  const age = answers.ageGroup;
  if (typeof age !== "string") return null;
  if (age.includes("0–2") || age.includes("0-2")) return "your little one is still very young";
  if (age.includes("2–4") || age.includes("2-4")) return "your child is in the toddler years";
  if (age.includes("5–7") || age.includes("5-7")) return "your child is in the early school years";
  if (age.includes("8–10") || age.includes("8-10")) return "your child is in the school-age years";
  if (age.includes("10+")) return "your tween or teen needs a different tone";
  if (age.includes("Adult")) return "you need support that fits your life as a parent";
  return null;
}

function severityClause(answers: Record<string, string | string[]>): string | null {
  const sev = answers.severity;
  if (sev === "Severe – daily struggle") return "this is a daily struggle right now";
  if (sev === "Moderate – frequent") return "this is happening fairly often";
  if (sev === "Mild – occasional") return "this shows up occasionally";
  return null;
}

function frequencyClause(answers: Record<string, string | string[]>): string | null {
  const freq = answers.common_frequency;
  if (freq === "Daily") return "you've reported this happens most days";
  if (freq === "Weekly") return "you've reported this happens frequently";
  if (freq === "Rare") return "this still matters when it appears";
  return null;
}

function situationClause(answers: Record<string, string | string[]>): string | null {
  if (answers.distance === "Long" && answers.child_behavior === "Restless") {
    return "long trips trigger restlessness";
  }
  if (answers.distance === "Long") return "long trips are the hardest";
  if (answers.child_behavior === "Restless") return "restlessness is the main concern";
  if (answers.location === "Public") return "public moments are especially tough";
  if (answers.trigger === "Tired") return "tiredness is a big trigger";
  if (answers.trigger === "Denied") return "hearing no often sets things off";
  if (answers.emotion_type === "Anger") return "anger shows up most often";
  if (answers.delay_reason === "Screen") return "screens are delaying bedtime";
  if (answers.bedtime && typeof answers.bedtime === "string") return "bedtime timing is part of the pattern";
  const triggers = answers.triggers;
  if (Array.isArray(triggers) && triggers.length > 0) {
    const first = String(triggers[0]).toLowerCase();
    if (first.includes("transition")) return "transitions are a common trigger";
    if (first.includes("tired")) return "tiredness plays a big role";
    if (first.includes("hunger")) return "hunger is often involved";
    return `${first} is a pattern you've noticed`;
  }
  return null;
}

function buildContextClause(input: CoachWinRationaleInput): string {
  const parts: string[] = [];
  const situation = situationClause(input.answers);
  const frequency = frequencyClause(input.answers);
  const severity = severityClause(input.answers);
  const age = ageClause(input.answers);

  if (situation) parts.push(situation);
  if (frequency) parts.push(frequency);
  if (!situation && !frequency && severity) parts.push(severity);
  if (parts.length === 0 && age) parts.push(age);

  if (parts.length === 0) {
    const goal = input.goalTitle.toLowerCase();
    return `you're working on ${goal}`;
  }

  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} and ${parts[1]}`;
}

function priorFeedbacks(
  feedbackByWin: Record<number, CoachFeedback>,
  currentWinNumber: number,
): CoachFeedback[] {
  return Object.entries(feedbackByWin)
    .filter(([wn]) => Number(wn) < currentWinNumber)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, f]) => f);
}

function feedbackTone(priors: CoachFeedback[], trend: ProgressTrend): "fresh" | "improving" | "stalled" | "not_yet_heavy" | "building" {
  if (priors.length === 0) return "fresh";
  const noCount = priors.filter((f) => f === "no").length;
  const yesCount = priors.filter((f) => f === "yes").length;
  const somewhatCount = priors.filter((f) => f === "somewhat").length;
  const recent = priors.slice(-3);
  const recentNo = recent.filter((f) => f === "no").length;

  if (recentNo >= 2 || (recentNo >= 1 && noCount >= 2)) return "not_yet_heavy";
  if (trend === "improving" || trend === "strong_momentum" || yesCount >= 2) return "improving";
  if (somewhatCount >= 1 && yesCount >= 1) return "building";
  if (noCount >= 1 || trend === "needs_attention") return "stalled";
  if (somewhatCount >= 1) return "building";
  return "fresh";
}

function priorFeedbackRows(
  feedbackByWin: Record<number, CoachFeedback>,
  currentWinNumber: number,
): { win: number; feedback: string; at: string }[] {
  return Object.entries(feedbackByWin)
    .filter(([wn]) => Number(wn) < currentWinNumber)
    .map(([wn, feedback]) => ({
      win: Number(wn),
      feedback,
      at: new Date().toISOString(),
    }));
}

export function buildCoachWinRationale(input: CoachWinRationaleInput): string {
  const focus = winFocusPhrase(input.win);
  const context = buildContextClause(input);
  const priors = priorFeedbacks(input.feedbackByWin, input.win.win);
  const trend = computeProgressTrend(priorFeedbackRows(input.feedbackByWin, input.win.win));
  const tone = feedbackTone(priors, trend);
  const seed = hashSeed([input.goalId, input.win.win, input.winDeckIndex, input.win.title]);
  const usedHashes = input.usedPhraseHashes ?? [];

  const isAdaptive = input.win.win > 12 || (!input.isFirstCoachingWin && priors.length > 0 && priors[priors.length - 1] !== "yes");

  let chosen: { text: string; hash: string };

  if (tone === "not_yet_heavy") {
    chosen = pickRationale(seed, [
      `Amy is shifting focus to better understand the pattern before introducing more advanced strategies. Because ${context}, this win introduces ${focus}.`,
      `Because earlier steps haven't landed yet and ${context}, Amy is trying a simpler angle with ${focus}.`,
      `Amy noticed this goal needs a different starting point. With ${context} in mind, ${focus} is the next small step.`,
    ], usedHashes);
  } else if (tone === "improving" || tone === "building") {
    chosen = pickRationale(seed, [
      `Amy noticed that what you're trying is helping, so this win builds on what's already working. Next up: ${focus}.`,
      `Because you've already made progress and ${context}, Amy is building on that strength with ${focus}.`,
      `Amy is continuing momentum from your recent wins. Given ${context}, ${focus} is the natural next step.`,
    ], usedHashes);
  } else if (tone === "stalled" || isAdaptive) {
    chosen = pickRationale(seed, [
      `Amy is trying a different approach because previous strategies haven't created enough improvement yet. This win focuses on ${focus}.`,
      `Because ${context}, Amy selected a fresh angle — ${focus} — to move things forward.`,
      `Amy is adjusting the plan based on what's been harder lately. With ${context} in mind, ${focus} is worth trying next.`,
    ], usedHashes);
  } else {
    chosen = pickRationale(seed, [
      `Because ${context}, Amy is starting with ${focus} — a small step you can try right away.`,
      `Given ${context}, Amy chose ${focus} as the strongest place to begin.`,
      `Because ${context}, Amy is focusing first on ${focus} so you can see progress without changing everything at once.`,
      `Amy selected ${focus} to start because ${context}.`,
    ], usedHashes);
  }

  const withFamily = maybeWeaveFamilyReference(chosen.text, input.familyReference, seed);
  return trimForDensity(withFamily, input.contentDensity);
}
