import type { ContentPackage } from "../../types/content-package.js";
import type { HashtagPack } from "./types.js";

const PRIMARY = [
  "#AmyNest",
  "#AmyNestAI",
  "#Parenting",
  "#KidsLearning",
  "#StudyZone",
];

const TRENDING = [
  "#ParentingTips",
  "#EarlyLearning",
  "#MomLife",
  "#DadLife",
  "#LearningApps",
  "#Shorts",
];

/** Generate primary / trending / topic hashtags (combined max 15). */
export function buildHashtagPack(content: ContentPackage): HashtagPack {
  const topicSeeds = [
    content.topic.category,
    ...content.topic.keywords.slice(0, 4),
    ...content.hashtags.slice(0, 4),
  ];
  const topic = uniqueHashes(
    topicSeeds.map((s) => toHash(s)).filter(Boolean),
  ).slice(0, 6);

  const primary = PRIMARY.slice();
  const trending = TRENDING.slice();
  const all = uniqueHashes([...primary, ...trending, ...topic]).slice(0, 15);

  return { primary, trending, topic, all };
}

function toHash(raw: string): string {
  const cleaned = raw
    .replace(/^#/, "")
    .replace(/[^a-zA-Z0-9\u0900-\u097F]+/g, "")
    .trim();
  if (!cleaned) return "";
  return `#${cleaned}`;
}

function uniqueHashes(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}
