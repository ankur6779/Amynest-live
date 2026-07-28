import type { VideoTemplate } from "../types/index.js";

/**
 * Video structure templates for later production phases.
 */
export const VIDEO_TEMPLATES: VideoTemplate[] = [
  {
    id: "vertical-short-tips",
    name: "Vertical Tips Short",
    videoStyle: "short",
    aspectRatio: "9:16",
    maxDurationSeconds: 60,
    sections: ["hook", "tip-1", "tip-2", "tip-3", "cta"],
    defaultCta: "Try AmyNest AI free — link in description",
  },
  {
    id: "astro-daily",
    name: "Amy Astro Daily",
    videoStyle: "astro",
    aspectRatio: "9:16",
    maxDurationSeconds: 45,
    sections: ["cosmic-open", "guidance", "family-action", "cta"],
    defaultCta: "Open Amy Astro Intelligence in AmyNest AI",
  },
  {
    id: "app-feature-demo",
    name: "App Feature Demo",
    videoStyle: "app-feature",
    aspectRatio: "9:16",
    maxDurationSeconds: 45,
    sections: ["problem", "feature-demo", "parent-benefit", "cta"],
    defaultCta: "Download AmyNest AI today",
  },
  {
    id: "motivation-reset",
    name: "Daily Motivation Reset",
    videoStyle: "motivation",
    aspectRatio: "9:16",
    maxDurationSeconds: 30,
    sections: ["affirmation", "tiny-action", "cta"],
    defaultCta: "Start your day with AmyNest AI",
  },
];
