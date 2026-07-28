export type HashtagTier = "high" | "medium" | "brand" | "long-tail";

export interface RankedHashtag {
  tag: string;
  tier: HashtagTier;
}

const BRAND_TAGS = ["AmyNest", "AmyAstro", "AmyNestAI", "AmyNestApp"];
const HIGH_VOLUME = [
  "Parenting",
  "Kids",
  "MomLife",
  "DadLife",
  "ParentingTips",
  "Shorts",
  "Family",
  "Toddler",
];
const MEDIUM_VOLUME = [
  "PositiveParenting",
  "ChildDevelopment",
  "GentleParenting",
  "IndianParents",
  "KidsLearning",
  "SpeechTherapyAtHome",
  "ToddlerActivities",
  "ParentingIndia",
];

/** Normalize, classify, and trim to 10–20 mixed-tier hashtags. */
export function refineHashtags(
  raw: string[],
  extras: string[] = [],
  min = 10,
  max = 20,
): string[] {
  const ranked: RankedHashtag[] = [];
  const seen = new Set<string>();

  const push = (value: string, tier: HashtagTier) => {
    const tag = normalizeTag(value);
    if (!tag) return;
    const key = tag.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    ranked.push({ tag, tier });
  };

  for (const tag of BRAND_TAGS) push(tag, "brand");
  for (const tag of raw) push(tag, classifyTag(tag));
  for (const tag of extras) push(tag, "long-tail");
  for (const tag of HIGH_VOLUME) push(tag, "high");
  for (const tag of MEDIUM_VOLUME) push(tag, "medium");

  const brand = ranked.filter((h) => h.tier === "brand");
  const high = ranked.filter((h) => h.tier === "high");
  const medium = ranked.filter((h) => h.tier === "medium");
  const longTail = ranked.filter((h) => h.tier === "long-tail");

  const mixed: RankedHashtag[] = [];
  const take = (list: RankedHashtag[], n: number) => {
    for (const item of list) {
      if (mixed.length >= max) break;
      if (mixed.some((m) => m.tag.toLowerCase() === item.tag.toLowerCase())) continue;
      mixed.push(item);
      if ([...mixed].filter((m) => m.tier === item.tier).length >= n && item.tier !== "brand") {
        // keep filling from other tiers
      }
    }
  };

  take(brand, 4);
  take(high, 6);
  take(medium, 6);
  take(longTail, 6);

  // Fill remaining from any leftover ranked tags.
  for (const item of ranked) {
    if (mixed.length >= max) break;
    if (!mixed.some((m) => m.tag.toLowerCase() === item.tag.toLowerCase())) {
      mixed.push(item);
    }
  }

  const tags = mixed.map((h) => h.tag);
  if (tags.length < min) {
    let i = 1;
    while (tags.length < min) {
      const filler = `ParentTip${i}`;
      if (!tags.some((t) => t.toLowerCase() === filler.toLowerCase())) {
        tags.push(filler);
      }
      i += 1;
    }
  }

  return tags.slice(0, max);
}

export function classifyTag(tag: string): HashtagTier {
  const normalized = normalizeTag(tag).toLowerCase();
  if (BRAND_TAGS.some((b) => b.toLowerCase() === normalized)) return "brand";
  if (HIGH_VOLUME.some((b) => b.toLowerCase() === normalized)) return "high";
  if (MEDIUM_VOLUME.some((b) => b.toLowerCase() === normalized)) return "medium";
  return "long-tail";
}

function normalizeTag(value: string): string {
  return value.replace(/^#+/, "").replace(/[^\w]/g, "").trim();
}
