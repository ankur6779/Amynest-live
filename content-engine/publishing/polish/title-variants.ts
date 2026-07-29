import type { ContentPackage } from "../../types/content-package.js";
import { clampTitle } from "../metadata/title-utils.js";

/**
 * Five SEO title formats for Continuous Learning to A/B later.
 * Selected title for publish remains variants[0] unless overridden.
 */
export function buildTitleVariants(content: ContentPackage): string[] {
  const topic = content.topic.title.replace(/\s+/g, " ").trim();
  const shortTopic =
    topic.length > 42 ? `${topic.slice(0, 39).trimEnd()}…` : topic;
  const category = content.topic.category;

  const variants = [
    clampTitle(`${shortTopic} | AmyNest AI`),
    clampTitle(`Parents: ${shortTopic} | AmyNest AI`),
    clampTitle(`${category} tip — ${shortTopic} | AmyNest AI`),
    clampTitle(`Try this today: ${shortTopic} | AmyNest AI`),
    clampTitle(`${shortTopic}? AmyNest AI helps`),
  ];

  return unique(variants).slice(0, 5);
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
