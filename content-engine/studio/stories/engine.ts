/**
 * Story engine — mandatory beat order for every AmyNest Short.
 */

import type { RankedCta, RankedHook, StoryBeatPlan, StudioTopicIdea } from "../types.js";

export function buildStoryBeats(input: {
  idea: StudioTopicIdea;
  hook: RankedHook;
  cta: RankedCta;
}): StoryBeatPlan {
  const feature = input.idea.featureTitle ?? input.idea.category;
  const topic = input.idea.title;

  return {
    hook: input.hook.text,
    problem: `Many parents want progress with ${feature}, but busy days make consistent guidance hard.`,
    whyItHappens:
      "Without a clear daily path, kids bounce between apps and tips — energy goes up, learning stalls.",
    amynestSolution: `AmyNest AI turns ${feature} into a warm, guided experience parents can trust.`,
    featureDemo: `See ${feature} inside AmyNest: gentle prompts, play-led practice, and parent-friendly cues.`,
    parentBenefit: `You get clarity, calm routines, and confidence that ${topic.toLowerCase()} is moving forward.`,
    childBenefit: `Your child feels proud, curious, and supported — learning that feels like play.`,
    cta: input.cta.text,
  };
}

export function storyBeatsToScriptLines(story: StoryBeatPlan): string[] {
  return [
    story.hook,
    story.problem,
    story.whyItHappens,
    story.amynestSolution,
    story.featureDemo,
    story.parentBenefit,
    story.childBenefit,
    story.cta,
  ];
}

export function formatStoryForPrompt(story: StoryBeatPlan): string {
  return [
    "MANDATORY STORY BEATS (keep this order):",
    `1. Hook: ${story.hook}`,
    `2. Problem: ${story.problem}`,
    `3. Why it happens: ${story.whyItHappens}`,
    `4. AmyNest Solution: ${story.amynestSolution}`,
    `5. Feature Demo: ${story.featureDemo}`,
    `6. Parent Benefit: ${story.parentBenefit}`,
    `7. Child Benefit: ${story.childBenefit}`,
    `8. CTA: ${story.cta}`,
  ].join("\n");
}
