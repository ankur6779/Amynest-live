/**
 * Reuse engine — one golden/script message → multi-platform derivatives.
 * Does not change the original message.
 */

import type { ContentPackage } from "../../types/content-package.js";
import { clusterTopicToSeries, getSeriesDefinition } from "../clustering/series.js";
import type { DerivativePlan, PublishPlatform } from "../types.js";

const PLATFORM_SPECS: Array<{
  platform: PublishPlatform;
  formatHint: string;
  bodyStyle: "short" | "mid" | "long";
}> = [
  {
    platform: "youtube-short",
    formatHint: "Vertical 9:16 Short — hook in 1s, hope before CTA",
    bodyStyle: "short",
  },
  {
    platform: "instagram-reel",
    formatHint: "Reel with caption-first storytelling",
    bodyStyle: "short",
  },
  {
    platform: "facebook-reel",
    formatHint: "Family-friendly Reel; softer CTA",
    bodyStyle: "short",
  },
  {
    platform: "pinterest",
    formatHint: "Idea pin — problem + tip + AmyNest help",
    bodyStyle: "mid",
  },
  {
    platform: "blog",
    formatHint: "Short blog draft expanding the same parent insight",
    bodyStyle: "long",
  },
  {
    platform: "email",
    formatHint: "Email snippet for parent nurture",
    bodyStyle: "mid",
  },
  {
    platform: "community",
    formatHint: "Community post inviting shared experience",
    bodyStyle: "mid",
  },
];

export function buildDerivativePlan(input: {
  content: ContentPackage;
  sourceId?: string;
}): DerivativePlan {
  const content = input.content;
  const series = getSeriesDefinition(clusterTopicToSeries(content.topic));
  const coreMessage = [
    content.hook,
    content.story.split(/[.!?]/)[0] ?? content.story,
    content.cta,
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const hashtags = buildHashtags(content, series.label);

  return {
    sourceId: input.sourceId ?? content.topic.id,
    sourceMessage: coreMessage,
    derivatives: PLATFORM_SPECS.map((spec) => ({
      platform: spec.platform,
      formatHint: spec.formatHint,
      title: titleFor(spec.platform, content),
      body: bodyFor(spec.bodyStyle, content, coreMessage),
      cta: content.cta,
      hashtags,
    })),
  };
}

function titleFor(platform: PublishPlatform, content: ContentPackage): string {
  const base = content.title.replace(/\s+/g, " ").trim();
  switch (platform) {
    case "youtube-short":
      return `${base} #Shorts`;
    case "instagram-reel":
    case "facebook-reel":
      return base.length > 60 ? `${base.slice(0, 57)}…` : base;
    case "pinterest":
      return `${base} — Parent Tip`;
    case "blog":
      return `${base}: A Calmer Way Forward`;
    case "email":
      return `Quick tip: ${base}`;
    case "community":
      return `Parents — ${base}`;
  }
}

function bodyFor(
  style: "short" | "mid" | "long",
  content: ContentPackage,
  coreMessage: string,
): string {
  if (style === "short") {
    return `${content.hook}\n\n${truncate(content.story, 180)}\n\n${content.cta}`;
  }
  if (style === "mid") {
    return [
      content.hook,
      "",
      truncate(content.story, 320),
      "",
      content.keyPoints.slice(0, 2).map((k) => `• ${k}`).join("\n"),
      "",
      content.cta,
    ].join("\n");
  }
  return [
    content.hook,
    "",
    content.story,
    "",
    "Key takeaways:",
    ...content.keyPoints.map((k) => `• ${k}`),
    "",
    coreMessage,
    "",
    content.cta,
  ].join("\n");
}

function buildHashtags(
  content: ContentPackage,
  seriesLabel: string,
): string[] {
  const tags = [
    "#AmyNest",
    "#Parenting",
    `#${seriesLabel.replace(/\s+/g, "")}`,
    `#${content.topic.category.replace(/\s+/g, "")}`,
    "#KidsLearning",
    "#FamilyHabits",
  ];
  return unique(tags).slice(0, 8);
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
