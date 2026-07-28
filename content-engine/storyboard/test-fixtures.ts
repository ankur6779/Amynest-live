import type { ContentPackage } from "../types/content-package.js";
import { CONTENT_PACKAGE_VERSION } from "../types/content-package.js";

/** Deterministic Phase 2 package fixture for storyboard tests. */
export function makeContentPackage(
  overrides: Partial<ContentPackage> = {},
): ContentPackage {
  return {
    topic: {
      id: "parenting-001",
      title: "Gentle Discipline That Actually Works",
      category: "Parenting",
      difficulty: "beginner",
      ageGroup: "all",
      keywords: ["parenting", "discipline", "amynest"],
      cta: "Try AmyNest AI for calmer daily parenting support",
      priority: 10,
      estimatedDuration: 30,
      videoStyle: "short",
    },
    title: "Gentle Discipline That Actually Works | AmyNest AI",
    alternateTitles: [
      "Gentle Discipline — A Calm Parent Guide",
      "Practical Discipline Tips for Busy Parents",
      "Discipline Without the Stress",
      "Calm Discipline Tips You Can Use Today",
      "How Families Handle Gentle Discipline",
      "Gentle Discipline",
      "Try This Gentle Discipline Approach",
      "Gentle Discipline Tips for Parents | AmyNest",
    ],
    hook: "Parents — gentle discipline starts with one small change.",
    openingQuestion: "What if today felt a little calmer around parenting?",
    story:
      "Many families struggle with gentle discipline. Tiny consistent steps beat perfect plans. AmyNest helps you practice gently.",
    keyPoints: [
      "Start with one clear, kind cue.",
      "Keep the routine short and repeatable.",
      "Celebrate progress, not perfection.",
      "Use AmyNest to stay consistent daily.",
    ],
    cta: "Try AmyNest AI for calmer daily parenting support",
    voiceScript:
      "Parents — gentle discipline starts with one small change. What if today felt a little calmer around parenting? Here is a simple approach you can try tonight. Start with one clear, kind cue. Keep the routine short and repeatable. Celebrate progress, not perfection. Try AmyNest AI for calmer daily parenting support.",
    sceneScript:
      "SCENE 1 | warm home | HOOK\nSCENE 2 | connection | QUESTION\nSCENE 3 | tip cards | KEY POINTS\nSCENE 4 | app UI | CTA",
    captions: [
      {
        start: 0,
        end: 6,
        text: "Parents — gentle discipline starts with one small change.",
        style: "emphasis",
        position: "bottom",
      },
      {
        start: 6,
        end: 12,
        text: "What if today felt a little calmer around parenting?",
        style: "question",
        position: "bottom",
      },
      {
        start: 12,
        end: 22,
        text: "Start with one clear, kind cue.",
        style: "default",
        position: "bottom",
      },
      {
        start: 22,
        end: 30,
        text: "Try AmyNest AI for calmer daily parenting support",
        style: "cta",
        position: "bottom",
      },
    ],
    description: "Gentle discipline tips for parents. Try AmyNest AI.",
    hashtags: [
      "AmyNest",
      "Parenting",
      "ParentingTips",
      "Kids",
      "MomLife",
      "DadLife",
      "GentleParenting",
      "IndianParents",
      "Shorts",
      "ChildDevelopment",
      "AmyAstro",
      "FamilyRoutine",
    ],
    keywords: ["gentle discipline", "parenting", "amynest", "kids routine"],
    seoScore: 82,
    readingTime: 28,
    estimatedDuration: 30,
    language: "en-IN",
    provider: "mock",
    generatedAt: "2026-07-27T00:00:00.000Z",
    version: CONTENT_PACKAGE_VERSION,
    ...overrides,
  };
}
