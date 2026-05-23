import type { AgeBand, ContentPool, CountryCode, DifficultyLevel, ModuleId } from "../types.js";

const COUNTRIES: CountryCode[] = ["IN", "US", "UK", "AU", "NZ", "CA", "AE", "BD"];
const BANDS: AgeBand[] = ["0_24", "24_36", "36_48", "48_72"];
const MODULES: ModuleId[] = [
  "phonics",
  "motor_skills",
  "social_emotional",
  "language",
  "cognitive",
  "creativity",
  "stories",
  "puzzles",
];

function difficultyForBand(band: AgeBand): DifficultyLevel {
  if (band === "0_24" || band === "24_36") return "easy";
  if (band === "36_48") return "medium";
  return "hard";
}

function generateItems(
  moduleId: ModuleId,
  band: AgeBand,
  country: CountryCode | "GLOBAL",
  count: number,
): ContentPool["contentVariants"] {
  const diff = difficultyForBand(band);
  const prefix = `${moduleId}_${band}_${country}`;
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      contentId: `${prefix}_${String(n).padStart(3, "0")}`,
      title: `${moduleId.replace(/_/g, " ")} ${band} #${n}`,
      templateId: `tpl_${moduleId}_${n % 5}`,
      difficultyLevel: diff,
      engagementWeight: 50 + (n % 30),
      variants: [
        { variantId: `${prefix}_${n}_v1`, speed: "normal", voiceId: "amy_default" },
        { variantId: `${prefix}_${n}_v2`, speed: "slow", voiceId: "amy_alt" },
      ],
    };
  });
}

/** Minimum 30 items per module per age band (mock; production loads from CMS). */
const ITEMS_PER_POOL = 30;

function buildPoolsForScope(
  moduleId: ModuleId,
  band: AgeBand,
  country: CountryCode | "GLOBAL",
): ContentPool {
  return {
    moduleId,
    ageBand: band,
    country,
    difficultyLevel: difficultyForBand(band),
    contentVariants: generateItems(moduleId, band, country, ITEMS_PER_POOL),
  };
}

/** Full mock catalog: GLOBAL pools + country-specific overlays for phonics/language. */
export function buildMockContentPools(): ContentPool[] {
  const pools: ContentPool[] = [];

  for (const moduleId of MODULES) {
    for (const band of BANDS) {
      pools.push(buildPoolsForScope(moduleId, band, "GLOBAL"));

      if (moduleId === "phonics" || moduleId === "language") {
        for (const country of COUNTRIES) {
          pools.push(buildPoolsForScope(moduleId, band, country));
        }
      }
    }
  }

  return pools;
}

export const MOCK_CONTENT_POOLS: ContentPool[] = buildMockContentPools();

export function getPoolsForModule(
  moduleId: ModuleId,
  ageBand: AgeBand,
  countryCode: CountryCode,
  allPools: ContentPool[] = MOCK_CONTENT_POOLS,
): ContentPool[] {
  const countrySpecific = allPools.filter(
    (p) =>
      p.moduleId === moduleId &&
      p.ageBand === ageBand &&
      p.country === countryCode,
  );
  if (countrySpecific.length > 0) return countrySpecific;

  return allPools.filter(
    (p) => p.moduleId === moduleId && p.ageBand === ageBand && p.country === "GLOBAL",
  );
}

export function indexPoolsByModule(
  ageBand: AgeBand,
  countryCode: CountryCode,
  allPools: ContentPool[] = MOCK_CONTENT_POOLS,
): Partial<Record<ModuleId, ContentPool[]>> {
  const result: Partial<Record<ModuleId, ContentPool[]>> = {};
  for (const moduleId of MODULES) {
    result[moduleId] = getPoolsForModule(moduleId, ageBand, countryCode, allPools);
  }
  return result;
}
