/**
 * Adaptive reading path — personalises book difficulty, review, and practice type.
 * Never bypasses SATPIN letter-group unlocks.
 */
import type { DecodableBook } from "./decodable-books";
import { getUnlockedBooks } from "./decodable-books";
import { adaptiveComprehensionDifficulty } from "./reading-comprehension";

export type AdaptiveReadingPlan = {
  recommendedBookIds: string[];
  comprehensionDifficulty: "easy" | "medium" | "hard";
  preferShorterPages: boolean;
  suggestSlowPlayback: boolean;
  reviewVocabFirst: boolean;
  practiceType: "blend" | "read_aloud" | "vocab" | "comprehension";
  rationale: string;
};

export function buildAdaptiveReadingPlan(opts: {
  letterGroupIndex: number;
  completedBookIds: string[];
  recentComprehensionScores: number[];
  avgAccuracy: number;
  avgWpm: number;
  weakVocabCount: number;
}): AdaptiveReadingPlan {
  const unlocked = getUnlockedBooks(opts.letterGroupIndex);
  const completed = new Set(opts.completedBookIds);
  const unread = unlocked.filter((b) => !completed.has(b.id));
  const pool = unread.length > 0 ? unread : unlocked;

  // Prefer shortest unread books when accuracy is low
  const preferShorterPages = opts.avgAccuracy > 0 && opts.avgAccuracy < 70;
  const sorted = [...pool].sort((a, b) => {
    const lenA = a.pages.reduce((s, p) => s + p.text.split(/\s+/).length, 0);
    const lenB = b.pages.reduce((s, p) => s + p.text.split(/\s+/).length, 0);
    return preferShorterPages ? lenA - lenB : lenB - lenA;
  });

  const comprehensionDifficulty = adaptiveComprehensionDifficulty(
    opts.recentComprehensionScores,
  );
  const suggestSlowPlayback = opts.avgWpm > 0 && opts.avgWpm < 25;
  const reviewVocabFirst = opts.weakVocabCount >= 2;

  let practiceType: AdaptiveReadingPlan["practiceType"] = "read_aloud";
  if (opts.avgAccuracy < 55) practiceType = "blend";
  else if (reviewVocabFirst) practiceType = "vocab";
  else if (opts.recentComprehensionScores.at(-1) !== undefined &&
    (opts.recentComprehensionScores.at(-1) ?? 100) < 60) {
    practiceType = "comprehension";
  }

  const rationale =
    practiceType === "blend"
      ? "We'll warm up with blending before today's book."
      : practiceType === "vocab"
        ? "A quick word picture review will help today's story."
        : suggestSlowPlayback
          ? "Slow and steady reading builds confidence."
          : "You're ready for a new decodable book!";

  return {
    recommendedBookIds: sorted.slice(0, 3).map((b) => b.id),
    comprehensionDifficulty,
    preferShorterPages,
    suggestSlowPlayback,
    reviewVocabFirst,
    practiceType,
    rationale,
  };
}

export function pickNextBook(
  plan: AdaptiveReadingPlan,
  library: DecodableBook[],
): DecodableBook | null {
  for (const id of plan.recommendedBookIds) {
    const b = library.find((x) => x.id === id);
    if (b) return b;
  }
  return library[0] ?? null;
}
