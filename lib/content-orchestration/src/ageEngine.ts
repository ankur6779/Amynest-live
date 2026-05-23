import { COUNTRY_AGE_CONFIG, mergeCountryAgeConfig } from "./config/country-age-config.js";
import { GLOBAL_AGE_DEFAULTS } from "./config/global-defaults.js";
import type {
  AgeBand,
  AgeEngineInput,
  AgeEngineOutput,
  CountryAgeConfig,
  CountryAgeOverride,
  CountryCode,
  DevelopmentStage,
} from "./types.js";

function monthsBetween(dob: Date, ref: Date): number {
  let months =
    (ref.getFullYear() - dob.getFullYear()) * 12 + (ref.getMonth() - dob.getMonth());
  if (ref.getDate() < dob.getDate()) months -= 1;
  return Math.max(0, months);
}

function resolveCountryOverrides(
  countryCode: CountryCode,
  config: CountryAgeConfig,
): CountryAgeOverride {
  return config[countryCode] ?? {};
}

function applyBandOffset(months: number, offset: number): number {
  return Math.max(0, months + offset);
}

export function resolveAgeBand(
  ageInMonths: number,
  offsetMonths = 0,
): { ageBand: AgeBand; developmentStage: DevelopmentStage } {
  const adjusted = applyBandOffset(ageInMonths, offsetMonths);
  for (const band of GLOBAL_AGE_DEFAULTS.ageBands) {
    if (adjusted >= band.minMonths && adjusted < band.maxMonths) {
      return { ageBand: band.band, developmentStage: band.stage };
    }
  }
  const last = GLOBAL_AGE_DEFAULTS.ageBands[GLOBAL_AGE_DEFAULTS.ageBands.length - 1]!;
  return { ageBand: last.band, developmentStage: last.stage };
}

export function computeAge(input: AgeEngineInput, remoteConfig?: Partial<CountryAgeConfig>): AgeEngineOutput {
  const ref = input.referenceDate ?? new Date();
  const dob = typeof input.childDOB === "string" ? new Date(input.childDOB) : input.childDOB;
  const countryCode = input.countryCode;
  const config = mergeCountryAgeConfig(remoteConfig ?? null);
  const overrides = resolveCountryOverrides(countryCode, config);
  const offset = overrides.ageBandOffsetMonths ?? 0;

  const ageInMonths = monthsBetween(dob, ref);
  const { ageBand, developmentStage } = resolveAgeBand(ageInMonths, offset);

  const effectivePhonicsStart =
    overrides.phonicsStart ?? GLOBAL_AGE_DEFAULTS.phonicsStart;

  return {
    ageInMonths,
    ageBand,
    developmentStage,
    countryCode,
    countryOverrides: overrides,
    effectivePhonicsStart,
  };
}

export function getCountryLearningThreshold(
  countryCode: CountryCode,
  key: "phonicsStart" | "motorSkillsStart" | "socialStart",
  remoteConfig?: Partial<CountryAgeConfig>,
): number {
  const config = mergeCountryAgeConfig(remoteConfig ?? null);
  const overrides = resolveCountryOverrides(countryCode, config);
  const overrideVal = overrides[key];
  if (overrideVal !== undefined) return overrideVal;
  return GLOBAL_AGE_DEFAULTS[key];
}

/** Static config accessor for CMS sync / tests. */
export function getDefaultCountryAgeConfig(): CountryAgeConfig {
  return { ...COUNTRY_AGE_CONFIG };
}
