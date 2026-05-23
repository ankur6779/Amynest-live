import type { CountryCode, ModuleId } from "../types.js";
import type { V2CacheKeyInput } from "../types-v2.js";
import { stableHash } from "../utils/stableHash.js";
import { dailyPlanCacheKey } from "../rotationEngine.js";

/** V1 cache key (unchanged). */
export { dailyPlanCacheKey };

/** V2: invalidates when profile version, modules, or exploration seed change. */
export function dailyPlanV2CacheKey(input: V2CacheKeyInput): string {
  const payload = {
    childId: input.childId,
    date: input.dateIso,
    country: input.countryCode,
    unlocked: [...input.unlockedModules].sort(),
    profileVer: input.skillProfileVersion,
    explorationSeed: input.explorationSeed,
  };
  return `daily_plan_v2:${stableHash(payload)}`;
}

export function explorationSeedFromInputs(
  childId: string,
  dateIso: string,
  profileVersion: number,
): number {
  let h = 0;
  const str = `${childId}:${dateIso}:v${profileVersion}`;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function buildV2CacheKeyInput(params: {
  childId: string;
  dateIso: string;
  countryCode: CountryCode;
  unlockedModules?: ModuleId[];
  skillProfileVersion: number;
  explorationSeed: number;
}): V2CacheKeyInput {
  return {
    childId: params.childId,
    dateIso: params.dateIso,
    countryCode: params.countryCode,
    unlockedModules: params.unlockedModules ?? [],
    skillProfileVersion: params.skillProfileVersion,
    explorationSeed: params.explorationSeed,
  };
}
