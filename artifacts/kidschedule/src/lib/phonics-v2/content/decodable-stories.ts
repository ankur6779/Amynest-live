/**
 * Decodable stories — only words/sounds from learned CVC + sight word pool.
 * Structured for expansion to 100+ stories.
 */

export type DecodableStoryLine = {
  text: string;
  /** Words to highlight during karaoke read */
  highlightWords: string[];
};

export type DecodableStory = {
  id: string;
  title: string;
  emoji: string;
  /** Minimum journey level to unlock (1–6) */
  minLevel: number;
  /** Sounds/families used — for gating */
  requiredFamilies: string[];
  lines: DecodableStoryLine[];
  comprehensionQuestion?: string;
};

export const DECODABLE_STORIES: DecodableStory[] = [
  {
    id: "story-sam-hat",
    title: "Sam's Hat",
    emoji: "🎩",
    minLevel: 5,
    requiredFamilies: ["at"],
    lines: [
      { text: "Sam sat.", highlightWords: ["Sam", "sat"] },
      { text: "Sam had a hat.", highlightWords: ["Sam", "had", "a", "hat"] },
      { text: "Sam is happy.", highlightWords: ["Sam", "is", "happy"] },
    ],
    comprehensionQuestion: "What did Sam have?",
  },
  {
    id: "story-good-dog",
    title: "The Good Dog",
    emoji: "🐶",
    minLevel: 5,
    requiredFamilies: ["og", "at"],
    lines: [
      { text: "The dog ran.", highlightWords: ["The", "dog", "ran"] },
      { text: "The dog sat.", highlightWords: ["The", "dog", "sat"] },
      { text: "The dog is good.", highlightWords: ["The", "dog", "is", "good"] },
    ],
    comprehensionQuestion: "What did the dog do?",
  },
  {
    id: "story-cat-mat",
    title: "Cat on the Mat",
    emoji: "🐱",
    minLevel: 5,
    requiredFamilies: ["at"],
    lines: [
      { text: "The cat sat.", highlightWords: ["The", "cat", "sat"] },
      { text: "The cat sat on the mat.", highlightWords: ["The", "cat", "sat", "on", "the", "mat"] },
      { text: "The cat is happy.", highlightWords: ["The", "cat", "is", "happy"] },
    ],
    comprehensionQuestion: "Where did the cat sit?",
  },
  {
    id: "story-pin-win",
    title: "Pin and Win",
    emoji: "🏆",
    minLevel: 6,
    requiredFamilies: ["in", "ip"],
    lines: [
      { text: "I can win.", highlightWords: ["I", "can", "win"] },
      { text: "I had a pin.", highlightWords: ["I", "had", "a", "pin"] },
      { text: "I did it!", highlightWords: ["I", "did", "it"] },
    ],
    comprehensionQuestion: "What did I have?",
  },
];

export function getDecodableStory(id: string): DecodableStory | undefined {
  return DECODABLE_STORIES.find((s) => s.id === id);
}

export function getUnlockedStories(journeyLevel: number): DecodableStory[] {
  return DECODABLE_STORIES.filter((s) => s.minLevel <= journeyLevel);
}
