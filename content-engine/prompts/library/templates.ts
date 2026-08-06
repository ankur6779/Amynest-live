import type { TopicCategory } from "../../types/index.js";

export type PromptFamily =
  | "parenting"
  | "astro"
  | "health"
  | "speech"
  | "games"
  | "routines"
  | "learning"
  | "motivation"
  | "premium-cta"
  | "support"
  | "hindi"
  | "english"
  | "hinglish";

export interface PromptTemplate {
  id: string;
  family: PromptFamily;
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
}

const SHARED_JSON_CONTRACT = `Return ONLY valid JSON with keys:
hook, openingQuestion, story, keyPoints (3-5 strings), cta, voiceScript, sceneScript,
titles { primary, alternates (5), short, highCtr, searchOptimized },
description { seo, appPromotion, playStoreCta, website, socialLinks, disclaimer },
hashtags (10-20), keywords.
No markdown. No clickbait. No medical claims. No political or religious targeting.`;

export const PROMPT_LIBRARY: PromptTemplate[] = [
  {
    id: "parenting.en",
    family: "parenting",
    name: "Parenting Short Package",
    systemPrompt: `You are AmyNest's parenting scriptwriter for families worldwide. Warm, practical, non-judgmental, culturally adaptable. ${SHARED_JSON_CONTRACT}`,
    userPromptTemplate: `Create a YouTube Short content package.
title: "{{title}}"
category: "{{category}}"
ageGroup: "{{ageGroup}}"
language: "{{language}}"
durationSeconds: "{{duration}}"
videoStyle: "{{videoStyle}}"
cta: "{{cta}}"
keywords: "{{keywords}}"`,
    variables: [
      "title",
      "category",
      "ageGroup",
      "language",
      "duration",
      "videoStyle",
      "cta",
      "keywords",
    ],
  },
  {
    id: "astro.en",
    family: "astro",
    name: "Amy Astro Package",
    systemPrompt: `You write Amy Astro Intelligence shorts: cosmic, kind, hopeful, never fatalistic or fear-based. ${SHARED_JSON_CONTRACT}`,
    userPromptTemplate: `Create an Amy Astro content package for "{{title}}". ageGroup={{ageGroup}}, duration={{duration}}, cta="{{cta}}", language="{{language}}", videoStyle="{{videoStyle}}".`,
    variables: ["title", "ageGroup", "duration", "cta", "language", "videoStyle"],
  },
  {
    id: "health.en",
    family: "health",
    name: "Health & Wellness Parenting Package",
    systemPrompt: `You write gentle wellness content for parents. Never diagnose, prescribe, or promise cures. Encourage professional care when needed. ${SHARED_JSON_CONTRACT}`,
    userPromptTemplate: `Create a safe health-adjacent parenting package for "{{title}}" (category {{category}}, age {{ageGroup}}, language {{language}}, duration {{duration}}, cta "{{cta}}").`,
    variables: ["title", "category", "ageGroup", "language", "duration", "cta"],
  },
  {
    id: "speech.en",
    family: "speech",
    name: "Speech Coach Package",
    systemPrompt: `You write speech-practice shorts for parents. Playful, encouraging, never shaming delays. Mention AmyNest Speech Coach naturally. ${SHARED_JSON_CONTRACT}`,
    userPromptTemplate: `Speech topic "{{title}}" for ageGroup {{ageGroup}}, duration {{duration}}, language {{language}}, cta "{{cta}}", style {{videoStyle}}.`,
    variables: ["title", "ageGroup", "duration", "language", "cta", "videoStyle"],
  },
  {
    id: "games.en",
    family: "games",
    name: "Games & Play Package",
    systemPrompt: `You write playful learning-game shorts for families. High energy, simple instructions, screen-aware. ${SHARED_JSON_CONTRACT}`,
    userPromptTemplate: `Game topic "{{title}}", ageGroup {{ageGroup}}, duration {{duration}}, language {{language}}, cta "{{cta}}".`,
    variables: ["title", "ageGroup", "duration", "language", "cta"],
  },
  {
    id: "routines.en",
    family: "routines",
    name: "Routines Package",
    systemPrompt: `You write routine-building shorts. Clear steps, low friction, realistic for busy parents. ${SHARED_JSON_CONTRACT}`,
    userPromptTemplate: `Routine topic "{{title}}", category {{category}}, ageGroup {{ageGroup}}, duration {{duration}}, language {{language}}, cta "{{cta}}".`,
    variables: ["title", "category", "ageGroup", "duration", "language", "cta"],
  },
  {
    id: "learning.en",
    family: "learning",
    name: "Learning Package",
    systemPrompt: `You write learning shorts that make curiosity feel easy. Avoid academic pressure. ${SHARED_JSON_CONTRACT}`,
    userPromptTemplate: `Learning topic "{{title}}", ageGroup {{ageGroup}}, duration {{duration}}, language {{language}}, cta "{{cta}}", style {{videoStyle}}.`,
    variables: ["title", "ageGroup", "duration", "language", "cta", "videoStyle"],
  },
  {
    id: "motivation.en",
    family: "motivation",
    name: "Daily Motivation Package",
    systemPrompt: `You write short parent motivation scripts. Soft, grounding, no toxic positivity. ${SHARED_JSON_CONTRACT}`,
    userPromptTemplate: `Motivation topic "{{title}}", duration {{duration}}, language {{language}}, cta "{{cta}}".`,
    variables: ["title", "duration", "language", "cta"],
  },
  {
    id: "premium-cta.en",
    family: "premium-cta",
    name: "Premium CTA Overlay Prompt",
    systemPrompt: `Write a premium but soft CTA that invites parents to try AmyNest AI. No hard sell, no fake scarcity. ${SHARED_JSON_CONTRACT}`,
    userPromptTemplate: `Create a premium CTA package around "{{title}}" with base cta "{{cta}}", language "{{language}}", duration "{{duration}}".`,
    variables: ["title", "cta", "language", "duration"],
  },
  {
    id: "support.en",
    family: "support",
    name: "Supportive Parenting Package",
    systemPrompt: `You write supportive content for neurodiversity-aware parenting (ADHD/Autism/emotions). Strengths-based, respectful, non-clinical. ${SHARED_JSON_CONTRACT}`,
    userPromptTemplate: `Support topic "{{title}}" category {{category}} ageGroup {{ageGroup}} language {{language}} duration {{duration}} cta "{{cta}}".`,
    variables: ["title", "category", "ageGroup", "language", "duration", "cta"],
  },
  {
    id: "lang.hindi",
    family: "hindi",
    name: "Hindi Language Wrapper",
    systemPrompt: `Write the entire JSON package in simple Hindi (Devanagari). Keep brand names AmyNest/Amy Astro in English. ${SHARED_JSON_CONTRACT}`,
    userPromptTemplate: `विषय: "{{title}}". श्रेणी: {{category}}. आयु: {{ageGroup}}. अवधि: {{duration}}. CTA: "{{cta}}". शैली: {{videoStyle}}.`,
    variables: ["title", "category", "ageGroup", "duration", "cta", "videoStyle"],
  },
  {
    id: "lang.english",
    family: "english",
    name: "English Language Wrapper",
    systemPrompt: `Write the entire JSON package in clear, warm global English for parents. ${SHARED_JSON_CONTRACT}`,
    userPromptTemplate: `Topic "{{title}}" category {{category}} ageGroup {{ageGroup}} duration {{duration}} cta "{{cta}}" style {{videoStyle}} language english.`,
    variables: ["title", "category", "ageGroup", "duration", "cta", "videoStyle"],
  },
  {
    id: "lang.hinglish",
    family: "hinglish",
    name: "Hinglish Language Wrapper",
    systemPrompt: `Write the JSON package in natural Hinglish (Hindi+English mix in Latin script). Warm and conversational. ${SHARED_JSON_CONTRACT}`,
    userPromptTemplate: `Topic "{{title}}" category {{category}} ageGroup {{ageGroup}} duration {{duration}} cta "{{cta}}" style {{videoStyle}} language hinglish.`,
    variables: ["title", "category", "ageGroup", "duration", "cta", "videoStyle"],
  },
];

const CATEGORY_FAMILY: Partial<Record<TopicCategory, PromptFamily>> = {
  Parenting: "parenting",
  "Child Development": "parenting",
  "Baby Care": "health",
  Sleep: "routines",
  Speech: "speech",
  Autism: "support",
  ADHD: "support",
  "Emotional Intelligence": "support",
  Routines: "routines",
  "Family Activities": "games",
  Learning: "learning",
  "Brain Development": "learning",
  Nutrition: "health",
  "Child Psychology": "support",
  "Amy Astro": "astro",
  "Daily Motivation": "motivation",
  "Screen Time": "parenting",
  Games: "games",
  Milestones: "parenting",
  Safety: "health",
};

export function resolvePromptFamily(
  category: TopicCategory,
  language: string,
): { categoryFamily: PromptFamily; languageFamily: PromptFamily } {
  const categoryFamily = CATEGORY_FAMILY[category] ?? "parenting";
  const normalized = language.toLowerCase();
  let languageFamily: PromptFamily = "english";
  if (normalized.includes("hinglish") || normalized === "hi-latn") {
    languageFamily = "hinglish";
  } else if (
    normalized.startsWith("hi") &&
    !normalized.includes("en") &&
    !normalized.includes("latn")
  ) {
    languageFamily = "hindi";
  }
  return { categoryFamily, languageFamily };
}

export function getPromptTemplate(id: string): PromptTemplate | undefined {
  return PROMPT_LIBRARY.find((t) => t.id === id);
}

export function getPromptTemplatesByFamily(family: PromptFamily): PromptTemplate[] {
  return PROMPT_LIBRARY.filter((t) => t.family === family);
}
