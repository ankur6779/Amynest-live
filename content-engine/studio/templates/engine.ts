/**
 * Master studio templates — wrap existing VIDEO_TEMPLATES (do not replace them).
 */

import { VIDEO_TEMPLATES } from "../../templates/video-templates.js";
import type { StudioCategory, StudioTemplate, StudioTopicIdea } from "../types.js";

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  {
    id: "studio-learning",
    label: "Learning",
    category: "Learning",
    videoTemplateId: "vertical-short-tips",
    defaultEmotion: "curiosity",
    defaultDuration: 20,
    characterPreference: "amy-ai",
  },
  {
    id: "studio-astro",
    label: "Astro",
    category: "Astro",
    videoTemplateId: "astro-daily",
    defaultEmotion: "hope",
    defaultDuration: 20,
    characterPreference: "amy-ai",
  },
  {
    id: "studio-speech",
    label: "Speech",
    category: "Speech",
    videoTemplateId: "app-feature-demo",
    defaultEmotion: "confidence",
    defaultDuration: 20,
    characterPreference: "amy-girl",
  },
  {
    id: "studio-games",
    label: "Games",
    category: "Games",
    videoTemplateId: "vertical-short-tips",
    defaultEmotion: "achievement",
    defaultDuration: 15,
    characterPreference: "amy-boy",
  },
  {
    id: "studio-health",
    label: "Health",
    category: "Health",
    videoTemplateId: "app-feature-demo",
    defaultEmotion: "calm",
    defaultDuration: 20,
    characterPreference: "amy-ai",
  },
  {
    id: "studio-routine",
    label: "Routine",
    category: "Routine",
    videoTemplateId: "motivation-reset",
    defaultEmotion: "routine-success",
    defaultDuration: 15,
    characterPreference: "amy-ai",
  },
  {
    id: "studio-parent-tip",
    label: "Parent Tip",
    category: "Parent Tips",
    videoTemplateId: "vertical-short-tips",
    defaultEmotion: "confidence",
    defaultDuration: 20,
    characterPreference: "amy-ai",
  },
  {
    id: "studio-weekend",
    label: "Weekend Activity",
    category: "Weekend Activities",
    videoTemplateId: "vertical-short-tips",
    defaultEmotion: "bonding",
    defaultDuration: 20,
    characterPreference: "amy-girl",
  },
  {
    id: "studio-premium",
    label: "Premium Feature",
    category: "Premium",
    videoTemplateId: "app-feature-demo",
    defaultEmotion: "pride",
    defaultDuration: 20,
    characterPreference: "amy-ai",
  },
  {
    id: "studio-success",
    label: "Success Story",
    category: "Milestones",
    videoTemplateId: "motivation-reset",
    defaultEmotion: "pride",
    defaultDuration: 20,
    characterPreference: "amy-boy",
  },
];

const CATEGORY_TEMPLATE: Partial<Record<StudioCategory, string>> = {
  Learning: "studio-learning",
  Speech: "studio-speech",
  Health: "studio-health",
  Routine: "studio-routine",
  Games: "studio-games",
  Astro: "studio-astro",
  "Amy Coach": "studio-parent-tip",
  "Audio Lessons": "studio-learning",
  Nutrition: "studio-health",
  "Parent Tips": "studio-parent-tip",
  "Brain Development": "studio-learning",
  "Emotional Intelligence": "studio-parent-tip",
  Reading: "studio-learning",
  Writing: "studio-learning",
  Math: "studio-learning",
  Science: "studio-learning",
  Memory: "studio-learning",
  Focus: "studio-routine",
  "Motor Skills": "studio-games",
  Creativity: "studio-games",
  "Weekend Activities": "studio-weekend",
  "Family Time": "studio-weekend",
  "School Preparation": "studio-learning",
  Premium: "studio-premium",
  "Feature Updates": "studio-premium",
  Milestones: "studio-success",
  "Daily Parenting Tips": "studio-parent-tip",
};

export function selectStudioTemplate(idea: StudioTopicIdea): StudioTemplate {
  const id = CATEGORY_TEMPLATE[idea.category] ?? "studio-parent-tip";
  return STUDIO_TEMPLATES.find((t) => t.id === id) ?? STUDIO_TEMPLATES[0]!;
}

export function resolveUnderlyingVideoTemplate(template: StudioTemplate) {
  return VIDEO_TEMPLATES.find((t) => t.id === template.videoTemplateId);
}

export function formatTemplateForPrompt(template: StudioTemplate): string {
  const underlying = resolveUnderlyingVideoTemplate(template);
  return [
    `STUDIO TEMPLATE: ${template.label} (${template.id})`,
    `Underlying video template: ${underlying?.name ?? template.videoTemplateId}`,
    `Preferred official character: ${template.characterPreference}`,
    `Default emotion: ${template.defaultEmotion}; duration hint: ${template.defaultDuration}s`,
  ].join("\n");
}
