import type { ContentPackage } from "../types/content-package.js";
import type { DiversityTopicBucket } from "./types.js";

export function detectTopicBucket(content: ContentPackage): DiversityTopicBucket {
  const hay = [
    content.topic.title,
    content.topic.category,
    content.title,
    content.hook,
    content.story,
    ...content.keywords,
    ...content.hashtags,
  ]
    .join(" ")
    .toLowerCase();

  if (/\bphonic|letter sound|cvc|digraph|alphabet blend\b/.test(hay)) {
    return "phonics";
  }
  if (/\bread(ing)?\b|storybook|book club\b/.test(hay)) return "reading";
  if (/\bspeech|pronunciation|mouth|stutter|voice-led|mic answer\b/.test(hay)) {
    return "speech";
  }
  if (/\bastro|star|constellation|space|galaxy|night sky\b/.test(hay)) {
    return "astro";
  }
  if (/\bgame|play|jump|puzzle|celebration round\b/.test(hay)) return "games";
  if (/\bhealth|nutrition|stretch|breath|water|exercise|vaccine\b/.test(hay)) {
    return "health";
  }
  if (/\broutine|habit|bedtime|breakfast|calendar|schedule\b/.test(hay)) {
    return "routine";
  }
  if (/\bcoach|habit coach|encouragement\b/.test(hay)) return "coach";
  if (/\blearn|study|tutor|homework|quiz|lesson|whiteboard\b/.test(hay)) {
    return "learning";
  }
  return "parenting";
}

export function scriptSeed(content: ContentPackage): string {
  return [
    content.topic.id,
    content.title,
    content.hook,
    content.captions.map((c) => c.text).join("|"),
  ].join("::");
}
