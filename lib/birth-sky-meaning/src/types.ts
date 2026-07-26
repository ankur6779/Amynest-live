/**
 * Meaning Engine types — normalized semantic blocks (never paragraphs).
 */

export const MEANING_ENGINE_VERSION = "meaning-engine/1.0.0" as const;

export type MeaningCategory =
  | "strengths"
  | "learningStyle"
  | "communicationStyle"
  | "socialStyle"
  | "comfortNeeds"
  | "motivationStyle"
  | "creativeStyle"
  | "emotionalPattern"
  | "attentionPattern"
  | "curiosityPattern";

export const MEANING_CATEGORIES: MeaningCategory[] = [
  "strengths",
  "learningStyle",
  "communicationStyle",
  "socialStyle",
  "comfortNeeds",
  "motivationStyle",
  "creativeStyle",
  "emotionalPattern",
  "attentionPattern",
  "curiosityPattern",
];

/** Normalized concept tag (not prose). */
export type MeaningTag = {
  id: string;
  label: string;
  confidence: number;
  sources: string[];
};

export type ParentingGuidance = {
  conceptId: string;
  guidanceId: string;
  label: string;
  confidence: number;
};

export type MeaningConflict = {
  category: MeaningCategory;
  a: string;
  b: string;
  resolution: "coexist" | "prefer_higher_confidence";
  kept: string[];
  note: string;
};

export type RuleHit = {
  ruleId: string;
  category: MeaningCategory;
  conceptId: string;
  label: string;
  confidence: number;
  evidence: string;
};

export type MeaningSnapshot = {
  meaningEngineVersion: typeof MEANING_ENGINE_VERSION | string;
  generatedAt: string;
  astrologyMode?: string | null;
  zodiacMode?: string | null;
  categories: Record<MeaningCategory, MeaningTag[]>;
  parentingGuidance: ParentingGuidance[];
  conflicts: MeaningConflict[];
  /** Compact profile keys for AI facts. */
  profile: {
    learningStyle: string[];
    communicationStyle: string[];
    creativeStrength: string[];
    attentionPattern: string[];
    emotionalProfile: string[];
    socialProfile: string[];
    strengths: string[];
    comfortNeeds: string[];
    motivationStyle: string[];
    curiosityPattern: string[];
  };
};

/** Minimal astronomy shape the Meaning Engine reads (additive / optional fields). */
export type MeaningAstronomyInput = {
  sunSign?: string;
  moonSign?: string;
  risingSign?: string | null;
  moonPhase?: string;
  astrologyMode?: string | null;
  zodiacMode?: string | null;
  sun?: { sign?: string; retrograde?: boolean } | null;
  moon?: { sign?: string; retrograde?: boolean } | null;
  mercury?: { sign?: string; retrograde?: boolean } | null;
  venus?: { sign?: string; retrograde?: boolean } | null;
  mars?: { sign?: string; retrograde?: boolean } | null;
  jupiter?: { sign?: string; retrograde?: boolean } | null;
  saturn?: { sign?: string; retrograde?: boolean } | null;
  planetHouseMap?: Partial<Record<string, number>> | null;
  aspects?: Array<{
    planetA: string;
    planetB: string;
    aspect: string;
    exactness?: number;
  }> | null;
  moonProfile?: {
    nakshatra?: string;
    pada?: number;
    lord?: string;
    sign?: string;
  } | null;
  nakshatra?: { name?: string; lord?: string; pada?: number } | null;
  dasha?: {
    mahadasha?: { lord?: string } | null;
    antardasha?: { lord?: string } | null;
  } | null;
  westernBirthProfile?: {
    dominantElement?: string;
    dominantModality?: string;
  } | null;
  meaningSnapshot?: MeaningSnapshot | null;
};
