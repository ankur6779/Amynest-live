import { describe, expect, it } from "vitest";
import {
  DECODABLE_BOOK_LIBRARY,
  getUnlockedBooks,
  isBookUnlocked,
  validateBookDecodability,
} from "./decodable-books";
import {
  resolveReadingAcademyLevel,
  getReadingAcademyLevel,
} from "./reading-academy-levels";
import { analyseCompanionReading } from "./reading-companion";
import {
  computeWpm,
  estimateExpressionScore,
  recordFluencySample,
  defaultAcademyFluencyState,
  fluencyTrendSummary,
} from "./reading-fluency-academy";
import {
  buildComprehensionQuiz,
  scoreComprehensionQuiz,
  adaptiveComprehensionDifficulty,
} from "./reading-comprehension";
import {
  introduceBookVocabulary,
  defaultVocabularyState,
  reviewVocabularyWord,
  getVocabularyDueForReview,
  vocabularyGrowthStats,
} from "./reading-vocabulary";
import {
  evaluateAchievements,
  defaultAchievementState,
} from "./reading-achievements";
import { buildAdaptiveReadingPlan, pickNextBook } from "./reading-adaptive-path";
import { buildParentWeeklyReport } from "./parent-weekly-report";
import { teacherModeStatus, TEACHER_MODE_ENABLED } from "./teacher-mode";
import {
  markBookComplete,
  defaultAcademyProgress,
} from "./reading-academy-progress";

describe("Reading Academy levels", () => {
  it("starts at Learning Sounds for new readers", () => {
    expect(
      resolveReadingAcademyLevel({
        curriculumLevel: 1,
        letterGroupIndex: 1,
        wordsRead: 0,
        storiesCompleted: 0,
      }),
    ).toBe(1);
  });

  it("advances to stories after completions", () => {
    const id = resolveReadingAcademyLevel({
      curriculumLevel: 3,
      letterGroupIndex: 3,
      wordsRead: 30,
      storiesCompleted: 2,
    });
    expect(id).toBeGreaterThanOrEqual(5);
    expect(getReadingAcademyLevel(id).name).toMatch(/Stor|Book|Fluent/);
  });
});

describe("Decodable book library", () => {
  it("unlocks by letter group only", () => {
    expect(getUnlockedBooks(1).every((b) => b.minLetterGroup <= 1)).toBe(true);
    expect(isBookUnlocked("book-pat-sat", 1)).toBe(true);
    expect(isBookUnlocked("book-sam-sat", 1)).toBe(false);
    expect(isBookUnlocked("book-sam-sat", 2)).toBe(true);
    expect(isBookUnlocked("book-pat-and-cat", 1)).toBe(false);
    expect(isBookUnlocked("book-pat-and-cat", 2)).toBe(true);
  });

  it("keeps books decodable for their min letter group", () => {
    for (const book of DECODABLE_BOOK_LIBRARY) {
      const { ok, offenders } = validateBookDecodability(
        book,
        book.minLetterGroup,
      );
      expect(ok, `${book.id}: ${offenders.join(",")}`).toBe(true);
    }
  });

  it("includes the named progressive titles", () => {
    const titles = DECODABLE_BOOK_LIBRARY.map((b) => b.title);
    expect(titles).toContain("Pat Sat");
    expect(titles).toContain("Sam Sat");
    expect(titles).toContain("Pat and the Cat");
    expect(titles).toContain("The Big Dog");
    expect(titles).toContain("Fun at the Pond");
    expect(titles).toContain("The Lost Hat");
  });
});

describe("AI reading companion", () => {
  it("detects skips and offers a gentle nudge", () => {
    const r = analyseCompanionReading({
      expectedText: "Sam sat on the mat.",
      transcript: "Sam sat",
      confidence: 0.8,
    });
    expect(r.accuracyPct).toBeLessThan(100);
    expect(r.issues.some((i) => i.kind === "skip" || i.kind === "substitute")).toBe(
      true,
    );
    expect(r.nudge).toBeTruthy();
  });

  it("does not interrupt strong reading", () => {
    const r = analyseCompanionReading({
      expectedText: "Sam sat.",
      transcript: "Sam sat",
      confidence: 0.95,
    });
    expect(r.accuracyPct).toBeGreaterThanOrEqual(90);
    expect(r.celebrate).toBe(true);
    expect(r.nudge).toBeNull();
  });

  it("flags repeats without hard interrupt", () => {
    const r = analyseCompanionReading({
      expectedText: "Pat sat.",
      transcript: "Pat Pat Pat sat",
      confidence: 0.7,
    });
    expect(r.issues.some((i) => i.kind === "repeat")).toBe(true);
  });
});

describe("Fluency academy", () => {
  it("computes WPM and expression", () => {
    expect(computeWpm(20, 60_000)).toBe(20);
    expect(
      estimateExpressionScore({ accuracyPct: 90, pauseCount: 1, wordCount: 20 }),
    ).toBeGreaterThan(70);
  });

  it("tracks samples and trends", () => {
    let state = defaultAcademyFluencyState();
    state = recordFluencySample(state, {
      bookId: "book-sam-sat",
      pageIndex: 0,
      wordCount: 10,
      durationMs: 30_000,
      accuracyPct: 85,
      pauseCount: 1,
      selfCorrections: 0,
    });
    expect(state.wordsReadAloud).toBe(10);
    expect(fluencyTrendSummary(state).avgWpm).toBeGreaterThan(0);
  });
});

describe("Vocabulary + comprehension", () => {
  it("introduces and reviews story words", () => {
    const book = DECODABLE_BOOK_LIBRARY[0]!;
    let state = introduceBookVocabulary(
      defaultVocabularyState(),
      book.id,
      book.vocabulary,
    );
    expect(vocabularyGrowthStats(state).total).toBeGreaterThan(0);
    const due = getVocabularyDueForReview(state);
    expect(due.length).toBeGreaterThan(0);
    state = reviewVocabularyWord(state, due[0]!.word, true);
    expect(state.cards[due[0]!.word]!.strength).toBeGreaterThan(20);
  });

  it("scores comprehension quizzes adaptively", () => {
    const book = DECODABLE_BOOK_LIBRARY[0]!;
    expect(adaptiveComprehensionDifficulty([])).toBe("easy");
    expect(adaptiveComprehensionDifficulty([90, 95])).toBe("hard");
    const quiz = buildComprehensionQuiz(book, "easy");
    expect(quiz.length).toBeGreaterThan(0);
    const perfect = scoreComprehensionQuiz(
      book.id,
      quiz,
      quiz.map((q) => q.correctIndex),
    );
    expect(perfect.scorePct).toBe(100);
  });
});

describe("Adaptive path + achievements + parent report", () => {
  it("never recommends locked books", () => {
    const plan = buildAdaptiveReadingPlan({
      letterGroupIndex: 1,
      completedBookIds: [],
      recentComprehensionScores: [],
      avgAccuracy: 80,
      avgWpm: 30,
      weakVocabCount: 0,
    });
    for (const id of plan.recommendedBookIds) {
      expect(isBookUnlocked(id, 1)).toBe(true);
    }
    const next = pickNextBook(plan, getUnlockedBooks(1));
    expect(next?.minLetterGroup).toBeLessThanOrEqual(1);
  });

  it("unlocks meaningful achievements", () => {
    const { newlyUnlocked } = evaluateAchievements({
      state: defaultAchievementState(),
      wordsRead: 100,
      storiesCompleted: 1,
      sentencesRead: 2,
    });
    const ids = newlyUnlocked.map((a) => a.id);
    expect(ids).toContain("first_word");
    expect(ids).toContain("first_story");
    expect(ids).toContain("words_100");
  });

  it("builds encouraging weekly reports", () => {
    const report = buildParentWeeklyReport({
      letterGroupIndex: 2,
      academyLevel: 4,
      storiesCompleted: 2,
      wordsRead: 40,
      pronunciationAvg: 72,
      fluencyAvgAccuracy: 80,
      fluencyBand: "developing",
      comprehensionAvg: 75,
      vocabularyTotal: 6,
      childName: "Aya",
    });
    expect(report.homeActivities.length).toBeGreaterThan(0);
    expect(report.summaryLine).toContain("Aya");
  });

  it("keeps teacher mode disabled by default", () => {
    expect(TEACHER_MODE_ENABLED).toBe(false);
    expect(teacherModeStatus().enabled).toBe(false);
  });

  it("marks books complete in academy progress", () => {
    const next = markBookComplete(defaultAcademyProgress(), "book-sam-sat", 4, 100);
    expect(next.completedBookIds).toContain("book-sam-sat");
    expect(next.comprehensionScores).toEqual([100]);
  });
});
