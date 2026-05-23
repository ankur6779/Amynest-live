import type { SkillKey } from "../types-v2.js";
import {
  computeInternalComparisons,
  anonymizeForStorage,
} from "./familyComparison.js";
import { buildSiblingPairs, computeLearningDynamics } from "./siblingInfluence.js";
import { buildLearningGraph } from "./learningGraph.js";
import type {
  ChildFamilySnapshot,
  FamilyGraph,
  FamilyGraphRecord,
  FamilyId,
  SharedTraits,
} from "./types-family.js";

const graphByFamily = new Map<FamilyId, FamilyGraph>();
const learningGraphByFamily = new Map<FamilyId, import("./types-family.js").LearningGraph>();
const internalComparisonsByFamily = new Map<
  FamilyId,
  ReturnType<typeof computeInternalComparisons>
>();

function computeSharedTraits(snapshots: ChildFamilySnapshot[]): SharedTraits {
  if (snapshots.length === 0) {
    return {
      avgEngagement: 50,
      dominantLearningPace: "medium",
      sharedStrengths: [],
      sharedWeakAreas: [],
    };
  }

  const avgEngagement =
    snapshots.reduce((a, s) => a + s.profile.behavior.engagementScore, 0) /
    snapshots.length;

  const skillAvg: Record<SkillKey, number> = {
    phonics: 0,
    motor_skills: 0,
    cognitive: 0,
    social: 0,
  };
  for (const s of snapshots) {
    for (const k of Object.keys(skillAvg) as SkillKey[]) {
      skillAvg[k] += s.profile.skills[k].level;
    }
  }
  const n = snapshots.length;
  const ranked = (Object.keys(skillAvg) as SkillKey[])
    .map((k) => ({ k, v: skillAvg[k]! / n }))
    .sort((a, b) => b.v - a.v);

  return {
    avgEngagement,
    dominantLearningPace:
      avgEngagement > 65 ? "fast" : avgEngagement < 45 ? "slow" : "medium",
    sharedStrengths: ranked.slice(0, 2).map((r) => r.k),
    sharedWeakAreas: ranked.slice(-1).map((r) => r.k),
  };
}

/**
 * Build or refresh family graph for a parent account (familyId = userId).
 */
export function buildFamilyGraph(
  familyId: FamilyId,
  snapshots: ChildFamilySnapshot[],
): FamilyGraph {
  const children = snapshots.map((s) => s.childId);
  const comparisons = computeInternalComparisons(snapshots);
  const learningGraph = buildLearningGraph(snapshots);
  const relationships = {
    siblings: buildSiblingPairs(snapshots),
    ageOrder: [...snapshots]
      .sort((a, b) => a.ageMonths - b.ageMonths)
      .map((s) => s.childId),
  };

  const graph: FamilyGraph = {
    familyId,
    children,
    relationships,
    sharedTraits: computeSharedTraits(snapshots),
    learningDynamics: computeLearningDynamics(snapshots, comparisons),
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  graphByFamily.set(familyId, graph);
  learningGraphByFamily.set(familyId, learningGraph);
  internalComparisonsByFamily.set(familyId, comparisons);

  return graph;
}

export function getFamilyGraph(familyId: FamilyId): FamilyGraph | undefined {
  return graphByFamily.get(familyId);
}

export function getLearningGraph(
  familyId: FamilyId,
): import("./types-family.js").LearningGraph | undefined {
  return learningGraphByFamily.get(familyId);
}

/** Internal metrics only — not for child API. */
export function getInternalComparisons(familyId: FamilyId) {
  return internalComparisonsByFamily.get(familyId) ?? [];
}

export function getInternalComparisonsAnonymized(familyId: FamilyId) {
  return anonymizeForStorage(getInternalComparisons(familyId));
}

export function toFamilyGraphRecord(
  familyId: FamilyId,
  insights: import("./types-family.js").FamilyInsights,
): FamilyGraphRecord {
  const learningGraph = learningGraphByFamily.get(familyId)!;
  const graph = graphByFamily.get(familyId);
  return {
    familyId,
    graph: learningGraph,
    insights,
    version: graph?.version ?? 1,
    updatedAt: new Date().toISOString(),
  };
}

export function loadFamilyGraphFromRecord(record: FamilyGraphRecord): void {
  learningGraphByFamily.set(record.familyId, record.graph);
}

const memoryStore: import("./types-family.js").FamilyGraphStore = {
  async get(familyId) {
    const g = graphByFamily.get(familyId);
    const lg = learningGraphByFamily.get(familyId);
    if (!g || !lg) return null;
    return {
      familyId,
      graph: lg,
      insights: {
        strongestSkillAcrossChildren: null,
        weakestAreas: [],
        engagementPatterns: "",
        recommendedFocus: "",
        cooperativeOpportunities: [],
      },
      version: g.version,
      updatedAt: g.updatedAt,
    };
  },
  async upsert(record) {
    loadFamilyGraphFromRecord(record);
    return record;
  },
};

let store: import("./types-family.js").FamilyGraphStore = memoryStore;

export function setFamilyGraphStore(s: import("./types-family.js").FamilyGraphStore): void {
  store = s;
}

export function getFamilyGraphStore(): import("./types-family.js").FamilyGraphStore {
  return store;
}

export function clearFamilyGraphCache(familyId?: FamilyId): void {
  if (familyId) {
    graphByFamily.delete(familyId);
    learningGraphByFamily.delete(familyId);
    internalComparisonsByFamily.delete(familyId);
  } else {
    graphByFamily.clear();
    learningGraphByFamily.clear();
    internalComparisonsByFamily.clear();
  }
}
