/**
 * Phase 7 — AI guardrails.
 *
 * Pure text validator + sanitizer applied to AI-generated content
 * (Amy AI Tutor replies, proactive lines, notification copy, etc).
 *
 * Catches:
 *  - clinical / diagnostic language ("your child has...", "disorder")
 *  - anxiety amplification ("urgent", "falling behind")
 *  - guilt framing ("you missed", "you failed")
 *  - manipulative urgency ("act now", "don't lose")
 *  - developmental claims unsupported by us ("delayed", "advanced for age")
 *  - emotional dependency cues ("you need me", "miss you")
 *
 * Returns a sanitized version (offending phrases replaced) plus the list of
 * violations so the host can log/alert.
 */

export type GuardrailCategory =
  | "diagnosis"
  | "anxiety"
  | "guilt"
  | "urgency"
  | "developmental_claim"
  | "dependency";

export interface GuardrailViolation {
  category: GuardrailCategory;
  matched: string;
  startIndex: number;
}

export interface GuardrailResult {
  text: string;
  safe: boolean;
  violations: GuardrailViolation[];
}

interface Pattern {
  pattern: RegExp;
  replacement: string;
  category: GuardrailCategory;
}

const PATTERNS: Pattern[] = [
  // ── diagnosis / clinical ──
  {
    pattern: /\b(diagnos\w*|disorder|adhd|autism|dyslexia|learning disability)\b/gi,
    replacement: "learning pattern",
    category: "diagnosis",
  },
  {
    pattern: /\b(should see a (specialist|doctor|therapist))\b/gi,
    replacement: "could explore extra support",
    category: "diagnosis",
  },
  // ── anxiety amplification ──
  {
    pattern: /\b(urgent(ly)?|critical|falling behind|behind their peers|alarming)\b/gi,
    replacement: "a gentle next step",
    category: "anxiety",
  },
  {
    pattern: /\b(worry|worried|concerning|concerned about)\b/gi,
    replacement: "notice",
    category: "anxiety",
  },
  // ── guilt framing ──
  {
    pattern: /\b(you (missed|skipped|failed|forgot))\b/gi,
    replacement: "we paused",
    category: "guilt",
  },
  {
    pattern: /\b(should have)\b/gi,
    replacement: "could",
    category: "guilt",
  },
  // ── urgency ──
  {
    pattern: /\b(act now|don'?t lose|last chance|hurry|don'?t miss)\b/gi,
    replacement: "whenever you're ready",
    category: "urgency",
  },
  // ── developmental claims ──
  {
    pattern: /\b(delayed|advanced for (their|his|her) age|abnormal|gifted)\b/gi,
    replacement: "growing at their own pace",
    category: "developmental_claim",
  },
  // ── emotional dependency ──
  {
    pattern: /\b(you need me|i need you|missed you|i'?ll be sad)\b/gi,
    replacement: "I'm here whenever it helps",
    category: "dependency",
  },
];

/**
 * Run guardrails on a piece of text. Replaces violating phrases with
 * warm/safe alternatives and returns the violation list.
 */
export function applyAiGuardrails(input: string): GuardrailResult {
  if (!input) return { text: "", safe: true, violations: [] };
  let text = input;
  const violations: GuardrailViolation[] = [];
  for (const { pattern, replacement, category } of PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    const local: GuardrailViolation[] = [];
    while ((m = pattern.exec(text)) != null) {
      local.push({ category, matched: m[0], startIndex: m.index });
      // Prevent infinite loops on zero-width matches.
      if (m.index === pattern.lastIndex) pattern.lastIndex += 1;
    }
    if (local.length > 0) {
      violations.push(...local);
      text = text.replace(pattern, replacement);
    }
  }
  return { text, safe: violations.length === 0, violations };
}

/** Apply guardrails to a list of lines and drop unsafe ones beyond a threshold. */
export function filterGuardedLines(
  lines: string[],
  opts?: { dropAtViolationsAbove?: number },
): { lines: string[]; allViolations: GuardrailViolation[] } {
  const limit = opts?.dropAtViolationsAbove ?? 3;
  const out: string[] = [];
  const all: GuardrailViolation[] = [];
  for (const l of lines) {
    const res = applyAiGuardrails(l);
    all.push(...res.violations);
    if (res.violations.length <= limit) out.push(res.text);
  }
  return { lines: out, allViolations: all };
}
