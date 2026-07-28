import { makeContentPackage } from "../../storyboard/test-fixtures.js";
import type { ContentPackage } from "../../types/content-package.js";
import type { StoryboardPackage } from "../../types/storyboard.js";
import { StoryboardPlanner } from "../../storyboard/planner.js";
import type { ContentEngineConfig } from "../../types/index.js";

export const TEST_VEO_TARGET_DURATION_SECONDS = 10;
/** Veo API allows 4 | 6 | 8 only; final package is padded to ~10s. */
export const TEST_VEO_API_DURATION_SECONDS = 8 as const;

export const TEST_VEO_VOICE_SCRIPT =
  "Great habits begin with one small step. Help your child build confidence every single day with AmyNest.";

export const TEST_VEO_END_CARD = "Build Better Habits Every Day";

export function buildTestVeoContentPackage(): ContentPackage {
  return makeContentPackage({
    topic: {
      id: "amynest-veo-test-001",
      title: "AmyNest Parenting — Morning Habits",
      category: "Parenting",
      difficulty: "beginner",
      ageGroup: "all",
      keywords: ["amynest", "parenting", "habits", "morning routine"],
      cta: TEST_VEO_END_CARD,
      priority: 100,
      estimatedDuration: TEST_VEO_TARGET_DURATION_SECONDS,
      videoStyle: "short",
    },
    title: "Build Better Habits Every Day | AmyNest AI",
    hook: "Great habits begin with one small step.",
    openingQuestion: "What if mornings felt easier for your child?",
    story:
      "A warm sunrise fills a modern child's bedroom. A smiling young child happily completes a morning routine using the AmyNest app on a tablet while a mother watches proudly.",
    keyPoints: [
      "Start with one tiny habit.",
      "Celebrate progress daily.",
      "Stay consistent with AmyNest.",
    ],
    cta: TEST_VEO_END_CARD,
    voiceScript: TEST_VEO_VOICE_SCRIPT,
    sceneScript:
      "SCENE 1 | sunrise bedroom | ROUTINE + APP\nSCENE 2 | end card | CTA",
    captions: buildTestVeoCaptions(),
    description:
      "AmyNest helps families build better habits every day with calm, consistent routines.",
    hashtags: ["AmyNest", "Parenting", "Habits", "KidsRoutine", "Shorts"],
    keywords: ["amynest", "parenting", "habits", "veo-test"],
    seoScore: 88,
    readingTime: 9,
    estimatedDuration: TEST_VEO_TARGET_DURATION_SECONDS,
    language: "en-IN",
    provider: "mock",
    generatedAt: new Date().toISOString(),
  });
}

export function buildTestVeoCaptions(): ContentPackage["captions"] {
  return [
    {
      start: 0,
      end: 4,
      text: "Great habits begin with one small step.",
      style: "emphasis",
      position: "bottom",
    },
    {
      start: 4,
      end: 8,
      text: "Help your child build confidence every day.",
      style: "default",
      position: "bottom",
    },
    {
      start: 8,
      end: 10,
      text: TEST_VEO_END_CARD,
      style: "cta",
      position: "bottom",
    },
  ];
}

/**
 * Build a valid StoryboardPackage (15s supported duration) and force the
 * first scene to Future AI Video so the Veo provider can attach.
 */
export function buildTestVeoStoryboard(
  content: ContentPackage,
  config: ContentEngineConfig,
): StoryboardPackage {
  const { package: storyboard } = new StoryboardPlanner({ config }).planFromContentPackage(
    content,
    15,
  );

  const hero = storyboard.scenes[0];
  if (hero) {
    hero.visualType = "Future AI Video";
    hero.purpose = "story";
    hero.camera = "Push";
    hero.emotion = "warm";
    hero.animation = "Fade";
    hero.background =
      "Warm sunrise modern child's bedroom with AmyNest tablet routine";
    hero.voice = TEST_VEO_VOICE_SCRIPT;
    hero.caption = content.captions[0]?.text ?? content.hook;
    hero.assetRequirements = [
      {
        assetId: "veo-hero-clip",
        sceneId: hero.sceneId,
        requiredAssetType: "Future AI Video",
        imagePrompt: "",
        videoPrompt: content.story,
        screenRecordingTemplate: "",
        fallbackAsset: "placeholder-sunrise",
        priority: 1,
      },
    ];
  }

  storyboard.assets = storyboard.scenes.flatMap((s) => s.assetRequirements);
  storyboard.branding.cta = TEST_VEO_END_CARD;
  storyboard.captionPlan.items = content.captions.map((c, index) => ({
    sceneId: hero?.sceneId ?? "scene-1",
    captionId: `cap-${index + 1}`,
    start: c.start,
    end: c.end,
    text: c.text,
    style: c.style,
    position: c.position,
  }));
  storyboard.voicePlan = {
    items: [
      {
        sceneId: hero?.sceneId ?? "scene-1",
        start: 0,
        end: Math.min(9, TEST_VEO_TARGET_DURATION_SECONDS),
        text: TEST_VEO_VOICE_SCRIPT,
        emotion: "warm",
        pace: "moderate",
      },
    ],
    totalSpokenSeconds: 9,
  };

  return storyboard;
}
