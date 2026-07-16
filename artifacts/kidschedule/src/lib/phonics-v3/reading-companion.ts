/**
 * AI Reading Companion — analyses a child's oral reading of a page/line
 * without nagging. Encouragement is sparse and positive.
 *
 * Privacy: operates on transcripts only; no audio storage.
 */
import { normalizeScore01 } from "./ai-reading-coach";

export type CompanionIssueKind =
  | "skip"
  | "substitute"
  | "repeat"
  | "hesitation"
  | "pronunciation";

export type CompanionIssue = {
  kind: CompanionIssueKind;
  expected?: string;
  heard?: string;
  gentleness: "soft" | "wait"; // wait = don't interrupt yet
};

export type CompanionPageResult = {
  expectedWords: string[];
  heardWords: string[];
  accuracyPct: number;
  issues: CompanionIssue[];
  /** Short encouragement — empty if reading is strong (avoid interrupting). */
  nudge: string | null;
  celebrate: boolean;
};

const GLUE = new Set(["a", "i", "is", "in", "the", "and", "on", "at", "no"]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Compare expected page text to a spoken transcript.
 * Designed for continuous listening between pages (not phoneme drills).
 */
export function analyseCompanionReading(opts: {
  expectedText: string;
  transcript: string;
  /** Optional STT confidence 0–1 or 0–100 */
  confidence?: number;
}): CompanionPageResult {
  const expectedWords = tokenize(opts.expectedText);
  const heardWords = tokenize(opts.transcript);
  const issues: CompanionIssue[] = [];

  if (heardWords.length === 0) {
    return {
      expectedWords,
      heardWords,
      accuracyPct: 0,
      issues: [{ kind: "hesitation", gentleness: "wait" }],
      nudge: null, // don't interrupt empty — child may still be thinking
      celebrate: false,
    };
  }

  let matched = 0;
  const heardSet = new Set(heardWords);
  for (const w of expectedWords) {
    if (heardSet.has(w) || GLUE.has(w)) {
      matched += 1;
    } else {
      // nearest substitute guess
      const sub = heardWords.find((h) => h[0] === w[0] && h !== w);
      issues.push({
        kind: sub ? "substitute" : "skip",
        expected: w,
        heard: sub,
        gentleness: "soft",
      });
    }
  }

  // Repeated words (same token 3+ times)
  const counts = new Map<string, number>();
  for (const h of heardWords) counts.set(h, (counts.get(h) ?? 0) + 1);
  for (const [w, c] of counts) {
    if (c >= 3) {
      issues.push({ kind: "repeat", heard: w, gentleness: "wait" });
    }
  }

  const conf = normalizeScore01(opts.confidence ?? 0.7);
  if (conf < 0.45) {
    issues.push({ kind: "pronunciation", gentleness: "soft" });
  }

  const accuracyPct =
    expectedWords.length === 0
      ? 100
      : Math.round((matched / expectedWords.length) * 100);

  let nudge: string | null = null;
  let celebrate = false;

  if (accuracyPct >= 90 && issues.filter((i) => i.kind !== "repeat").length === 0) {
    celebrate = true;
    nudge = null; // celebrate visually elsewhere — no spoken interrupt
  } else if (accuracyPct >= 70) {
    nudge = "Lovely reading — keep going!";
  } else if (accuracyPct >= 40) {
    const skip = issues.find((i) => i.kind === "skip" || i.kind === "substitute");
    nudge = skip?.expected
      ? `Nice try! Let's look at the word "${skip.expected}" together.`
      : "You're working hard — try this line once more when you're ready.";
  } else {
    nudge = "Take a breath. Amy can read this line with you first.";
  }

  // Cap interruptions: if many soft issues, keep a single nudge
  const softCount = issues.filter((i) => i.gentleness === "soft").length;
  if (softCount > 2 && accuracyPct >= 50) {
    nudge = "Great effort — finish the page, then we'll practise one tricky word.";
  }

  return {
    expectedWords,
    heardWords,
    accuracyPct,
    issues,
    nudge,
    celebrate,
  };
}

export function companionShouldInterrupt(result: CompanionPageResult): boolean {
  // Only interrupt on very low accuracy — otherwise wait until page end
  return result.accuracyPct > 0 && result.accuracyPct < 35 && Boolean(result.nudge);
}
