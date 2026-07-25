/**
 * Output safety validation (Pack 6 §6 / Pack 5 educational boundaries).
 * Zodiac sign names (e.g. Cancer) must never trigger medical blocks.
 * Ordinary parenting English (e.g. "will be", "poor sleep", "rich inner world")
 * must not trigger prediction/financial blocks.
 */

const MEDICAL_PATTERNS: RegExp[] = [
  // Disease / clinical cancer — not the zodiac sign
  /\b(breast|lung|skin|colon|blood|pancreatic|prostate|ovarian|thyroid|stomach|liver|bone|brain)\s+cancer\b/i,
  /\b(has|have|had|gets?|getting|got|develop(?:s|ed|ing)?|diagnosed with|treat(?:s|ed|ing|ment for)?)\s+cancer\b/i,
  /\bcancer\s+(treatment|diagnosis|patient|cells|risk|therapy|survivor)\b/i,
  // Clinical diagnosis claims only — not "ADHD-like focus" parenting language
  /\b(tumor|tumour|diagnos(?:e|is|ed|ing)\s+(autism|adhd|cancer)|diagnosed with\s+(autism|adhd))\b/i,
  /\b(vaccine\s+(schedule|mandate|causes?|will))\b/i,
];

const PREDICTION_PATTERNS: RegExp[] = [
  // Keep genuine future-certainty claims; do not block ordinary "will be"
  /\bwill (become|marry|die)\b/i,
  /\bwill be (a |an )?(doctor|lawyer|engineer|millionaire|celebrity|star|rich|poor|famous)\b/i,
  /\b(destined|fated|guaranteed|cursed|doomed)\b/i,
];

/** Wealth/money claims only — not "poor sleep" / "rich inner world". */
const OTHER_BLOCK_PATTERNS: Array<{ re: RegExp; code: string }> = [
  {
    re: /\b(millionaire|bankrupt|salary|net worth|stock tips?|investment returns?)\b/i,
    code: "financial",
  },
  {
    re: /\b(become|stay|end up|born to be)\s+(rich|poor)\b/i,
    code: "financial",
  },
  {
    re: /\b(financially|monetarily)\s+(rich|poor|successful)\b/i,
    code: "financial",
  },
  {
    re: /\b(divorce|soulmate|arranged marriage|toxic (parent|child))\b/i,
    code: "relationship",
  },
  { re: /\bNASA proves\b/i, code: "science_launder" },
];

/** Strip zodiac "Cancer" mentions so leftover medical "cancer" can still be detected. */
function stripZodiacCancer(text: string): string {
  return text
    .replace(/\b(in|sign|sun|moon|rising|ascendant|with)\s+Cancer\b/gi, " ")
    .replace(/\bCancer\s+(sun|moon|rising|sign|ascendant|themes?|energy|story)\b/gi, " ")
    .replace(/\bMoon in Cancer\b/gi, " ")
    .replace(/\bSun in Cancer\b/gi, " ")
    .replace(/\bRising Cancer\b/gi, " ");
}

const TRADITION_CLAIM =
  /\b(nakshatra|in tradition|traditionally|cultural|lunar mansion)\b/i;
const TRADITION_LABEL =
  /\b(in tradition|traditional|cultural (story|interpretation|lens)|not (science|scientific))\b/i;

export type SafetyResult =
  | { ok: true; text: string }
  | { ok: false; code: string; fallback: string };

/** Legacy single stub — kept for tests that import the constant. */
export const BIRTH_SKY_SAFETY_FALLBACK =
  "I can stay with gentle, parent-only reflection about the sky — without predicting your child’s future or making medical or financial claims. What would you like to notice together today?";

const FALLBACKS_BY_CODE: Record<string, readonly string[]> = {
  empty: [
    "I want to answer carefully, but that reply came through empty. Ask again in your own words and I’ll stay with parent-only sky reflection.",
    "Something incomplete came back on my side. Share the question once more and we’ll look at the sky together — no predictions.",
  ],
  medical: [
    "I won’t use the sky for medical claims. We can stay with mood, routines, and how you support them day to day — what feels most useful right now?",
    "Health diagnosis isn’t something Amy Astro can do. If you want, we can notice emotional rhythms in the chart and one gentle parenting move instead.",
    "I’m stepping away from medical territory. Tell me what you’re seeing at home (sleep, overwhelm, transitions) and I’ll reflect with the sky — not a diagnosis.",
  ],
  prediction: [
    "I won’t predict their future from the sky. I can stay with tendencies to notice and how you might support them this week — what would help most?",
    "Fate and career forecasts stay off the table here. Want a reflective read on Sun/Moon themes and one practical parenting try instead?",
    "I’m keeping this free of destiny claims. We can look at belonging, energy, or learning style in their chart — which feels relevant tonight?",
  ],
  financial: [
    "I won’t tie the sky to money outcomes. We can still explore confidence, effort, and how you celebrate small wins — shall we start there?",
    "Wealth predictions aren’t part of Amy Astro. If useful, I can reflect on motivation or creativity themes and one parent move you can try.",
  ],
  relationship: [
    "I won’t forecast relationship fate from the chart. We can talk about belonging, friendship friction, or co-regulation — what are you seeing?",
    "Soulmate or divorce claims stay out of scope. Want help noticing how they enter social spaces, grounded in Sun/Moon only?",
  ],
  science_launder: [
    "I won’t claim science “proves” personality from a chart. I can offer reflective astronomy plus optional tradition — clearly labeled. What would you like to explore?",
    "No NASA-or-lab proofs here — only sky facts and parent reflection. Ask again and I’ll keep that boundary.",
  ],
};

const FALLBACKS_DEFAULT: readonly string[] = [
  BIRTH_SKY_SAFETY_FALLBACK,
  "I’ll keep this parent-only and free of predictions. Share what you’re curious about in their sky and we’ll notice it together.",
  "Staying with reflection, not fortune-telling. What part of their chart or day would you like to look at gently?",
  "I can explore tendencies and parenting support — not fate, health, or money claims. What would you like to notice next?",
];

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Pick a truthful safety fallback. Variety is deterministic per seed so the
 * same job/code pair stays stable if retried, without inventing chart facts.
 */
export function pickBirthSkySafetyFallback(
  code: string,
  seed = `${code}:${Date.now()}`,
): string {
  const pool = FALLBACKS_BY_CODE[code] ?? FALLBACKS_DEFAULT;
  const idx = hashSeed(seed) % pool.length;
  return pool[idx]!;
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

export function validateBirthSkyAiOutput(
  text: string,
  opts?: { fallbackSeed?: string },
): SafetyResult {
  const trimmed = text.trim();
  const seed = opts?.fallbackSeed;
  const fallbackFor = (code: string) =>
    pickBirthSkySafetyFallback(code, seed ? `${code}:${seed}` : code);

  if (!trimmed) {
    return { ok: false, code: "empty", fallback: fallbackFor("empty") };
  }

  const medicalProbe = stripZodiacCancer(trimmed);
  if (matchesAny(medicalProbe, MEDICAL_PATTERNS)) {
    return { ok: false, code: "medical", fallback: fallbackFor("medical") };
  }

  if (matchesAny(trimmed, PREDICTION_PATTERNS)) {
    return { ok: false, code: "prediction", fallback: fallbackFor("prediction") };
  }

  for (const rule of OTHER_BLOCK_PATTERNS) {
    if (rule.re.test(trimmed)) {
      return { ok: false, code: rule.code, fallback: fallbackFor(rule.code) };
    }
  }

  if (TRADITION_CLAIM.test(trimmed) && !TRADITION_LABEL.test(trimmed)) {
    return {
      ok: true,
      text: `${trimmed}\n\n(In tradition — cultural interpretation, not science or a prediction.)`,
    };
  }
  return { ok: true, text: trimmed };
}
