import type { SkillKey } from "../types-v2.js";
import {
  bucketsToGlobalGraph,
  createEmptyBuckets,
  ingestAnonymousEvent,
  mergeGraphs,
} from "./anonymousAggregation.js";
import type {
  AnonymousAggregateEvent,
  GlobalGraph,
  GlobalGraphStore,
  GlobalLearningGraphRow,
} from "./types-global.js";

const DEFAULT_SKILLS: SkillKey[] = ["phonics", "motor_skills", "cognitive", "social"];

/** Seed graph for cold start / offline tests. */
export function createDefaultGlobalGraph(): GlobalGraph {
  return {
    skills: [...DEFAULT_SKILLS],
    difficultyLevels: {
      phonics: 0.42,
      motor_skills: 0.48,
      cognitive: 0.52,
      social: 0.5,
    },
    successRates: {
      phonics: 0.72,
      motor_skills: 0.68,
      cognitive: 0.64,
      social: 0.66,
    },
    engagementStats: {
      phonics: 0.7,
      motor_skills: 0.65,
      cognitive: 0.62,
      social: 0.6,
      social_emotional: 0.6,
    },
    transitions: {
      phonics: { motor_skills: 0.74, cognitive: 0.58, social: 0.52 },
      motor_skills: { cognitive: 0.7, social: 0.55, phonics: 0.4 },
      cognitive: { social: 0.62, phonics: 0.45, motor_skills: 0.5 },
      social: { phonics: 0.48, cognitive: 0.5, motor_skills: 0.46 },
    },
    version: 1,
    updatedAt: new Date().toISOString(),
  };
}

let activeGraph: GlobalGraph = createDefaultGlobalGraph();
let graphStore: GlobalGraphStore | null = null;

export function getGlobalGraph(): GlobalGraph {
  return activeGraph;
}

export function setGlobalGraph(graph: GlobalGraph): void {
  activeGraph = graph;
}

export function setGlobalGraphStore(store: GlobalGraphStore | null): void {
  graphStore = store;
}

export function getGlobalGraphStore(): GlobalGraphStore | null {
  return graphStore;
}

export function graphToStorageRows(graph: GlobalGraph): GlobalLearningGraphRow[] {
  return graph.skills.map((skill) => ({
    skill,
    successRate: graph.successRates[skill] ?? 0.5,
    engagementScore: graph.engagementStats[skill] ?? 0.5,
    transitions: graph.transitions[skill] ?? {},
    updatedAt: graph.updatedAt,
  }));
}

export function loadGlobalGraphFromRows(rows: GlobalLearningGraphRow[]): GlobalGraph {
  if (rows.length === 0) return createDefaultGlobalGraph();

  const skills = rows.map((r) => r.skill as SkillKey);
  const successRates: Record<string, number> = {};
  const engagementStats: Record<string, number> = {};
  const difficultyLevels: Record<string, number> = {};
  const transitions: Record<string, Record<string, number>> = {};

  for (const row of rows) {
    successRates[row.skill] = row.successRate;
    engagementStats[row.skill] = row.engagementScore;
    difficultyLevels[row.skill] =
      (1 - row.successRate) * 0.5 + (1 - row.engagementScore) * 0.3 + 0.1;
    transitions[row.skill] = row.transitions;
  }

  const graph: GlobalGraph = {
    skills: skills as SkillKey[],
    successRates,
    engagementStats,
    difficultyLevels,
    transitions,
    version: 1,
    updatedAt: rows[0]?.updatedAt ?? new Date().toISOString(),
  };
  activeGraph = graph;
  return graph;
}

export async function persistGlobalGraph(graph: GlobalGraph): Promise<void> {
  const store = graphStore;
  if (!store) return;
  await store.upsertMany(graphToStorageRows(graph));
}

export function rebuildGlobalGraphFromEvents(
  events: AnonymousAggregateEvent[],
  existing?: GlobalGraph,
): GlobalGraph {
  const buckets = createEmptyBuckets(DEFAULT_SKILLS);
  let prior: SkillKey | undefined;
  for (const e of events) {
    ingestAnonymousEvent(buckets, e, prior);
    if (e.success) prior = e.skill;
  }
  const built = bucketsToGlobalGraph(DEFAULT_SKILLS, buckets, existing);
  if (existing) return mergeGraphs(existing, built);
  return built;
}

export function ingestEventsIntoActiveGraph(events: AnonymousAggregateEvent[]): GlobalGraph {
  const next = rebuildGlobalGraphFromEvents(events, activeGraph);
  activeGraph = next;
  return next;
}

export function clearGlobalGraphCache(): void {
  activeGraph = createDefaultGlobalGraph();
}
