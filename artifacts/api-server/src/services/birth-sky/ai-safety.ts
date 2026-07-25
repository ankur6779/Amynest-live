/**
 * Output safety validation (Pack 6 §6 / Pack 5 educational boundaries).
 * Zodiac sign names (e.g. Cancer) must never trigger medical blocks.
 * Ordinary parenting English (e.g. "will be") must not trigger prediction blocks.
 */

const MEDICAL_PATTERNS: RegExp[] = [
  // Disease / clinical cancer — not the zodiac sign
  /\b(breast|lung|skin|colon|blood|pancreatic|prostate|ovarian|thyroid|stomach|liver|bone|brain)\s+cancer\b/i,
  /\b(has|have|had|gets?|getting|got|develop(?:s|ed|ing)?|diagnosed with|treat(?:s|ed|ing|ment for)?)\s+cancer\b/i,
  /\bcancer\s+(treatment|diagnosis|patient|cells|risk|therapy|survivor)\b/i,
  /\b(tumor|tumour|diagnos(?:e|is|ed|ing)|autism|ADHD|vaccine)\b/i,
];

const PREDICTION_PATTERNS: RegExp[] = [
  // Keep genuine future-certainty claims; do not block ordinary "will be"
  /\bwill (become|marry|die)\b/i,
  /\bwill be (a |an )?(doctor|lawyer|engineer|millionaire|celebrity|star|rich|poor|famous)\b/i,
  /\b(destined|fated|guaranteed|cursed|doomed)\b/i,
];

const OTHER_BLOCK_PATTERNS: Array<{ re: RegExp; code: string }> = [
  { re: /\b(rich|poor|millionaire|bankrupt|salary)\b/i, code: "financial" },
  { re: /\b(divorce|soulmate|arranged marriage|toxic (parent|child))\b/i, code: "relationship" },
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

export const BIRTH_SKY_SAFETY_FALLBACK =
  "I can stay with gentle, parent-only reflection about the sky — without predicting your child’s future or making medical or financial claims. What would you like to notice together today?";

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

export function validateBirthSkyAiOutput(text: string): SafetyResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, code: "empty", fallback: BIRTH_SKY_SAFETY_FALLBACK };
  }

  const medicalProbe = stripZodiacCancer(trimmed);
  if (matchesAny(medicalProbe, MEDICAL_PATTERNS)) {
    return { ok: false, code: "medical", fallback: BIRTH_SKY_SAFETY_FALLBACK };
  }

  if (matchesAny(trimmed, PREDICTION_PATTERNS)) {
    return { ok: false, code: "prediction", fallback: BIRTH_SKY_SAFETY_FALLBACK };
  }

  for (const rule of OTHER_BLOCK_PATTERNS) {
    if (rule.re.test(trimmed)) {
      return { ok: false, code: rule.code, fallback: BIRTH_SKY_SAFETY_FALLBACK };
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
