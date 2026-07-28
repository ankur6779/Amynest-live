import { getBrandIdentityKit } from "./identity.js";
import type {
  BrandCharacterId,
  BrandFeaturePillar,
  DiscoveredFeature,
} from "./types.js";

const PILLAR_KEYWORDS: Record<BrandFeaturePillar, string[]> = {
  learning: ["learning", "tutor", "phonics", "reading", "writing", "worksheet", "study"],
  astro: ["astro", "birth-sky", "constellation", "zodiac", "orbit"],
  health: ["health", "nutrition", "feeding", "wellness", "sleep"],
  speech: ["speech", "voice", "pronunciation", "talking"],
  games: ["game", "abacus", "memory", "focus", "motor", "puzzle", "coding"],
  coach: ["coach", "assistant", "amy ai", "tutor", "chat"],
  audio: ["audio", "lesson", "listen", "story hub"],
  routine: ["routine", "habit", "schedule", "timeline", "patent"],
  premium: ["premium", "subscribe", "billing", "paywall"],
  parenting: ["parent", "parenting", "dashboard", "support", "tips"],
  creativity: ["creativity", "coloring", "art", "story"],
  milestones: ["milestone", "progress", "growth", "achievement"],
  general: ["amynest", "home", "dashboard"],
};

export function inferPillarFromText(text: string): BrandFeaturePillar {
  const hay = text.toLowerCase();
  let best: BrandFeaturePillar = "general";
  let score = 0;
  for (const [pillar, keywords] of Object.entries(PILLAR_KEYWORDS) as Array<
    [BrandFeaturePillar, string[]]
  >) {
    const hits = keywords.reduce((n, k) => n + (hay.includes(k) ? 1 : 0), 0);
    if (hits > score) {
      score = hits;
      best = pillar;
    }
  }
  return best;
}

/**
 * Character casting rules — never randomly replace characters.
 * Amy AI for intros/CTA/coach; Amy Girl for learning/speech/health/routine;
 * Amy Boy for math/logic/science/games/adventure.
 */
export function selectBrandCharacters(input: {
  category?: string;
  title?: string;
  keywords?: string[];
  feature?: DiscoveredFeature;
}): {
  primary: BrandCharacterId;
  supporting: BrandCharacterId[];
  pillar: BrandFeaturePillar;
} {
  const pillar =
    input.feature?.pillar ??
    inferPillarFromText(
      [input.category, input.title, ...(input.keywords ?? [])].filter(Boolean).join(" "),
    );

  if (input.feature?.preferredCharacter) {
    const primary = input.feature.preferredCharacter;
    return {
      primary,
      supporting: supportingFor(primary, pillar),
      pillar,
    };
  }

  const kit = getBrandIdentityKit();
  let primary: BrandCharacterId = "amy-ai";
  for (const character of Object.values(kit.characters)) {
    if (character.pillars.includes(pillar) && character.id !== "amy-ai") {
      primary = character.id;
      break;
    }
  }
  if (pillar === "coach" || pillar === "premium" || pillar === "parenting") {
    primary = "amy-ai";
  }
  if (
    pillar === "games" ||
    pillar === "astro" ||
    /\b(math|logic|science|coding|abacus)\b/i.test(input.title ?? "")
  ) {
    primary = "amy-boy";
  }
  if (
    pillar === "learning" ||
    pillar === "speech" ||
    pillar === "health" ||
    pillar === "routine" ||
    pillar === "creativity"
  ) {
    primary = "amy-girl";
  }

  return {
    primary,
    supporting: supportingFor(primary, pillar),
    pillar,
  };
}

function supportingFor(
  primary: BrandCharacterId,
  pillar: BrandFeaturePillar,
): BrandCharacterId[] {
  const support: BrandCharacterId[] = ["amy-ai"];
  if (primary !== "amy-girl" && (pillar === "learning" || pillar === "routine")) {
    support.push("amy-girl");
  }
  if (primary !== "amy-boy" && (pillar === "games" || pillar === "astro")) {
    support.push("amy-boy");
  }
  return [...new Set(support.filter((id) => id !== primary))];
}

export function buildCharacterPromptBlock(ids: BrandCharacterId[]): string {
  const kit = getBrandIdentityKit();
  return ids
    .map((id) => {
      const c = kit.characters[id];
      return `- ${c.displayName}: ${c.promptLock}`;
    })
    .join("\n");
}
