import type { AmyEvidenceAnswer, InterventionLedgerEntry } from "./types.js";

const EVIDENCE_PATTERNS: Array<{ pattern: RegExp; keyHint: string }> = [
  { pattern: /reading challenge/i, keyHint: "reading" },
  { pattern: /why.*recommend/i, keyHint: "" },
  { pattern: /routine/i, keyHint: "routine" },
  { pattern: /streak/i, keyHint: "streak" },
  { pattern: /reward/i, keyHint: "reward" },
  { pattern: /learning/i, keyHint: "learning" },
];

export function answerAmyEvidenceQuestion(
  question: string,
  ledger: InterventionLedgerEntry[],
): AmyEvidenceAnswer {
  const hint = EVIDENCE_PATTERNS.find((p) => p.pattern.test(question))?.keyHint ?? "";

  const relevant = ledger
    .filter(
      (e) =>
        e.scorecard !== "pending_validation" &&
        (hint === "" ||
          e.recommendationKey.includes(hint) ||
          e.recommendationTitle.toLowerCase().includes(hint)),
    )
    .sort((a, b) => (b.validatedAt ?? "").localeCompare(a.validatedAt ?? ""));

  const evidence = relevant.slice(0, 5).map((e) => ({
    interventionKey: e.recommendationKey,
    scorecard: e.scorecard,
    delta: e.evidenceSummary,
    confidence: e.confidenceScore,
    validatedAt: e.validatedAt ?? e.dispatchedAt,
  }));

  const successes = relevant.filter((e) => e.scorecard === "success" || e.scorecard === "partial_success");
  const failures = relevant.filter((e) => e.scorecard === "no_impact" || e.scorecard === "negative_impact");

  let answer: string;
  if (evidence.length === 0) {
    answer =
      "I'm still gathering outcome data for your family. Once you've acted on a few recommendations, I'll explain what worked with real numbers.";
  } else if (successes.length >= failures.length) {
    const top = successes[0]!;
    answer = `I keep recommending this because validated outcomes show ${top.evidenceSummary} (${top.scorecard.replace("_", " ")}). I've seen ${successes.length} positive validation${successes.length > 1 ? "s" : ""} for your family.`;
  } else {
    answer = `Recent validations are mixed — ${failures.length} showed little or negative impact. I'm adjusting and may suggest alternatives that fit your family better.`;
  }

  const avgConf =
    evidence.length > 0
      ? evidence.reduce((s, e) => s + e.confidence, 0) / evidence.length
      : 0;

  return {
    question,
    answer,
    evidence,
    confidence: avgConf >= 0.7 ? "validated" : avgConf >= 0.4 ? "observation" : "experimental",
  };
}
