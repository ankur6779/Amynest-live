/**
 * Unique title / description / hashtags / playlist / thumbnail hero from SCRIPT.
 */

import type { ContentPackage } from "../types/content-package.js";
import {
  FEATURE_PROPS,
  pickBySeed,
} from "./scene-library.js";
import { detectTopicBucket, scriptSeed } from "./topic.js";
import type {
  DiversityMetadataPlan,
  DiversityTopicBucket,
  ThumbnailHeroStyle,
} from "./types.js";

const TITLE_TEMPLATES: Record<DiversityTopicBucket, string[]> = {
  learning: [
    "A Fresh Lesson Without the Panic",
    "Learning That Finally Feels Lighter",
    "When Homework Stops Feeling Heavy",
  ],
  phonics: [
    "Letter Sounds That Stick",
    "Three Sounds Become a Word",
    "Phonics Practice That Actually Lands",
  ],
  reading: [
    "Why Kids Love Reading Again",
    "One Story Night Changes Everything",
    "Reading Confidence Starts Small",
  ],
  speech: [
    "Tiny Voices Become Confident",
    "When Speaking Out Loud Feels Safe",
    "Speech Practice Kids Actually Try",
  ],
  health: [
    "Healthy Habits That Actually Stick",
    "Small Wellness Wins Add Up",
    "Health Routines Kids Can Feel",
  ],
  games: [
    "Learning Games That Spark Joy",
    "Play That Builds Real Skills",
    "Movement, Laughter, Progress",
  ],
  astro: [
    "Your Child's Curiosity Starts Here",
    "Stars That Wake Up Wonder",
    "Space Stories Kids Remember",
  ],
  routine: [
    "One Routine Changed Everything",
    "Mornings That Feel Calmer",
    "Bedtime Without the Battle",
  ],
  parenting: [
    "A Parenting Night That Softens",
    "When Tonight Feels Lighter",
    "Small Moments, Big Parent Wins",
  ],
  coach: [
    "Gentle Guidance That Sticks",
    "Coach Moments Parents Trust",
    "Encouragement Kids Can Feel",
  ],
};

const HASHTAG_SETS: Record<DiversityTopicBucket, string[]> = {
  learning: ["#StudyZone", "#KidsLearning", "#LearningApps", "#EarlyLearning"],
  phonics: ["#Phonics", "#Reading", "#StudyZone", "#EarlyLiteracy"],
  reading: ["#Reading", "#StoryTime", "#KidsBooks", "#StudyZone"],
  speech: ["#SpeechDevelopment", "#EarlyLearning", "#KidsSpeech", "#ParentingTips"],
  health: ["#HealthyKids", "#KidsWellness", "#ParentingTips", "#HealthyHabits"],
  games: ["#LearningGames", "#KidsActivities", "#PlayBasedLearning", "#Shorts"],
  astro: ["#SpaceForKids", "#AstroKids", "#Curiosity", "#STEM"],
  routine: ["#ParentingTips", "#KidsRoutines", "#MorningRoutine", "#BedtimeRoutine"],
  parenting: ["#ParentingTips", "#MomLife", "#DadLife", "#AmyNest"],
  coach: ["#ParentingTips", "#KidsConfidence", "#AmyNestAI", "#Encouragement"],
};

const PLAYLIST_BY_BUCKET: Record<DiversityTopicBucket, string> = {
  learning: "Study Zone",
  phonics: "Study Zone",
  reading: "Reading",
  speech: "Speech",
  health: "Health Lab",
  games: "Games",
  astro: "Astro",
  routine: "Routine",
  parenting: "Parent Tips",
  coach: "Parent Tips",
};

/** Topic-flavored CTA lines — still AmyNest download, not identical every Short. */
const CTA_BY_BUCKET: Record<DiversityTopicBucket, string[]> = {
  learning: [
    "Download AmyNest AI for daily lessons",
    "Start Study Zone — Download AmyNest AI",
  ],
  phonics: [
    "Try Phonics today — Download AmyNest AI",
    "Download AmyNest AI for letter sounds",
  ],
  reading: [
    "Open a story night — Download AmyNest AI",
    "Download AmyNest AI for reading wins",
  ],
  speech: [
    "Try Speech Practice — Download AmyNest AI",
    "Download AmyNest AI for gentle speech practice",
  ],
  health: [
    "Build healthy habits — Download AmyNest AI",
    "Download AmyNest AI for wellness wins",
  ],
  games: [
    "Play and learn — Download AmyNest AI",
    "Download AmyNest AI for learning games",
  ],
  astro: [
    "Wake up wonder — Download AmyNest AI",
    "Download AmyNest AI for Amy Astro",
  ],
  routine: [
    "Calm the day — Download AmyNest AI",
    "Download AmyNest AI for smarter routines",
  ],
  parenting: [
    "Download AmyNest AI for softer nights",
    "Get AmyNest AI — parenting made lighter",
  ],
  coach: [
    "Ask Amy — Download AmyNest AI",
    "Download AmyNest AI for gentle coaching",
  ],
};

const THUMB_HEROES: ThumbnailHeroStyle[] = [
  "amy-girl-hero",
  "amy-boy-hero",
  "amy-ai-hero",
  "parent-child",
  "two-children",
  "family",
  "feature-ui",
  "emotion",
  "reaction",
  "question",
  "success",
  "curiosity",
  "hope",
];

export function diversifyMetadata(
  content: ContentPackage,
): DiversityMetadataPlan {
  const bucket = detectTopicBucket(content);
  const seed = scriptSeed(content);
  const titles = TITLE_TEMPLATES[bucket];
  // Prefer golden/script title when distinctive; else rotate template.
  const scriptTitle = content.title.replace(/\s*\|\s*AmyNest.*$/i, "").trim();
  const title = scriptTitle.length >= 12
    ? scriptTitle
    : pickBySeed(titles, seed, "title");

  const props = FEATURE_PROPS[bucket] ?? FEATURE_PROPS.learning;
  const prop = pickBySeed(props, seed, "meta-prop");
  const thumbnailHero = pickBySeed(THUMB_HEROES, seed, "thumb-hero");
  const thumbnailHeadline = title.split(/\s+/).slice(0, 4).join(" ");
  const hashtags = unique([
    "#AmyNest",
    "#AmyNestAI",
    "#Shorts",
    ...HASHTAG_SETS[bucket],
    ...content.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)),
  ]).slice(0, 12);

  const description = [
    paragraphHook(content, bucket),
    "",
    paragraphFeature(content, bucket, prop),
    "",
    paragraphBenefit(content),
    "",
    pickBySeed(CTA_BY_BUCKET[bucket] ?? CTA_BY_BUCKET.learning, seed, "cta"),
    "Available on Google Play",
    "Available on the App Store",
    "https://amynest.in",
    "https://amynest.in/get-app",
    "",
    hashtags.join(" "),
  ].join("\n");

  const ctaWording = pickBySeed(
    CTA_BY_BUCKET[bucket] ?? CTA_BY_BUCKET.learning,
    seed,
    "cta",
  );

  return {
    title: `${title} | AmyNest AI`,
    description,
    hashtags,
    playlistName: PLAYLIST_BY_BUCKET[bucket],
    thumbnailHero,
    thumbnailHeadline,
    ctaWording,
    featureProps: props.slice(0, 4),
    topicBucket: bucket,
  };
}

/** Apply unique metadata onto a ContentPackage (publish path). */
export function applyDiversityMetadata(
  content: ContentPackage,
  meta: DiversityMetadataPlan = diversifyMetadata(content),
): ContentPackage {
  return {
    ...content,
    title: meta.title,
    description: meta.description,
    hashtags: meta.hashtags.map((h) => h.replace(/^#/, "")),
    cta: meta.ctaWording,
    keywords: unique([...content.keywords, ...meta.featureProps, meta.topicBucket]),
  };
}

function paragraphHook(
  content: ContentPackage,
  bucket: DiversityTopicBucket,
): string {
  const hook = content.hook?.trim() || content.captions[0]?.text || "";
  if (hook) return hook;
  return `A real ${bucket} moment every parent recognizes — before any app appears.`;
}

function paragraphFeature(
  content: ContentPackage,
  bucket: DiversityTopicBucket,
  prop: string,
): string {
  const feature =
    content.keyPoints?.[1] ||
    content.story?.slice(0, 180) ||
    `AmyNest helps with ${bucket} through ${prop}.`;
  return feature;
}

function paragraphBenefit(content: ContentPackage): string {
  return (
    content.keyPoints?.[2] ||
    "Parents get a clearer next step — and kids feel the win."
  );
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
