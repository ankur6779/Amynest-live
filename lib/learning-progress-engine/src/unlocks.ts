import {
  playCategoryLimitForJourneyDay,
  playUnlocksTomorrowForCategory,
} from "@workspace/study-zone";
import {
  phonicsItemLimitForJourneyDay,
  phonicsUnlockedSubItems,
} from "@workspace/parent-hub-journey";
import type { GetUnlocksInput, UnlockResult, SectionKey } from "./types";
import { deriveWeakSkills, isRevisionDay } from "./mastery";
import {
  numbersStageIndex,
  alphabetsStageIndex,
  shapesStageIndex,
  colorsStageIndex,
  phonicsLevelIndex,
  speechLevelIndex,
  storyLevelIndex,
  NUMBERS_STAGES,
  ALPHABET_STAGES,
  SHAPES_STAGES,
  COLORS_STAGES,
} from "./study-zone-progression";
import {
  buildTodaysUnlocks,
  buildNextSessionUnlocks,
  buildRevisionContent,
  dailyUnlockSeed,
} from "./daily-freshness";

function difficultyFromMastery(masteryScore: number): "easy" | "medium" | "hard" {
  if (masteryScore < 40) return "easy";
  if (masteryScore < 70) return "medium";
  return "hard";
}

function alphabetRangeForStage(stageIdx: number): { start: string; end: string } {
  const stage = ALPHABET_STAGES[Math.min(stageIdx, ALPHABET_STAGES.length - 1)];
  return { start: stage.start, end: stage.end };
}

function charIndex(c: string): number {
  return c.toUpperCase().charCodeAt(0) - 65;
}

function letterInRange(letter: string, start: string, end: string): boolean {
  const i = charIndex(letter);
  return i >= charIndex(start) && i <= charIndex(end);
}

/**
 * Scalable unlock engine — replaces hardcoded day===1/day===2 checks.
 * Free users: respects hub journey day caps (backward compatible).
 * Premium / mastery: extends into infinite curriculum evolution.
 */
export function getUnlocks(input: GetUnlocksInput): UnlockResult {
  const {
    age,
    journeyDay,
    masteryScore,
    streakDays,
    completedActivities,
    sectionProgress,
    isPremium = false,
    dateIso,
    childId,
  } = input;

  const mathSec = sectionProgress.math ?? { level: 1, masteryPct: 0, activitiesCompleted: 0, lastActivityId: null };
  const phonicsSec = sectionProgress.phonics ?? { level: 1, masteryPct: 0, activitiesCompleted: 0, lastActivityId: null };
  const speechSec = sectionProgress.speech ?? { level: 1, masteryPct: 0, activitiesCompleted: 0, lastActivityId: null };
  const storiesSec = sectionProgress.stories ?? { level: 1, masteryPct: 0, activitiesCompleted: 0, lastActivityId: null };

  const revision = isRevisionDay(sectionProgress, masteryScore);
  const weakSkills = deriveWeakSkills(sectionProgress);

  let numbersMax: number;
  let numbersStage: string;
  let alphabetRange: { start: string; end: string };
  let alphabetsStage: string;
  let phonicsLevel: number;
  let speechLevel: number;
  let storyLevel: number;
  let unlockedShapes: string[];
  let unlockedAnimals: number;
  let shapesStage: string;

  if (isPremium || journeyDay > 3) {
    const numIdx = numbersStageIndex(masteryScore, mathSec.level);
    const numStage = NUMBERS_STAGES[numIdx] ?? NUMBERS_STAGES[0];
    numbersMax = numStage.max;
    numbersStage = numStage.id;
    // Premium never regresses below the free journey day-3 catalog (20).
    // Demo / reviewer accounts start with the full toddler path unlocked.
    const freeJourneyMax = playCategoryLimitForJourneyDay("numbers", 3);
    numbersMax = Math.max(numbersMax, freeJourneyMax);
    if (isPremium) {
      // Premium floor: at least 1–50 once subscribed (mastery can push toward 100).
      numbersMax = Math.max(numbersMax, NUMBERS_STAGES[3]?.max ?? 50);
    }

    const alphaIdx = alphabetsStageIndex(masteryScore, phonicsSec.level);
    alphabetsStage = ALPHABET_STAGES[alphaIdx]?.id ?? "A-E";
    alphabetRange = alphabetRangeForStage(alphaIdx);

    phonicsLevel = phonicsLevelIndex(phonicsSec.level, masteryScore);
    speechLevel = speechLevelIndex(speechSec.level);
    storyLevel = storyLevelIndex(storiesSec.level);

    const shapeIdx = shapesStageIndex(masteryScore);
    shapesStage = SHAPES_STAGES[shapeIdx] ?? "basic";
    unlockedShapes =
      shapeIdx === 0
        ? ["circle", "square", "triangle"]
        : shapeIdx === 1
          ? ["circle", "square", "triangle", "rectangle", "star", "heart"]
          : ["circle", "square", "triangle", "rectangle", "star", "heart", "cube", "sphere", "cylinder"];

    unlockedAnimals = Math.min(24, 6 + mathSec.level * 2 + Math.floor(masteryScore / 10));
  } else {
    numbersMax = playCategoryLimitForJourneyDay("numbers", journeyDay);
    numbersStage = journeyDay <= 1 ? "1-5" : journeyDay <= 2 ? "1-10" : "1-20";
    const alphaCap = playCategoryLimitForJourneyDay("alphabets", journeyDay);
    const endLetter = String.fromCharCode(64 + Math.min(26, alphaCap));
    alphabetRange = { start: "A", end: endLetter };
    alphabetsStage = journeyDay <= 1 ? "A-E" : journeyDay <= 2 ? "A-J" : "A-Z";
    phonicsLevel = Math.min(2, journeyDay - 1);
    speechLevel = Math.min(1, journeyDay - 1);
    storyLevel = journeyDay >= 2 ? 1 : 0;
    shapesStage = journeyDay <= 1 ? "basic" : "advanced";
    unlockedShapes =
      journeyDay <= 1
        ? ["circle", "square", "triangle"]
        : ["circle", "square", "triangle", "rectangle", "star", "heart"];
    unlockedAnimals = playCategoryLimitForJourneyDay("animals", journeyDay);
    void phonicsUnlockedSubItems(journeyDay);
    void phonicsItemLimitForJourneyDay(journeyDay);
    void playUnlocksTomorrowForCategory("numbers", journeyDay);
  }

  const colorsStage = COLORS_STAGES[colorsStageIndex(masteryScore)] ?? "primary";
  const puzzleDifficulty = difficultyFromMastery(masteryScore);
  const worksheetDifficulty = revision ? "easy" : puzzleDifficulty;
  const learningLevel = Math.floor(masteryScore / 12) + 1 + Math.min(5, streakDays);

  const seed = dailyUnlockSeed(dateIso ?? new Date().toISOString().slice(0, 10), childId ?? 0);

  const todaysUnlocks = buildTodaysUnlocks(input, {
    numbersStage,
    phonicsLevel,
    storyLevel,
  });
  const nextSessionUnlocks = buildNextSessionUnlocks(input, learningLevel);
  const revisionContent = revision
    ? buildRevisionContent(weakSkills, seed)
    : [];

  return {
    numbersMax,
    alphabetRange,
    unlockedShapes,
    unlockedAnimals,
    phonicsLevel,
    speechLevel,
    storyLevel,
    puzzleDifficulty,
    worksheetDifficulty,
    todaysUnlocks,
    nextSessionUnlocks,
    revisionContent,
    numbersStage,
    alphabetsStage,
    shapesStage,
    colorsStage,
    learningLevel,
    isRevisionDay: revision,
  };
}

/** Filter alphabet play items to unlocked range. */
export function filterAlphabetItems<T extends { id: string }>(
  items: T[],
  range: { start: string; end: string },
): T[] {
  return items.filter((i) => {
    if (i.id.length !== 1) return true;
    return letterInRange(i.id, range.start, range.end);
  });
}

/** Filter number play items to max value. */
export function filterNumberItems<T extends { id: string }>(
  items: T[],
  max: number,
): T[] {
  return items.filter((i) => {
    const n = parseInt(i.id, 10);
    return !Number.isNaN(n) && n <= max;
  });
}
