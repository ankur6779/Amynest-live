/**
 * AmyNest Brand Identity types — production branding layer (not a new engine phase).
 */

export type BrandCharacterId = "amy-ai" | "amy-girl" | "amy-boy";

export type BrandFeaturePillar =
  | "learning"
  | "astro"
  | "health"
  | "speech"
  | "games"
  | "coach"
  | "audio"
  | "routine"
  | "premium"
  | "parenting"
  | "creativity"
  | "milestones"
  | "general";

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  deepPurple: string;
  violet: string;
  lavender: string;
  softPink: string;
  background: string;
  text: string;
  hoodiePurple: string;
  joggerPurple: string;
}

export interface BrandCharacterDefinition {
  id: BrandCharacterId;
  displayName: string;
  role: string;
  locked: true;
  usage: string[];
  pillars: BrandFeaturePillar[];
  /** Absolute or package-relative path to canonical bible/sheet (never regenerate identity). */
  bibleAsset: string;
  /** Cutout for overlays/composites. */
  baseAsset: string;
  identityLocks: string[];
  promptLock: string;
}

export interface BrandEndCardSpec {
  required: true;
  durationSeconds: { min: number; max: number; default: number };
  appIconAsset: string;
  googlePlayBadgeAsset: string;
  appleAppStoreBadgeAsset: string;
  websiteUrl: string;
  ctaLines: readonly string[];
  downloadLine: string;
  availableOnLine: string;
  qrOptional: boolean;
}

export interface BrandVideoStructureBeat {
  index: 1 | 2 | 3 | 4 | 5;
  purpose: "hook" | "amy-ai-intro" | "feature-demo" | "emotional-benefit" | "official-cta";
  scenePurpose: "hook" | "opening-question" | "story" | "key-point" | "cta" | "brand-end";
  durationHintSeconds: number;
  requiredCharacter?: BrandCharacterId;
  captionHint: string;
}

export interface DiscoveredFeature {
  id: string;
  title: string;
  pillar: BrandFeaturePillar;
  sourcePath: string;
  sourceKind: "feature-module" | "page" | "docs" | "seo-route" | "character-bible";
  keywords: string[];
  preferredCharacter: BrandCharacterId;
  summary: string;
}

export interface BrandIdentityKit {
  brandName: string;
  channelName: string;
  websiteUrl: string;
  colors: BrandColors;
  typography: { display: string; body: string };
  characters: Record<BrandCharacterId, BrandCharacterDefinition>;
  appIconAsset: string;
  logoAssetId: string;
  endCard: BrandEndCardSpec;
  videoStructure: BrandVideoStructureBeat[];
  transitions: readonly string[];
  voiceTone: readonly string[];
  musicMood: readonly string[];
  storytellingPriorities: readonly string[];
  neverRules: readonly string[];
}

export interface BrandQualityFinding {
  code: string;
  severity: "error" | "warning";
  message: string;
}

export interface BrandQualityReport {
  ok: boolean;
  findings: BrandQualityFinding[];
  charactersUsed: BrandCharacterId[];
  featureId?: string;
  endCardPresent: boolean;
}
