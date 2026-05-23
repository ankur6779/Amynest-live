import type { AgeBand, CountryCode } from "../types.js";
import type { PersonalityProfile } from "./types-personality.js";
import type {
  CohortDefinition,
  CohortKey,
  GlobalGraph,
  PersonalityCluster,
} from "./types-global.js";

export function derivePersonalityCluster(
  personality?: PersonalityProfile,
): PersonalityCluster {
  if (!personality) return "balanced";
  const { curiosity, persistence, distractibility } = personality.traits;
  if (curiosity > 0.65 && distractibility < 0.45) return "explorer";
  if (persistence > 0.65 && distractibility < 0.5) return "focused";
  if (persistence > 0.55 && curiosity < 0.5) return "steady";
  return "balanced";
}

export function buildCohortKey(def: CohortDefinition): CohortKey {
  return `${def.ageBand}|${def.countryCode}|${def.personalityCluster}`;
}

export function parseCohortKey(key: CohortKey): Partial<CohortDefinition> {
  const [ageBand, countryCode, personalityCluster] = key.split("|");
  return {
    ageBand: ageBand as AgeBand,
    countryCode: countryCode as CountryCode,
    personalityCluster: personalityCluster as PersonalityCluster,
  };
}

const cohortSuccessCache = new Map<CohortKey, Record<string, number>>();

export function recordCohortSuccess(
  cohortKey: CohortKey,
  contentKey: string,
  success: boolean,
): void {
  const map = cohortSuccessCache.get(cohortKey) ?? {};
  const prev = map[contentKey] ?? 0.5;
  map[contentKey] = prev * 0.9 + (success ? 1 : 0) * 0.1;
  cohortSuccessCache.set(cohortKey, map);
}

export function getCohortContentSuccess(
  cohortKey: CohortKey,
  contentKey: string,
): number | undefined {
  return cohortSuccessCache.get(cohortKey)?.[contentKey];
}

export function cohortMatchScore(
  cohortKey: CohortKey,
  graph: GlobalGraph,
): number {
  const def = parseCohortKey(cohortKey);
  const cluster = def.personalityCluster ?? "balanced";
  const cohortMap = cohortSuccessCache.get(cohortKey);
  if (!cohortMap || Object.keys(cohortMap).length === 0) {
    const avgEng =
      graph.skills.reduce((a, s) => a + (graph.engagementStats[s] ?? 0.5), 0) /
      Math.max(1, graph.skills.length);
    return Math.min(1, avgEng * 0.6 + 0.35);
  }
  const rates = Object.values(cohortMap);
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  const clusterBoost =
    cluster === "explorer" ? 0.05 : cluster === "focused" ? 0.03 : 0;
  return Math.min(1, avg * 0.85 + clusterBoost);
}

export function clearCohortCache(): void {
  cohortSuccessCache.clear();
}
