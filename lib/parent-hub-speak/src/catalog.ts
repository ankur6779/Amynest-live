import { STORIES_BY_GROUP } from "./data/age-group-stories.js";
import { ALL_DAILY_STORIES } from "./data/daily-stories.js";
import { ALL_HUB_FACTS } from "./data/facts.js";
import { HUB_ORIGAMI } from "./data/origami.js";
import { ALL_HUB_PUZZLES } from "./data/puzzles.js";
import { PRESCHOOL_STORIES, TODDLER_STORIES } from "./data/toddler-stories.js";
import {
  buildAgeGroupStorySpeakText,
  buildDailyStorySpeakText,
  buildFactSpeakText,
  buildPuzzleAnswerSpeakText,
  buildPuzzleQuestionSpeakText,
  buildShortStorySpeakText,
} from "./speak.js";

function uniqueNonEmpty(lines: Iterable<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of lines) {
    const text = raw.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

/** All fixed Parent Hub Amy speak lines for static-audio pre-generation. */
export function getParentHubAudioTextsForStaticCatalog(): string[] {
  const lines: string[] = [];

  for (const story of ALL_DAILY_STORIES) {
    lines.push(buildDailyStorySpeakText(story));
  }

  for (const fact of ALL_HUB_FACTS) {
    lines.push(buildFactSpeakText(fact));
  }

  for (const puzzle of ALL_HUB_PUZZLES) {
    lines.push(buildPuzzleQuestionSpeakText(puzzle));
    lines.push(buildPuzzleAnswerSpeakText(puzzle.correctAnswer));
  }

  for (const story of TODDLER_STORIES) {
    lines.push(buildShortStorySpeakText(story));
  }
  for (const story of PRESCHOOL_STORIES) {
    lines.push(buildShortStorySpeakText(story));
  }

  for (const groupStories of Object.values(STORIES_BY_GROUP)) {
    for (const story of groupStories) {
      lines.push(buildAgeGroupStorySpeakText(story));
    }
  }

  for (const item of HUB_ORIGAMI) {
    for (const step of item.steps) {
      const instruction = step.instruction?.trim();
      if (instruction) lines.push(instruction);
    }
  }

  return uniqueNonEmpty(lines);
}
