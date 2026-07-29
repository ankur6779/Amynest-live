import type { ContentPackage } from "../../types/content-package.js";
import { buildOptimizedDescription } from "../metadata/description-template.js";
import {
  resolveStoreLinks,
  type AmyNestStoreLinks,
} from "../metadata/store-links.js";
import type { DescriptionVariants } from "./types.js";
import type { HashtagPack } from "./types.js";

/** Short / medium / long SEO description variants. */
export function buildDescriptionVariants(input: {
  content: ContentPackage;
  hashtags: HashtagPack;
  links?: AmyNestStoreLinks;
}): DescriptionVariants {
  const links = input.links ?? resolveStoreLinks();
  const topic = input.content.topic.title.trim();
  const tagLine = input.hashtags.all.join(" ");

  const short = [
    `✨ ${topic}`,
    "",
    "Parenting feels easier with AmyNest AI — fresh daily learning in Study Zone.",
    "",
    `📲 ${links.getAppUrl}`,
    "",
    tagLine,
  ].join("\n");

  const medium = [
    "✨ Parenting feels easier with AmyNest AI.",
    "",
    `${topic} — Study Zone gives your child a fresh, age-appropriate lesson every day.`,
    "",
    "📚 Daily Study Zone · Routines · Speech · Health · Games · Amy AI Coach",
    "",
    "📲 Download AmyNest AI",
    links.websiteUrl,
    links.getAppUrl,
    "",
    `▶ Play: ${links.playStoreUrl}`,
    `🍎 App Store: ${links.appStoreUrl}`,
    "",
    tagLine,
  ].join("\n");

  const long = [
    buildOptimizedDescription(links),
    "",
    `Topic focus: ${topic}`,
    `Category: ${input.content.topic.category}`,
    "",
    tagLine,
  ].join("\n");

  return { short, medium, long };
}
