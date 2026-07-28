/**
 * Master content knowledge — scans the repo via brand feature discovery.
 * Never uses a static feature list; every discovered feature becomes a topic seed.
 */

import {
  discoverAmyNestFeatures,
  findRepoRootQuiet,
  type DiscoveredFeature,
} from "../../brand/index.js";
import type { StudioCategory } from "../types.js";

export interface KnowledgeSnapshot {
  scannedAt: string;
  repoRoot: string;
  featureCount: number;
  features: DiscoveredFeature[];
  topicSeeds: KnowledgeTopicSeed[];
}

export interface KnowledgeTopicSeed {
  id: string;
  title: string;
  category: StudioCategory;
  featureId: string;
  featureTitle: string;
  keywords: string[];
  sourcePath: string;
}

const CATEGORY_MAP: Array<{ match: RegExp; category: StudioCategory }> = [
  { match: /speech|phonics|pronunciation|articulation/i, category: "Speech" },
  { match: /health|lab|wellness|growth|sleep|nutrition/i, category: "Health" },
  { match: /routine|habit|schedule|morning|bedtime/i, category: "Routine" },
  { match: /game|play|quiz|puzzle/i, category: "Games" },
  { match: /astro|star|constellation|horoscope/i, category: "Astro" },
  { match: /coach|amy\s*coach|guidance|chat/i, category: "Amy Coach" },
  { match: /audio|lesson|listen|soundscape/i, category: "Audio Lessons" },
  { match: /read|literacy|story|book/i, category: "Reading" },
  { match: /write|handwriting|spelling/i, category: "Writing" },
  { match: /math|number|count|abacus/i, category: "Math" },
  { match: /science|experiment|nature/i, category: "Science" },
  { match: /memory|recall|remember/i, category: "Memory" },
  { match: /focus|attention|concentration/i, category: "Focus" },
  { match: /motor|fine motor|gross motor|movement/i, category: "Motor Skills" },
  { match: /creativ|art|draw|imagine/i, category: "Creativity" },
  { match: /emotion|eq|feelings|calm/i, category: "Emotional Intelligence" },
  { match: /brain|cognitive|develop/i, category: "Brain Development" },
  { match: /weekend|family|together/i, category: "Family Time" },
  { match: /school|prep|homework/i, category: "School Preparation" },
  { match: /premium|pro|subscription|unlock/i, category: "Premium" },
  { match: /milestone|age|growth track/i, category: "Milestones" },
  { match: /nutrition|food|meal|eat/i, category: "Nutrition" },
  { match: /learning|zone|curriculum/i, category: "Learning" },
];

export function mapFeatureToStudioCategory(feature: DiscoveredFeature): StudioCategory {
  const hay = `${feature.id} ${feature.title} ${feature.summary} ${feature.pillar} ${feature.keywords.join(" ")}`;
  for (const rule of CATEGORY_MAP) {
    if (rule.match.test(hay)) return rule.category;
  }
  if (/parent|tip|dashboard|setting|analytics/i.test(hay)) return "Parent Tips";
  return "Daily Parenting Tips";
}

/** Build living knowledge base from repository scan. */
export function buildMasterKnowledgeBase(options?: {
  repoRoot?: string;
  maxFeatures?: number;
}): KnowledgeSnapshot {
  const repoRoot = options?.repoRoot ?? findRepoRootQuiet();
  const features = discoverAmyNestFeatures({
    repoRoot,
    maxFeatures: options?.maxFeatures ?? 500,
  });

  const topicSeeds: KnowledgeTopicSeed[] = features.map((feature) => {
    const category = mapFeatureToStudioCategory(feature);
    return {
      id: `seed-${feature.id}`,
      title: feature.title,
      category,
      featureId: feature.id,
      featureTitle: feature.title,
      keywords: feature.keywords.slice(0, 12),
      sourcePath: feature.sourcePath,
    };
  });

  return {
    scannedAt: new Date().toISOString(),
    repoRoot,
    featureCount: features.length,
    features,
    topicSeeds,
  };
}

export function listKnowledgeCategories(snapshot: KnowledgeSnapshot): StudioCategory[] {
  return [...new Set(snapshot.topicSeeds.map((s) => s.category))];
}
