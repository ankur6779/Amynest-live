import type { CountryAgeConfig, CountryCode } from "../types.js";

/**
 * Country-specific age and learning expectation overrides.
 * Remotely editable via Firebase/CMS — merged at runtime with GLOBAL_AGE_DEFAULTS.
 */
export const COUNTRY_AGE_CONFIG: CountryAgeConfig = {
  IN: {
    phonicsStart: 24,
    motorSkillsStart: 6,
    socialStart: 18,
    ageBandOffsetMonths: 0,
  },
  US: {
    phonicsStart: 30,
    motorSkillsStart: 8,
    socialStart: 20,
    ageBandOffsetMonths: 0,
  },
  UK: {
    phonicsStart: 28,
    motorSkillsStart: 7,
    socialStart: 18,
    ageBandOffsetMonths: 0,
  },
  AU: {
    phonicsStart: 28,
    motorSkillsStart: 7,
    socialStart: 18,
    ageBandOffsetMonths: 0,
  },
  NZ: {
    phonicsStart: 28,
    motorSkillsStart: 7,
    socialStart: 18,
    ageBandOffsetMonths: 0,
  },
  CA: {
    phonicsStart: 30,
    motorSkillsStart: 8,
    socialStart: 20,
    ageBandOffsetMonths: 0,
  },
  AE: {
    phonicsStart: 26,
    motorSkillsStart: 6,
    socialStart: 18,
    ageBandOffsetMonths: 0,
  },
  BD: {
    phonicsStart: 22,
    motorSkillsStart: 6,
    socialStart: 16,
    ageBandOffsetMonths: -1,
  },
};

export function mergeCountryAgeConfig(
  remote: Partial<CountryAgeConfig> | null | undefined,
): CountryAgeConfig {
  const base = { ...COUNTRY_AGE_CONFIG };
  if (!remote) return base;
  for (const code of Object.keys(remote) as CountryCode[]) {
    base[code] = { ...base[code], ...remote[code] };
  }
  return base;
}
