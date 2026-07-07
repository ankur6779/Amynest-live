export interface QualityCandidate {
  title: string;
  body: string;
  goal?: string;
  /** True for monetization copy — sales-pressure checks are stricter. */
  monetization?: boolean;
}

export interface QualityEvaluation {
  /** 0–100 composite copy quality. */
  score: number;
  passed: boolean;
  /** Sub-scores for transparency/analytics. */
  dimensions: {
    clarity: number;
    value: number;
    emotion: number;
    curiosity: number;
    actionability: number;
    length: number;
    spamRisk: number;      // higher = safer (inverted risk)
    generic: number;       // higher = less generic
    salesPressure: number; // higher = less pressure
  };
  /** Human-readable reasons the candidate failed or was penalized. */
  reasons: string[];
}

const DEFAULT_THRESHOLD = 60;

const GENERIC_PHRASES = [
  "open amynest",
  "open the app",
  "check the app",
  "complete today's lesson",
  "upgrade now",
  "don't miss out",
  "click here",
  "tap here",
  "new update",
];

const SPAM_MARKERS = [
  "!!!",
  "free!!!",
  "act now",
  "limited time only",
  "100%",
  "guaranteed",
  "$$$",
  "winner",
];

const FAKE_URGENCY = [
  "last chance",
  "final hours",
  "only today",
  "hurry",
  "expires in minutes",
  "now or never",
];

const ACTION_VERBS = [
  "try", "start", "create", "see", "review", "practice", "play", "read",
  "keep", "continue", "explore", "pick", "unlock", "celebrate", "check in",
];

/**
 * Evaluate the linguistic quality of a rendered notification's copy. Runs on
 * the *final* title/body (any source: pool, outcome, conversion, winback), so
 * it is a universal quality gate. Pure and deterministic.
 */
export function evaluateQuality(
  candidate: QualityCandidate,
  threshold = DEFAULT_THRESHOLD,
): QualityEvaluation {
  const reasons: string[] = [];
  const title = candidate.title?.trim() ?? "";
  const body = candidate.body?.trim() ?? "";
  const text = `${title} ${body}`.toLowerCase();

  const clarity = scoreClarity(title, body, reasons);
  const length = scoreLength(title, body, reasons);
  const generic = scoreGeneric(text, reasons);
  const spamRisk = scoreSpam(title, body, text, reasons);
  const salesPressure = scoreSalesPressure(text, candidate.monetization, reasons);
  const actionability = scoreActionability(text, reasons);
  const emotion = scoreEmotion(text);
  const curiosity = scoreCuriosity(text);
  const value = scoreValue(text, candidate.goal);

  const dimensions = {
    clarity,
    value,
    emotion,
    curiosity,
    actionability,
    length,
    spamRisk,
    generic,
    salesPressure,
  };

  // Weighted composite. Safety dimensions (spam, sales pressure, generic) are
  // weighted heavily because violating them harms trust the most.
  const score = clampScore(
    clarity * 0.16 +
      value * 0.16 +
      actionability * 0.12 +
      generic * 0.14 +
      spamRisk * 0.14 +
      salesPressure * 0.12 +
      emotion * 0.06 +
      curiosity * 0.05 +
      length * 0.05,
  );

  // Hard fails regardless of composite. Known generic filler and missing
  // title/body are always rejected — they are the exact failure modes this
  // gate exists to stop.
  const hardFail =
    !title ||
    !body ||
    reasons.some((r) => r.startsWith("generic:")) ||
    spamRisk < 40 ||
    salesPressure < 35 ||
    generic < 30 ||
    clarity < 30 ||
    length < 25;
  if (hardFail) reasons.push("hard_fail_threshold");

  return {
    score,
    passed: score >= threshold && !hardFail,
    dimensions,
    reasons,
  };
}

function scoreClarity(title: string, body: string, reasons: string[]): number {
  let score = 90;
  if (!title) { score -= 40; reasons.push("missing_title"); }
  if (!body) { score -= 40; reasons.push("missing_body"); }
  const sentences = body.split(/[.!?]/).filter((s) => s.trim().length > 0);
  if (sentences.length > 3) { score -= 15; reasons.push("too_many_sentences"); }
  // Excessive emoji hurts clarity.
  const emojiCount = (body.match(/\p{Extended_Pictographic}/gu) ?? []).length;
  if (emojiCount > 2) { score -= 10; reasons.push("emoji_overload"); }
  return clampScore(score);
}

function scoreLength(title: string, body: string, reasons: string[]): number {
  let score = 100;
  if (title.length > 50) { score -= 20; reasons.push("title_too_long"); }
  if (title.length > 0 && title.length < 8) { score -= 10; reasons.push("title_too_short"); }
  if (body.length > 140) { score -= 25; reasons.push("body_too_long"); }
  if (body.length > 0 && body.length < 20) { score -= 15; reasons.push("body_too_short"); }
  return clampScore(score);
}

function scoreGeneric(text: string, reasons: string[]): number {
  let score = 100;
  for (const phrase of GENERIC_PHRASES) {
    if (text.includes(phrase)) { score -= 40; reasons.push(`generic:${phrase}`); }
  }
  return clampScore(score);
}

function scoreSpam(title: string, body: string, text: string, reasons: string[]): number {
  let score = 100;
  for (const m of SPAM_MARKERS) {
    if (text.includes(m)) { score -= 35; reasons.push(`spam:${m}`); }
  }
  if (/[A-Z]{5,}/.test(`${title} ${body}`)) { score -= 20; reasons.push("shouting_caps"); }
  const exclamations = (text.match(/!/g) ?? []).length;
  if (exclamations >= 3) { score -= 20; reasons.push("exclamation_spam"); }
  return clampScore(score);
}

function scoreSalesPressure(text: string, monetization: boolean | undefined, reasons: string[]): number {
  let score = 100;
  for (const p of FAKE_URGENCY) {
    if (text.includes(p)) { score -= 40; reasons.push(`fake_urgency:${p}`); }
  }
  if (monetization) {
    // Monetization copy should lead with value, not pressure.
    const pressureWords = ["buy now", "subscribe now", "upgrade now", "pay"];
    for (const w of pressureWords) {
      if (text.includes(w)) { score -= 25; reasons.push(`sales_pressure:${w}`); }
    }
  }
  return clampScore(score);
}

function scoreActionability(text: string, reasons: string[]): number {
  const hasVerb = ACTION_VERBS.some((v) => text.includes(v));
  if (!hasVerb) reasons.push("no_clear_action");
  return hasVerb ? 85 : 45;
}

function scoreEmotion(text: string): number {
  const warm = ["love", "proud", "great", "wonderful", "gentle", "care", "celebrate", "💛", "🌟", "🎉"];
  const hits = warm.filter((w) => text.includes(w)).length;
  return clampScore(50 + hits * 15);
}

function scoreCuriosity(text: string): number {
  const markers = ["did you know", "curious", "wonder", "guess", "discover", "?", "surprise"];
  const hits = markers.filter((w) => text.includes(w)).length;
  return clampScore(45 + hits * 15);
}

function scoreValue(text: string, goal: string | undefined): number {
  let score = 60;
  // Concrete nouns / numbers signal real value.
  if (/\d/.test(text)) score += 15;
  const valueWords = ["streak", "progress", "routine", "lesson", "milestone", "plan", "practice", "story"];
  score += Math.min(20, valueWords.filter((w) => text.includes(w)).length * 7);
  if (goal === "GOAL_SUBSCRIPTION" && !/(trial|premium|plan|unlock)/.test(text)) score -= 10;
  return clampScore(score);
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
