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
  /** Runtime-preferred book ids (must still pass SATPIN unlock filter). */
  preferredBookIds?: string[];
  /** Canonical Runtime difficulty — overrides local comprehension band when set. */
  runtimeDifficulty?: "easier" | "same" | "harder";
  runtimePreferShorter?: boolean;
  runtimeReviewFirst?: boolean;
  runtimeReason?: string;
}): AdaptiveReadingPlan {
  const unlocked = getUnlockedBooks(opts.letterGroupIndex);
  const completed = new Set(opts.completedBookIds);
  const unread = unlocked.filter((b) => !completed.has(b.id));
  const pool = unread.length > 0 ? unread : unlocked;
  const unlockedIds = new Set(unlocked.map((b) => b.id));

  // Prefer shortest unread books when accuracy is low (catalog heuristic only).
  const preferShorterPages =
    opts.runtimePreferShorter === true ||
    (opts.avgAccuracy > 0 && opts.avgAccuracy < 70);
  const sorted = [...pool].sort((a, b) => {
    const lenA = a.pages.reduce((s, p) => s + p.text.split(/\s+/).length, 0);
    const lenB = b.pages.reduce((s, p) => s + p.text.split(/\s+/).length, 0);
    return preferShorterPages ? lenA - lenB : lenB - lenA;
  });

  const preferred = (opts.preferredBookIds ?? []).filter((id) =>
    unlockedIds.has(id),
  );
  const restIds = sorted.map((b) => b.id).filter((id) => !preferred.includes(id));
  const recommendedBookIds = [...preferred, ...restIds].slice(0, 3);

  let comprehensionDifficulty = adaptiveComprehensionDifficulty(
    opts.recentComprehensionScores,
  );
  if (opts.runtimeDifficulty === "easier") {
    comprehensionDifficulty =
      comprehensionDifficulty === "hard" ? "medium" : "easy";
  } else if (opts.runtimeDifficulty === "harder") {
    comprehensionDifficulty =
      comprehensionDifficulty === "easy" ? "medium" : "hard";
  }

  const suggestSlowPlayback = opts.avgWpm > 0 && opts.avgWpm < 25;
  const reviewVocabFirst =
    opts.runtimeReviewFirst === true || opts.weakVocabCount >= 2;

  let practiceType: AdaptiveReadingPlan["practiceType"] = "read_aloud";
  if (opts.avgAccuracy < 55) practiceType = "blend";
  else if (reviewVocabFirst) practiceType = "vocab";
  else if (opts.recentComprehensionScores.at(-1) !== undefined &&
    (opts.recentComprehensionScores.at(-1) ?? 100) < 60) {
    practiceType = "comprehension";
  }

  const localRationale =
    practiceType === "blend"
      ? "We'll warm up with blending before today's book."
      : practiceType === "vocab"
        ? "A quick word picture review will help today's story."
        : suggestSlowPlayback
          ? "Slow and steady reading builds confidence."
          : "You're ready for a new decodable book!";

  return {
    recommendedBookIds,
    comprehensionDifficulty,
    preferShorterPages,
    suggestSlowPlayback,
    reviewVocabFirst,
    practiceType,
    rationale: opts.runtimeReason
      ? `${localRationale} (Runtime: ${opts.runtimeReason})`
      : localRationale,
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
