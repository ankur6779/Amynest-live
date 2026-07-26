/**
 * Safety audit — deterministic pattern checks on structured plan + synthetic prose tags.
 */

const FORBIDDEN_PATTERNS: Array<{ id: string; re: RegExp }> = [
  {
    id: "deterministic_future",
    re: /\b(will become|destined to|fated to|guaranteed to|must become)\b/i,
  },
  {
    id: "medical_diagnosis",
    re: /\b(diagnos(e|is|ed)|disorder|ADHD|autism spectrum|prescribe|medication)\b/i,
  },
  {
    id: "financial_advice",
    re: /\b(invest|stock market|make money|wealth destiny|financial fortune)\b/i,
  },
  {
    id: "fear_based",
    re: /\b(doomed|dangerous child|broken|hopeless|ruined forever)\b/i,
  },
];

export type SafetyAuditResult = {
  score: number;
  violations: string[];
  notes: string[];
};

/** Audit conversation plan tags + any optional free text. */
export function auditSafety(input: {
  safetyFlags: string[];
  avoidTopics: string[];
  texts?: string[];
}): SafetyAuditResult {
  const violations: string[] = [];
  const notes: string[] = [];

  const requiredFlags = [
    "no_absolute_predictions",
    "no_medical_diagnosis",
    "no_financial_advice",
    "no_fear_based_statements",
    "no_deterministic_future",
  ];
  for (const f of requiredFlags) {
    if (!input.safetyFlags.includes(f)) {
      violations.push(`missing_safety_flag:${f}`);
    }
  }

  const requiredAvoid = [
    "fatalistic_prediction",
    "medical_diagnosis",
    "financial_advice",
    "fear_based_framing",
  ];
  for (const a of requiredAvoid) {
    if (!input.avoidTopics.includes(a)) {
      violations.push(`missing_avoid_topic:${a}`);
    }
  }

  for (const text of input.texts ?? []) {
    for (const p of FORBIDDEN_PATTERNS) {
      if (p.re.test(text)) {
        violations.push(`forbidden_pattern:${p.id}`);
      }
    }
  }

  if (violations.length === 0) {
    notes.push("all_core_safety_checks_passed");
  }

  const score = Math.max(0, 100 - violations.length * 20);
  return { score, violations, notes };
}
