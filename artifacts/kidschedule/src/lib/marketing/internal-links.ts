import { FEATURE_PAGES, getFeaturePage, type FeaturePageConfig } from "@/lib/marketing/feature-pages";
import {
  getGuideArticle,
  GUIDE_ARTICLES,
  type GuideArticle,
} from "@/lib/marketing/guides-content";

const TOPIC_KEYWORDS: Record<string, string[]> = {
  sleep: ["sleep", "nap", "bedtime", "wake window", "regression"],
  nutrition: ["feeding", "meal", "nutrition", "weaning", "snack", "picky eater", "iron"],
  speech: ["speech", "pronunciation", "talking", "phonics", "language", "bilingual"],
  behaviour: ["tantrum", "discipline", "behaviour", "behavior", "anxiety"],
  learning: ["learning", "study", "reading", "math", "school", "homework", "screen"],
  infant: ["newborn", "baby", "infant", "diaper", "vaccine"],
};

function scoreGuideRelevance(source: GuideArticle, target: GuideArticle): number {
  let score = 0;
  if (source.relatedFeatureSlug && source.relatedFeatureSlug === target.relatedFeatureSlug) {
    score += 5;
  }
  const sourceText = `${source.title} ${source.keywords} ${source.excerpt}`.toLowerCase();
  const targetText = `${target.title} ${target.keywords}`.toLowerCase();
  for (const word of sourceText.split(/\W+/)) {
    if (word.length > 4 && targetText.includes(word)) score += 1;
  }
  return score;
}

export function getRelatedGuides(guide: GuideArticle, limit = 4): GuideArticle[] {
  return GUIDE_ARTICLES.filter((candidate) => candidate.slug !== guide.slug)
    .map((candidate) => ({ candidate, score: scoreGuideRelevance(guide, candidate) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

export function getRelatedFeaturesForGuide(guide: GuideArticle, limit = 2): FeaturePageConfig[] {
  const matches: FeaturePageConfig[] = [];
  if (guide.relatedFeatureSlug) {
    const primary = getFeaturePage(guide.relatedFeatureSlug);
    if (primary) matches.push(primary);
  }

  const guideTopics = Object.entries(TOPIC_KEYWORDS).filter(([, words]) =>
    words.some((word) => guide.keywords.toLowerCase().includes(word)),
  );

  for (const page of FEATURE_PAGES) {
    if (matches.some((m) => m.slug === page.slug)) continue;
    const pageText = `${page.keywords} ${page.metaDescription}`.toLowerCase();
    const topicHit = guideTopics.some(([, words]) => words.some((w) => pageText.includes(w)));
    if (topicHit) matches.push(page);
    if (matches.length >= limit) break;
  }

  return matches.slice(0, limit);
}

export function getRelatedFeaturesForFeature(page: FeaturePageConfig, limit = 2): FeaturePageConfig[] {
  return FEATURE_PAGES.filter((candidate) => candidate.slug !== page.slug)
    .map((candidate) => {
      const sharedGuides = candidate.relatedGuideSlugs.filter((slug) =>
        page.relatedGuideSlugs.includes(slug),
      ).length;
      return { candidate, score: sharedGuides };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

export function getContextualGuideLinks(guide: GuideArticle): { href: string; anchor: string }[] {
  const related = getRelatedGuides(guide, 3);
  return related.map((item) => ({
    href: `/guides/${item.slug}`,
    anchor: item.title.replace(/:.*$/, "").trim(),
  }));
}

export function getFeatureAnchorText(page: FeaturePageConfig): string {
  return `${page.headlineAccent} in AmyNest AI`;
}

export function getGuideAnchorText(guide: GuideArticle): string {
  return guide.title.split(":")[0]?.trim() ?? guide.title;
}

export function getGuidesByTopic(topic: keyof typeof TOPIC_KEYWORDS): GuideArticle[] {
  const words = TOPIC_KEYWORDS[topic];
  return GUIDE_ARTICLES.filter((guide) => {
    const text = `${guide.title} ${guide.keywords} ${guide.excerpt}`.toLowerCase();
    return words.some((word) => text.includes(word));
  });
}
