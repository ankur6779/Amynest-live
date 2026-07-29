/**
 * YouTube publishing polish — metadata enrichment only (no render/generation).
 */

export interface LocalizedMetadata {
  title: string;
  description: string;
}

export interface DescriptionVariants {
  short: string;
  medium: string;
  long: string;
}

export interface HashtagPack {
  primary: string[];
  trending: string[];
  topic: string[];
  /** Combined unique hashtags, max 15, ready for description footer. */
  all: string[];
}

export interface BestUploadTime {
  weekday: string;
  hour: number;
  minute: number;
  timezone: string;
  label: string;
  source: "continuous-learning" | "default";
}

export interface SeoBreakdown {
  score: number;
  title: number;
  description: number;
  keywords: number;
  tags: number;
  ctrPotential: number;
  explanations: {
    title: string;
    description: string;
    keywords: string;
    tags: string;
    ctrPotential: string;
  };
}

export interface PublishingScorecard {
  metadataScore: number;
  seoScore: number;
  ctrPrediction: number;
  searchability: number;
  parentAppeal: number;
  suggestedImprovements: string[];
}

export interface PublishingPolish {
  pinnedComment: string;
  localizations: {
    en: LocalizedMetadata;
    hi: LocalizedMetadata;
  };
  titleVariants: string[];
  descriptionVariants: DescriptionVariants;
  hashtags: HashtagPack;
  bestUploadTime: BestUploadTime;
  thumbnailTitle: string;
  seo: SeoBreakdown;
  scorecard: PublishingScorecard;
}
