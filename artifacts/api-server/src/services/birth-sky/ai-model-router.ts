/**
 * Intelligent model routing for Amy Astro Intelligence.
 *
 * Weighted scoring + conversation memory — not keyword-only or turn-count escalation.
 * Env-overridable model ids; never hardcode at call sites.
 */

export type BirthSkyModelTier = "fast" | "reasoning";

export type BirthSkyRouteDecision = {
  tier: BirthSkyModelTier;
  model: string;
  reason: string;
  /** 0–1 confidence in the routing decision. */
  confidence: number;
  /** True when this turn was promoted above the conversation's prior tier. */
  escalated: boolean;
  /** True when this turn would have been reasoning but stickiness/simple path kept fast — always false for demote-blocked. */
  downgraded: boolean;
  /** Factor breakdown for telemetry / tuning. */
  scores: BirthSkyRouteScores;
};

export type BirthSkyRouteScores = {
  emotional: number;
  parenting: number;
  reasoning: number;
  reflection: number;
  keepsake: number;
  planning: number;
  multiQuestion: number;
  conversationDepth: number;
  stickiness: number;
  simpleBias: number;
  total: number;
};

export type BirthSkyRecentTurn = {
  role: "user" | "assistant";
  body: string;
};

export type BirthSkyRouteInput = {
  userText: string;
  /** Prior user+assistant turns (length only — not used alone for escalation). */
  priorTurnCount?: number;
  entryPoint?: string | null;
  /** Recent conversation turns for memory-aware scoring. */
  recentTurns?: BirthSkyRecentTurn[];
  /** Last routed tier in this conversation (stickiness / no quality downgrade). */
  priorTier?: BirthSkyModelTier | null;
};

/** Escalate when weighted score reaches this (tunable via env). */
function escalationThreshold(): number {
  const raw = Number(process.env.OPENAI_CHAT_ROUTE_THRESHOLD);
  return Number.isFinite(raw) && raw > 0 ? raw : 7;
}

/** Env-driven model ids — never scatter hardcodes at call sites. */
export function resolveBirthSkyModelCatalog(): {
  fast: string;
  reasoning: string;
} {
  const legacy = process.env.OPENAI_CHAT_MODEL?.trim();
  return {
    fast:
      process.env.OPENAI_CHAT_MODEL_FAST?.trim() ||
      legacy ||
      "gpt-5-mini",
    reasoning:
      process.env.OPENAI_CHAT_MODEL_REASONING?.trim() ||
      legacy ||
      "gpt-5",
  };
}

/** @deprecated Prefer resolveBirthSkyModelCatalog + routeBirthSkyModel */
export function getDefaultBirthSkyModel(): string {
  return resolveBirthSkyModelCatalog().fast;
}

const SIMPLE_PATTERNS: RegExp[] = [
  /\bwhat is\b/i,
  /\bwhat's\b/i,
  /\bexplain\b/i,
  /\bsummarize\b/i,
  /\bsummary\b/i,
  /\bmeaning\b/i,
  /\btell me about\b/i,
  /\bshort answer\b/i,
  /\bin brief\b/i,
  /\bquickly\b/i,
  /\bplanet\b/i,
  /\bsun sign\b/i,
  /\bmoon sign\b/i,
  /\brising\b/i,
  /\bphase\b/i,
  /\bwhat does .+ mean\b/i,
  /\bdefine\b/i,
  /\bday sky\b/i,
  /\bmidheaven\b/i,
];

/** Whole-message acks / ultra-short nudges only — must not match "How can I…". */
const QUICK_FOLLOWUP =
  /^(yes|no|ok|okay|thanks|thank you|and|more|why\??|how\??|and then\??|tell me more|got it|cool|sure)[\s.!?]*$/i;

const EMOTIONAL_STRONG: RegExp[] = [
  /\banxiety\b/i,
  /\banxious\b/i,
  /\bmeltdown\b/i,
  /\btrauma\b/i,
  /\boverwhelm/i,
  /\bterrified\b/i,
  /\bpanic\b/i,
  /\bheartbroken\b/i,
  /\bshame\b/i,
];

const EMOTIONAL_MILD: RegExp[] = [
  /\bemotion/i,
  /\bfeelings?\b/i,
  /\bangry\b/i,
  /\bworried\b/i,
  /\bsad\b/i,
  /\bfear/i,
  /\bsecure\b/i,
  /\battachment\b/i,
  /\bbelong/i,
];

const PARENTING_DEEP: RegExp[] = [
  /\bsibling/i,
  /\bbull(y|ying)\b/i,
  /\bbehaviou?r\b/i,
  /\bschool\b/i,
  /\bbedtime\b/i,
  /\bdiscipline\b/i,
  /\bco-?parent/i,
];

const PARENTING_MILD: RegExp[] = [
  /\bparenting\b/i,
  /\bparent\b/i,
  /\bfriendship/i,
  /\btransition/i,
];

const REASONING_DEEP: RegExp[] = [
  /\bidentity\b/i,
  /\bdifficult (decision|choice)/i,
  /\blong[- ]?term\b/i,
  /\bstrateg(y|ies)\b/i,
  /\bwhat should i (do|try|say)\b/i,
  /\bhow (can|do|should) i (help|support|handle|respond)\b/i,
  /\bhelp (me|them|him|her) (with|through|after)\b/i,
];

const REASONING_MILD: RegExp[] = [
  /\bdecision/i,
  /\bfuture\b/i,
  /\bconfidence\b/i,
  /\bhow (can|do|should) i\b/i,
  /\bhelp (me|them)\b/i,
  /\bsupport (their|my|him|her)\b/i,
];

const PLANNING: RegExp[] = [
  /\bfuture planning\b/i,
  /\blong[- ]?term\b/i,
  /\bover the (next )?(year|months|weeks)\b/i,
  /\bplan for\b/i,
  /\bstrategy\b/i,
];

const REFLECTION_PATTERNS: RegExp[] = [
  /\breflect/i,
  /\bjournal\b/i,
  /\bwrite (a |me )?(note|reflection|letter)/i,
  /\bclosing lantern\b/i,
  /\bmindful closing\b/i,
];

const KEEPSAKE_PATTERNS: RegExp[] = [
  /\bkeepsake\b/i,
  /\bprint\b/i,
  /\bheirloom\b/i,
  /\bcommemorat/i,
  /\bmemory book\b/i,
  /\bfor grandparents\b/i,
];

function countMatches(text: string, patterns: RegExp[]): number {
  let n = 0;
  for (const re of patterns) {
    if (re.test(text)) n += 1;
  }
  return n;
}

function isQuickFollowup(text: string): boolean {
  const t = text.trim();
  if (QUICK_FOLLOWUP.test(t)) return true;
  // Ultra-short ack-like only — do NOT treat substantive short questions as follow-ups
  if (t.length >= 40) return false;
  const hasComplexity =
    countMatches(t, EMOTIONAL_STRONG) +
      countMatches(t, EMOTIONAL_MILD) +
      countMatches(t, PARENTING_DEEP) +
      countMatches(t, REASONING_DEEP) +
      countMatches(t, REASONING_MILD) +
      countMatches(t, PLANNING) >
    0;
  if (hasComplexity) return false;
  if (REFLECTION_PATTERNS.some((re) => re.test(t))) return false;
  if (KEEPSAKE_PATTERNS.some((re) => re.test(t))) return false;
  if (countMatches(t, SIMPLE_PATTERNS) > 0) return false;
  // Bare acks / fragments only
  return t.split(/\s+/).length <= 4 && t.length < 24;
}

function isClearlySimple(text: string): boolean {
  if (countMatches(text, SIMPLE_PATTERNS) === 0) return false;
  // Simple explain/summarize without deep emotional load
  return (
    countMatches(text, EMOTIONAL_STRONG) === 0 &&
    countMatches(text, REASONING_DEEP) === 0 &&
    !KEEPSAKE_PATTERNS.some((re) => re.test(text)) &&
    !REFLECTION_PATTERNS.some((re) => re.test(text))
  );
}

function scoreText(text: string): Omit<BirthSkyRouteScores, "conversationDepth" | "stickiness" | "total"> {
  let emotional =
    countMatches(text, EMOTIONAL_STRONG) * 4 + countMatches(text, EMOTIONAL_MILD) * 2;
  let parenting =
    countMatches(text, PARENTING_DEEP) * 3 + countMatches(text, PARENTING_MILD) * 1.5;
  const reasoning =
    countMatches(text, REASONING_DEEP) * 4 + countMatches(text, REASONING_MILD) * 2;

  // Compound parenting + emotional intensity (e.g. anxiety at school)
  if (
    countMatches(text, EMOTIONAL_STRONG) > 0 &&
    countMatches(text, PARENTING_DEEP) > 0
  ) {
    emotional += 2;
    parenting += 2;
  }
  const reflection = REFLECTION_PATTERNS.some((re) => re.test(text)) ? 12 : 0;
  const keepsake = KEEPSAKE_PATTERNS.some((re) => re.test(text)) ? 12 : 0;
  const planning = countMatches(text, PLANNING) * 3;

  const qMarks = (text.match(/\?/g) ?? []).length;
  const multiCue = /\b(and also|secondly|another thing|plus)\b/i.test(text);
  const multiQuestion = (qMarks >= 2 ? 3 : 0) + (multiCue ? 2 : 0);

  // Light tip / short tip questions get a mild simple bias even with soft parenting words
  const tipLite =
    text.length < 90 &&
    /\b(tip|briefly|quickly|short)\b/i.test(text) &&
    countMatches(text, EMOTIONAL_STRONG) === 0
      ? 3
      : 0;

  const simpleHits = countMatches(text, SIMPLE_PATTERNS);
  const simpleBias =
    (isClearlySimple(text) ? 5 : 0) +
    (simpleHits > 0 && text.length < 100 ? 2 : 0) +
    (isQuickFollowup(text) ? 4 : 0) +
    tipLite;

  return {
    emotional,
    parenting,
    reasoning,
    reflection,
    keepsake,
    planning,
    multiQuestion,
    simpleBias,
  };
}

function scoreHistory(recentTurns: BirthSkyRecentTurn[] | undefined): {
  conversationDepth: number;
  priorWasDeep: boolean;
} {
  if (!recentTurns?.length) return { conversationDepth: 0, priorWasDeep: false };
  const userBodies = recentTurns
    .filter((t) => t.role === "user")
    .map((t) => t.body)
    .slice(-4);
  if (userBodies.length === 0) return { conversationDepth: 0, priorWasDeep: false };

  let deepHits = 0;
  let maxScore = 0;
  for (const body of userBodies) {
    const s = scoreText(body);
    const raw =
      s.emotional +
      s.parenting +
      s.reasoning +
      s.reflection +
      s.keepsake +
      s.planning +
      s.multiQuestion -
      s.simpleBias;
    maxScore = Math.max(maxScore, raw);
    if (raw >= escalationThreshold()) deepHits += 1;
  }

  // Depth from content complexity across history — not raw turn count
  const conversationDepth = Math.min(5, deepHits * 2 + (maxScore >= 5 ? 1 : 0));
  return { conversationDepth, priorWasDeep: deepHits > 0 || maxScore >= escalationThreshold() };
}

function pickDecision(
  tier: BirthSkyModelTier,
  reason: string,
  confidence: number,
  scores: BirthSkyRouteScores,
  priorTier: BirthSkyModelTier | null | undefined,
): BirthSkyRouteDecision {
  const catalog = resolveBirthSkyModelCatalog();
  const escalated = tier === "reasoning" && priorTier !== "reasoning";
  // We never demote an active deep thread — downgraded stays false by design when stickiness holds reasoning
  const downgraded = false;
  return {
    tier,
    model: tier === "reasoning" ? catalog.reasoning : catalog.fast,
    reason,
    confidence,
    escalated,
    downgraded,
    scores,
  };
}

function primaryReason(scores: BirthSkyRouteScores, forced?: string): string {
  if (forced) return forced;
  const ranked: Array<[string, number]> = [
    ["keepsake", scores.keepsake],
    ["reflection", scores.reflection],
    ["emotional", scores.emotional],
    ["reasoning", scores.reasoning],
    ["parenting", scores.parenting],
    ["planning", scores.planning],
    ["multi_question", scores.multiQuestion],
    ["conversation_depth", scores.conversationDepth],
    ["stickiness", scores.stickiness],
  ];
  ranked.sort((a, b) => b[1] - a[1]);
  const top = ranked[0];
  if (top && top[1] > 0) return `score:${top[0]}`;
  if (scores.simpleBias > 0) return "simple";
  return "default_fast";
}

/**
 * Classify a parent prompt into fast (mini) vs reasoning (full) tier.
 * Starts new conversations on fast; escalates only when complexity warrants it;
 * never demotes quality during an active deep thread.
 */
export function routeBirthSkyModel(input: BirthSkyRouteInput): BirthSkyRouteDecision {
  const text = (input.userText ?? "").trim();
  const entry = (input.entryPoint ?? "").toLowerCase();
  const priorTier = input.priorTier ?? null;
  const threshold = escalationThreshold();

  const emptyScores: BirthSkyRouteScores = {
    emotional: 0,
    parenting: 0,
    reasoning: 0,
    reflection: 0,
    keepsake: 0,
    planning: 0,
    multiQuestion: 0,
    conversationDepth: 0,
    stickiness: 0,
    simpleBias: 0,
    total: 0,
  };

  if (!text) {
    return pickDecision("fast", "empty_prompt", 0.95, emptyScores, priorTier);
  }

  const base = scoreText(text);
  const { conversationDepth, priorWasDeep } = scoreHistory(input.recentTurns);

  // Hard keepsake / reflection (entry or text)
  const forceKeepsake =
    base.keepsake > 0 || entry.includes("keepsake");
  const forceReflection = base.reflection > 0 || entry === "reflect";

  // Stickiness: active deep thread + continuing substance → stay on reasoning
  const continuingDeep =
    (priorWasDeep || priorTier === "reasoning") &&
    !isClearlySimple(text) &&
    !isQuickFollowup(text) &&
    text.length >= 24 &&
    (base.emotional + base.parenting + base.reasoning + base.planning + base.multiQuestion) >= 2;

  const stickiness = continuingDeep ? 8 : 0;

  const total =
    base.emotional +
    base.parenting +
    base.reasoning +
    base.reflection +
    base.keepsake +
    base.planning +
    base.multiQuestion +
    conversationDepth +
    stickiness -
    base.simpleBias;

  const scores: BirthSkyRouteScores = {
    ...base,
    conversationDepth,
    stickiness,
    total,
  };

  if (forceKeepsake) {
    return pickDecision("reasoning", "keepsake", 0.98, scores, priorTier);
  }
  if (forceReflection) {
    return pickDecision("reasoning", "reflection", 0.97, scores, priorTier);
  }

  // Quick follow-ups stay on mini unless stickiness already applied above (continuingDeep false for ok/thanks)
  if (isQuickFollowup(text) && !continuingDeep) {
    return pickDecision("fast", "quick_followup", 0.9, scores, priorTier);
  }

  if (continuingDeep) {
    return pickDecision(
      "reasoning",
      "stickiness_deep_thread",
      0.88,
      scores,
      priorTier,
    );
  }

  if (total >= threshold) {
    const conf = Math.min(0.95, 0.55 + (total - threshold) * 0.05);
    return pickDecision("reasoning", primaryReason(scores), conf, scores, priorTier);
  }

  if (isClearlySimple(text)) {
    return pickDecision("fast", primaryReason(scores, "simple"), 0.92, scores, priorTier);
  }

  // Default: cost-optimized fast path (new conversations start here)
  return pickDecision("fast", primaryReason(scores, "default_fast"), 0.8, scores, priorTier);
}
