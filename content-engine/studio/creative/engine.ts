/**
 * Creative director — assembles a full StudioCreativeBrief.
 */

import { selectBrandCharacters } from "../../brand/characters.js";
import { generateCtas, pickBestCta } from "../cta/engine.js";
import { planCinematography, formatCinematographyForPrompt } from "../cinematography/engine.js";
import { describeEmotion } from "../emotions/engine.js";
import { generateHooks, pickBestHook } from "../hooks/engine.js";
import { classifyMusicMood, formatMusicForPrompt } from "../music/engine.js";
import { selectMotionPresets, formatMotionForPrompt } from "../motion/engine.js";
import {
  buildPsychologyTriggers,
  formatPsychologyForPrompt,
} from "../psychology/engine.js";
import { scoreStudioCreative } from "../quality/engine.js";
import { planRetention, formatRetentionForPrompt } from "../retention/engine.js";
import {
  buildStoryBeats,
  formatStoryForPrompt,
} from "../stories/engine.js";
import { selectStudioTemplate, formatTemplateForPrompt } from "../templates/engine.js";
import type {
  StudioAnalyticsInsights,
  StudioCreativeBrief,
  StudioTopicIdea,
} from "../types.js";
import { buildVoiceStyle, formatVoiceForPrompt } from "../voice/engine.js";

export function buildCreativeBrief(input: {
  idea: StudioTopicIdea;
  language?: string;
  insights?: StudioAnalyticsInsights;
}): StudioCreativeBrief {
  const idea = input.idea;
  const hooks = generateHooks(idea, input.insights);
  const selectedHook = pickBestHook(hooks);
  const ctas = generateCtas(idea, input.insights);
  const selectedCta = pickBestCta(ctas);
  const story = buildStoryBeats({ idea, hook: selectedHook, cta: selectedCta });
  const psychology = buildPsychologyTriggers(idea);
  const retention = planRetention({
    idea,
    story,
    hookRetentionPredict: selectedHook.retentionPredict,
  });
  const motion = selectMotionPresets(idea);
  const music = classifyMusicMood(idea);
  const voice = buildVoiceStyle({
    idea,
    language: input.language ?? "en",
  });
  const template = selectStudioTemplate(idea);
  const cinema = planCinematography(idea);
  const casting = selectBrandCharacters({
    category: idea.category,
    title: idea.title,
    keywords: idea.keywords,
  });
  const characterLine = [casting.primary, ...casting.supporting].join(", ");

  const qualityPreview = scoreStudioCreative({
    idea,
    hook: selectedHook,
    cta: selectedCta,
    story,
    retention,
    brandOk: true,
  });

  const systemPromptBlock = [
    "=== AMYNEST AI CONTENT STUDIO BRIEF ===",
    `Topic: ${idea.title}`,
    `Category: ${idea.category} | Emotion: ${idea.emotion} | Age: ${idea.targetAge}`,
    `Feature: ${idea.featureTitle ?? idea.category}`,
    `Official characters only: ${characterLine} (pillar: ${casting.pillar})`,
    describeEmotion(idea),
    formatTemplateForPrompt(template),
    formatStoryForPrompt(story),
    formatPsychologyForPrompt(psychology),
    formatRetentionForPrompt(retention),
    formatMotionForPrompt(motion),
    formatMusicForPrompt(music),
    formatVoiceForPrompt(voice),
    formatCinematographyForPrompt(cinema),
    `Selected hook: ${selectedHook.text}`,
    `Selected CTA: ${selectedCta.text}`,
    `Quality preview overall: ${qualityPreview.overall}`,
    "Maintain premium Pixar-inspired quality. Mandatory AmyNest end card with app icon + store badges.",
    "=== END STUDIO BRIEF ===",
  ].join("\n");

  return {
    topicIdea: idea,
    selectedHook,
    hooks,
    story,
    psychology,
    retention,
    selectedCta,
    ctas,
    motion,
    music,
    voice,
    template,
    qualityPreview,
    systemPromptBlock,
  };
}
