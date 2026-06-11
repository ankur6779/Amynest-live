/**
 * CVCC pathway — four-letter consonant-vowel-consonant-consonant words.
 */
import { CVCC_WORD_IDS } from "@workspace/phonics-sounds";
import type { DecodableStoryMeta } from "./story-catalog";

const CVCC_EMOJI: Record<string, string> = {
  bump: "💥",
  camp: "⛺",
  jump: "🦘",
  lamp: "💡",
  nest: "🪺",
  tent: "⛺",
  belt: "👔",
  milk: "🥛",
  hand: "✋",
  gift: "🎁",
  fast: "⚡",
  hunt: "🔍",
};

const CVCC_STORIES: Array<{ word: string; title: string; lines: string[] }> = [
  { word: "bump", title: "Bump in the Night", lines: ["A bump woke Sam.", "Lamp flicked on.", "Just a cat."] },
  { word: "camp", title: "Camp by the Lake", lines: ["Kim set up camp.", "Tent pegs held firm.", "Stars filled the sky."] },
  { word: "jump", title: "Jump the Log", lines: ["Pat took a big jump.", "Land soft on moss.", "Grin at the feat."] },
  { word: "lamp", title: "Lamp on the Desk", lines: ["Meg lit the lamp.", "Glow on the page.", "Read till dawn."] },
  { word: "nest", title: "Nest in the Elm", lines: ["Ben found a nest.", "Eggs warm inside.", "Do not disturb."] },
  { word: "tent", title: "Tent in the Wind", lines: ["Ann tied the tent.", "Wind pulled hard.", "Held through night."] },
  { word: "belt", title: "Belt on the Shelf", lines: ["Tom buckled his belt.", "Pack hung low.", "Trail awaited."] },
  { word: "milk", title: "Milk for the Cat", lines: ["Jen poured the milk.", "Cat lapped fast.", "Purr of thanks."] },
  { word: "hand", title: "Hand in the Sand", lines: ["Rob dug by hand.", "Shell in the sand.", "Treasure found."] },
  { word: "gift", title: "Gift on the Mat", lines: ["Eva left a gift.", "Bow on the mat.", "Joy inside."] },
  { word: "fast", title: "Fast as the Wind", lines: ["Dan ran fast.", "Feet on the path.", "Record set."] },
  { word: "hunt", title: "Hunt for Clues", lines: ["Liz began the hunt.", "Clue by the stump.", "Mystery solved."] },
];

export function getCvccWordBank(): string[] {
  return [...CVCC_WORD_IDS];
}

export function getCvccStories(): DecodableStoryMeta[] {
  return CVCC_STORIES.map((s, index) => ({
    id: `cvcc-${String(index + 1).padStart(2, "0")}`,
    title: s.title,
    emoji: CVCC_EMOJI[s.word] ?? "📖",
    level: 4 as const,
    requiredSounds: s.word.split(""),
    requiredFamilies: [],
    difficulty: 7,
    estimatedMinutes: 2,
    lines: s.lines.map((text) => ({
      text,
      highlightWords: text.replace(/[.!?,]/g, "").split(/\s+/).filter((w) =>
        w.toLowerCase() === s.word || w.length <= 5,
      ),
    })),
    comprehensionQuestion: `What ${s.word} word did you read?`,
  }));
}

export function isCvccPathwayAvailable(masteryAvg: number): boolean {
  return masteryAvg >= 50;
}
