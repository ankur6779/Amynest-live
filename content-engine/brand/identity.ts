import { resolveBrandAssetPath } from "./assets-resolver.js";
import type {
  BrandCharacterDefinition,
  BrandColors,
  BrandIdentityKit,
  BrandVideoStructureBeat,
} from "./types.js";

/** Official AmyNest purple system (character bible + marketing). */
export const AMYNEST_BRAND_COLORS: BrandColors = {
  primary: "#6A2CFF",
  secondary: "#F6D57A",
  accent: "#8A2CFF",
  deepPurple: "#461EA8",
  violet: "#6A2CFF",
  lavender: "#C9B6FF",
  softPink: "#FFB6A8",
  background: "#120B2E",
  text: "#F8F4FF",
  hoodiePurple: "#6A2CFF",
  joggerPurple: "#461EA8",
};

export const AMYNEST_CTA_LINES = [
  "Download AmyNest AI Today",
  "Build Better Habits Every Day",
  "Start Your Child's Journey",
] as const;

export const AMYNEST_WEBSITE_URL = "https://www.amynest.in";

const CHARACTER_LOCK =
  "LOCKED IDENTITY — never redesign face, hair, eyes, outfit, colors, proportions, logo, material, or expression style. Only pose/props may change.";

function buildCharacters(): BrandIdentityKit["characters"] {
  const amyAi: BrandCharacterDefinition = {
    id: "amy-ai",
    displayName: "Amy AI",
    role: "Official AI assistant mascot",
    locked: true,
    usage: ["introductions", "explanations", "narration", "tips", "cta"],
    pillars: ["coach", "parenting", "premium", "general", "audio"],
    bibleAsset: resolveBrandAssetPath("amyAiBible"),
    baseAsset: resolveBrandAssetPath("amyAiBase"),
    identityLocks: [
      "Floating rounded white body",
      "Deep purple AmyAI cap + headphones",
      "Large glossy purple eyes",
      "Soft-touch polymer, neon purple glow",
      CHARACTER_LOCK,
    ],
    promptLock:
      "Use ONLY the official Amy AI mascot: white rounded floating body, purple AmyAI baseball cap with headphones, large purple eyes, soft polymer finish, neon purple halo. Never invent a new robot or bird mascot.",
  };

  const amyGirl: BrandCharacterDefinition = {
    id: "amy-girl",
    displayName: "Amy Girl",
    role: "Primary learning child",
    locked: true,
    usage: ["learning", "speech", "reading", "health", "games", "routine"],
    pillars: ["learning", "speech", "health", "routine", "creativity", "milestones"],
    bibleAsset: resolveBrandAssetPath("amyGirlBible"),
    baseAsset: resolveBrandAssetPath("amyGirlBase"),
    identityLocks: [
      "Dark brown side ponytail with bright yellow bow",
      "Plain purple hoodie (no text/logo)",
      "Dark purple leggings + purple high-tops with white soles",
      "Large warm brown eyes",
      CHARACTER_LOCK,
    ],
    promptLock:
      "Use ONLY the official Amy Girl: brown side ponytail with yellow bow, plain purple hoodie (no logos), dark purple leggings, purple sneakers with white soles, large brown eyes, Pixar-quality 3D. Never redesign her.",
  };

  const amyBoy: BrandCharacterDefinition = {
    id: "amy-boy",
    displayName: "Amy Boy",
    role: "Secondary learning companion",
    locked: true,
    usage: ["math", "logic", "adventure", "science", "creativity", "problem-solving"],
    pillars: ["games", "learning", "astro", "creativity"],
    bibleAsset: resolveBrandAssetPath("amyBoyBible"),
    baseAsset: resolveBrandAssetPath("amyBoyBase"),
    identityLocks: [
      "Fluffy dark brown hair",
      "Plain purple hoodie #6A2CFF (no logos)",
      "Dark purple joggers #461EA8",
      "Purple sneakers with white soles/laces",
      CHARACTER_LOCK,
    ],
    promptLock:
      "Use ONLY the official Amy Boy: fluffy dark brown hair, plain purple hoodie, dark purple joggers, purple sneakers with white soles, warm brown eyes, Pixar-quality 3D. Never redesign him.",
  };

  return { "amy-ai": amyAi, "amy-girl": amyGirl, "amy-boy": amyBoy };
}

/** Mandatory 5-beat Short structure for every AmyNest video. */
export const AMYNEST_VIDEO_STRUCTURE: BrandVideoStructureBeat[] = [
  {
    index: 1,
    purpose: "hook",
    scenePurpose: "hook",
    durationHintSeconds: 2,
    captionHint: "Strong parenting hook",
  },
  {
    index: 2,
    purpose: "amy-ai-intro",
    scenePurpose: "opening-question",
    durationHintSeconds: 2,
    requiredCharacter: "amy-ai",
    captionHint: "Amy AI introduces the topic",
  },
  {
    index: 3,
    purpose: "feature-demo",
    scenePurpose: "story",
    durationHintSeconds: 3,
    captionHint: "Real AmyNest feature demonstration",
  },
  {
    index: 4,
    purpose: "emotional-benefit",
    scenePurpose: "key-point",
    durationHintSeconds: 2,
    captionHint: "Emotional parenting benefit",
  },
  {
    index: 5,
    purpose: "official-cta",
    scenePurpose: "cta",
    durationHintSeconds: 2.5,
    requiredCharacter: "amy-ai",
    captionHint: "Official branded CTA + end card",
  },
];

let cachedKit: BrandIdentityKit | undefined;

export function getBrandIdentityKit(): BrandIdentityKit {
  if (cachedKit) return cachedKit;
  cachedKit = {
    brandName: "AmyNest AI",
    channelName: "AmyNest AI",
    websiteUrl: AMYNEST_WEBSITE_URL,
    colors: AMYNEST_BRAND_COLORS,
    typography: {
      display: "Fraunces",
      body: "Source Sans 3",
    },
    characters: buildCharacters(),
    appIconAsset: resolveBrandAssetPath("appIcon"),
    logoAssetId: "brand.amynest.logo-primary",
    endCard: {
      required: true,
      durationSeconds: { min: 2, max: 3, default: 2.5 },
      appIconAsset: resolveBrandAssetPath("appIcon"),
      googlePlayBadgeAsset: resolveBrandAssetPath("googlePlayBadge"),
      appleAppStoreBadgeAsset: resolveBrandAssetPath("appStoreBadge"),
      websiteUrl: AMYNEST_WEBSITE_URL,
      ctaLines: AMYNEST_CTA_LINES,
      downloadLine: "Download AmyNest AI",
      availableOnLine: "Available on Google Play and the Apple App Store",
      qrOptional: true,
    },
    videoStructure: AMYNEST_VIDEO_STRUCTURE,
    transitions: ["Fade", "Crossfade", "purple-light-sweep", "soft-glow"],
    voiceTone: ["friendly", "warm", "encouraging", "professional", "family-safe"],
    musicMood: ["positive", "modern", "light", "hopeful", "family-focused"],
    storytellingPriorities: [
      "Emotion",
      "Curiosity",
      "Hope",
      "Parent confidence",
      "Child happiness",
      "Achievement",
      "Family bonding",
    ],
    neverRules: [
      "Never redesign official characters",
      "Never invent random mascots",
      "Never recreate the app icon with AI",
      "Never omit the branded end card",
      "Never omit Google Play or App Store badges",
      "Never produce generic non-AmyNest AI videos",
      "Never hardcode a static feature list — discover from the codebase",
    ],
  };
  return cachedKit;
}

/** Pick a CTA line deterministically from topic id. */
export function pickBrandCtaLine(seed: string): string {
  const kit = getBrandIdentityKit();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return kit.endCard.ctaLines[hash % kit.endCard.ctaLines.length]!;
}
