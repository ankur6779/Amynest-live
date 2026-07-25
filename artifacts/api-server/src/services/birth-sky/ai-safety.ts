/**
 * Output safety validation (Pack 6 §6 / Pack 5 educational boundaries).
 */

const BLOCK_PATTERNS: Array<{ re: RegExp; code: string }> = [
  { re: /\b(cancer|tumor|diagnos(?:e|is)|autism|ADHD|vaccine)\b/i, code: "medical" },
  { re: /\b(will (be|become|marry|die)|destined|fated|guaranteed|cursed|doomed)\b/i, code: "prediction" },
  { re: /\b(rich|poor|millionaire|bankrupt|salary)\b/i, code: "financial" },
  { re: /\b(divorce|soulmate|arranged marriage|toxic (parent|child))\b/i, code: "relationship" },
  { re: /\bNASA proves\b/i, code: "science_launder" },
];

const TRADITION_CLAIM =
  /\b(nakshatra|in tradition|traditionally|cultural|lunar mansion)\b/i;
const TRADITION_LABEL =
  /\b(in tradition|traditional|cultural (story|interpretation|lens)|not (science|scientific))\b/i;

export type SafetyResult =
  | { ok: true; text: string }
  | { ok: false; code: string; fallback: string };

export const BIRTH_SKY_SAFETY_FALLBACK =
  "I can stay with gentle, parent-only reflection about the sky — without predicting your child’s future or making medical or financial claims. What would you like to notice together today?";

export function validateBirthSkyAiOutput(text: string): SafetyResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, code: "empty", fallback: BIRTH_SKY_SAFETY_FALLBACK };
  }
  for (const rule of BLOCK_PATTERNS) {
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
