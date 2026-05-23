import type {
  AgeGroupStory,
  DailyStory,
  HubFact,
  HubOrigami,
  HubPuzzle,
  HubShortStory,
} from "./types.js";

/** Matches `daily-story-section.tsx` storySpeech(). */
export function buildDailyStorySpeakText(story: Pick<DailyStory, "title" | "story" | "moral">): string {
  return `${story.title}. ${story.story}. The moral is: ${story.moral}`;
}

/** Matches `age-based-sections.tsx` StorySection handleSpeak(). */
export function buildAgeGroupStorySpeakText(story: Pick<AgeGroupStory, "title" | "story" | "moral">): string {
  return `${story.title}. ${story.story}. Moral: ${story.moral}`;
}

/** Matches `toddler-preschool-mode.tsx` story read-aloud. */
export function buildShortStorySpeakText(story: Pick<HubShortStory, "title" | "story" | "moral">): string {
  return `${story.title}. ${story.story}. The moral is: ${story.moral}`;
}

/** English-only static catalog (matches default Amy voice playback). */
export function buildFactSpeakText(fact: Pick<HubFact, "text">): string {
  return fact.text.trim();
}

/** Matches `daily-puzzle.tsx` question playback. */
export function buildPuzzleQuestionSpeakText(puzzle: Pick<HubPuzzle, "question" | "audioQ">): string {
  return (puzzle.audioQ ?? puzzle.question).trim();
}

/** Matches `daily-puzzle.tsx` wrong-answer feedback. */
export function buildPuzzleAnswerSpeakText(correctAnswer: string): string {
  return `The correct answer is ${correctAnswer.trim()}`;
}
