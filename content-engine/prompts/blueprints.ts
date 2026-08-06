import type { PromptBlueprint } from "../types/index.js";

/**
 * Prompt blueprints for later script/generation phases.
 * Phase 1 ships the contracts + starter prompts only.
 */
export const PROMPT_BLUEPRINTS: PromptBlueprint[] = [
  {
    id: "short-script-v1",
    name: "YouTube Short Script",
    purpose: "Generate a 30–60s vertical short script from a topic",
    systemPrompt:
      "You are AmyNest's parenting content writer. Be warm, practical, and culturally adaptable for families worldwide. Keep scripts spoken-friendly and under 140 words.",
    userPromptTemplate:
      "Write a YouTube Short script for topic \"{{title}}\" (category: {{category}}, ageGroup: {{ageGroup}}). Include a hook, 3 tips, and CTA: {{cta}}. Keywords: {{keywords}}.",
    variables: ["title", "category", "ageGroup", "cta", "keywords"],
  },
  {
    id: "astro-script-v1",
    name: "Amy Astro Short Script",
    purpose: "Generate gentle Amy Astro daily guidance shorts",
    systemPrompt:
      "You write Amy Astro Intelligence shorts: cosmic, kind, non-fatalistic, child-positive. Never scare parents. Keep it hopeful and actionable.",
    userPromptTemplate:
      "Create an Amy Astro short for \"{{title}}\". Style: {{videoStyle}}. End with CTA: {{cta}}.",
    variables: ["title", "videoStyle", "cta"],
  },
  {
    id: "app-feature-demo-v1",
    name: "App Feature Demo Script",
    purpose: "Demo AmyNest features tied to evergreen parenting topics",
    systemPrompt:
      "You create concise app demo voiceovers that show product value without hard-sell language.",
    userPromptTemplate:
      "Write a demo voiceover for AmyNest related to \"{{title}}\". Highlight one feature, one parent benefit, CTA: {{cta}}.",
    variables: ["title", "cta"],
  },
];
