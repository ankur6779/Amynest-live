/**
 * Sleep story narration text — used for TTS playback in the infant sleep library.
 * Bundled ambient MP3s under /infant-sleep-audio/ are offline fallbacks only.
 */

export interface InfantSleepStory {
  id: string;
  title: string;
  /** Full narration read by TTS (Amy voice). */
  narration: string;
}

export const INFANT_SLEEP_STORIES: readonly InfantSleepStory[] = [
  {
    id: "story-moon-blanket",
    title: "The Moon's Soft Blanket",
    narration:
      "Once upon a quiet night, the moon looked down and saw a little one getting sleepy. " +
      "The moon spread a soft silver blanket across the sky, tucking in every star. " +
      "The wind grew gentle. The world grew still. " +
      "And under the moon's soft blanket, you are safe, warm, and ready to dream.",
  },
  {
    id: "story-cloud-pillow",
    title: "Cloud Pillow",
    narration:
      "High above the sleepy town, a little cloud floated slowly, slowly, slow. " +
      "It was fluffy and light, the softest pillow in the sky. " +
      "Birds tucked their wings. Trees whispered goodnight. " +
      "The cloud drifted down just enough to say, rest now, little one. Rest on your cloud pillow.",
  },
  {
    id: "story-star-friend",
    title: "Your Star Friend",
    narration:
      "Every night, one small star waits just for you. " +
      "It blinks once, twice, three times slow — a secret hello from your star friend. " +
      "When your eyes feel heavy, your star friend shines a little softer, " +
      "keeping watch while you sail away on quiet, happy dreams.",
  },
  {
    id: "story-garden-sleep",
    title: "The Sleepy Garden",
    narration:
      "In the sleepy garden, flowers folded their petals. " +
      "Crickets played a tiny lullaby. The daisies nodded their heads. " +
      "Even the busy bees had gone home to rest. " +
      "The garden yawned a sweet, green yawn, and everything inside it fell peacefully asleep.",
  },
  {
    id: "story-boat-dreams",
    title: "Boat of Quiet Dreams",
    narration:
      "A little boat rocked on a calm, moonlit sea. " +
      "No hurry. No noise. Just the gentle hush of water against the sides. " +
      "The boat carried quiet dreams — soft ones, happy ones, cozy ones — " +
      "and it sailed you safely, safely, to the shore of sleep.",
  },
] as const;

const STORY_BY_ID = new Map(INFANT_SLEEP_STORIES.map((s) => [s.id, s]));

export function getSleepStoryNarration(storyId: string): string | undefined {
  return STORY_BY_ID.get(storyId)?.narration;
}

export function getSleepStorySpeakText(storyId: string, fallbackTitle?: string): string {
  const story = STORY_BY_ID.get(storyId);
  if (story) return story.narration;
  return (fallbackTitle ?? "").trim();
}
