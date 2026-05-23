import type { ModuleId } from "../types.js";
import type { SkillKey } from "../types-v2.js";
import type { AnonymousAggregateEvent, GlobalGraph } from "./types-global.js";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Strip PII — only skill/module/content template keys. */
export function sanitizeContentKey(contentId: string): string {
  const parts = contentId.split("_");
  return parts.slice(0, Math.min(3, parts.length)).join("_") || "generic";
}

export type SkillAggregateBucket = {
  successes: number;
  attempts: number;
  dropOffs: number;
  engagementSum: number;
  count: number;
};

export type ModuleAggregateBucket = {
  engagementSum: number;
  count: number;
};

export type TransitionBucket = {
  count: number;
  success: number;
};

export function createEmptyBuckets(skills: SkillKey[]) {
  const skillBuckets: Record<string, SkillAggregateBucket> = {};
  const moduleBuckets: Record<ModuleId, ModuleAggregateBucket> = {} as Record<
    ModuleId,
    ModuleAggregateBucket
  >;
  const transitions: Record<string, Record<string, TransitionBucket>> = {};

  for (const s of skills) {
    skillBuckets[s] = { successes: 0, attempts: 0, dropOffs: 0, engagementSum: 0, count: 0 };
    transitions[s] = {};
  }

  return { skillBuckets, moduleBuckets, transitions };
}

export function ingestAnonymousEvent(
  buckets: ReturnType<typeof createEmptyBuckets>,
  event: AnonymousAggregateEvent,
  priorSkill?: SkillKey,
): void {
  const skill = event.skill;
  const b = buckets.skillBuckets[skill];
  if (!b) return;

  b.count += 1;
  b.attempts += Math.max(1, event.attempts);
  if (event.success) b.successes += 1;
  if (event.droppedOff) b.dropOffs += 1;
  b.engagementSum += clamp01(event.engagementScore / 100);

  const mod = buckets.moduleBuckets[event.moduleId] ?? {
    engagementSum: 0,
    count: 0,
  };
  mod.count += 1;
  mod.engagementSum += clamp01(event.engagementScore / 100);
  buckets.moduleBuckets[event.moduleId] = mod;

  const contentKey = event.contentKey;
  if (!buckets.skillBuckets[contentKey]) {
    buckets.skillBuckets[contentKey] = {
      successes: 0,
      attempts: 0,
      dropOffs: 0,
      engagementSum: 0,
      count: 0,
    };
  }
  const ck = buckets.skillBuckets[contentKey]!;
  ck.count += 1;
  ck.attempts += Math.max(1, event.attempts);
  if (event.success) ck.successes += 1;
  if (event.droppedOff) ck.dropOffs += 1;
  ck.engagementSum += clamp01(event.engagementScore / 100);

  if (priorSkill && priorSkill !== skill) {
    const row = buckets.transitions[priorSkill] ?? {};
    const cell = row[skill] ?? { count: 0, success: 0 };
    cell.count += 1;
    if (event.success) cell.success += 1;
    row[skill] = cell;
    buckets.transitions[priorSkill] = row;
  }
}

export function bucketsToGlobalGraph(
  skillKeys: SkillKey[],
  buckets: ReturnType<typeof createEmptyBuckets>,
  existing?: GlobalGraph,
): GlobalGraph {
  const successRates: Record<string, number> = { ...(existing?.successRates ?? {}) };
  const difficultyLevels: Record<string, number> = { ...(existing?.difficultyLevels ?? {}) };
  const engagementStats: Record<string, number> = { ...(existing?.engagementStats ?? {}) };
  const transitions: Record<string, Record<string, number>> = {};

  for (const [key, b] of Object.entries(buckets.skillBuckets)) {
    if (!b || b.count === 0) continue;
    const rate = b.successes / Math.max(1, b.attempts);
    successRates[key] = rate;
    const dropRate = b.dropOffs / b.count;
    const avgAttempts = b.attempts / b.count;
    difficultyLevels[key] = clamp01(
      (1 - rate) * 0.5 + clamp01(avgAttempts / 5) * 0.3 + dropRate * 0.2,
    );
    engagementStats[key] = b.engagementSum / b.count;
  }

  for (const [mod, b] of Object.entries(buckets.moduleBuckets)) {
    if (!b || b.count === 0) continue;
    engagementStats[mod] = b.engagementSum / b.count;
  }

  for (const from of skillKeys) {
    const row = buckets.transitions[from] ?? {};
    transitions[from] = {};
    for (const to of skillKeys) {
      const cell = row[to];
      if (!cell || cell.count === 0) continue;
      transitions[from]![to] = cell.success / cell.count;
    }
  }

  return {
    skills: skillKeys,
    difficultyLevels,
    successRates,
    engagementStats,
    transitions,
    version: (existing?.version ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  };
}

export function mergeGraphs(base: GlobalGraph, incoming: GlobalGraph): GlobalGraph {
  const successRates = { ...base.successRates };
  const difficultyLevels = { ...base.difficultyLevels };
  const engagementStats = { ...base.engagementStats };

  for (const [k, v] of Object.entries(incoming.successRates)) {
    const prev = successRates[k];
    successRates[k] = prev === undefined ? v : prev * 0.7 + v * 0.3;
  }
  for (const [k, v] of Object.entries(incoming.difficultyLevels)) {
    const prev = difficultyLevels[k];
    difficultyLevels[k] = prev === undefined ? v : prev * 0.7 + v * 0.3;
  }
  for (const [k, v] of Object.entries(incoming.engagementStats)) {
    const prev = engagementStats[k];
    engagementStats[k] = prev === undefined ? v : prev * 0.7 + v * 0.3;
  }

  const transitions: Record<string, Record<string, number>> = { ...base.transitions };
  for (const [from, row] of Object.entries(incoming.transitions)) {
    transitions[from] = { ...(transitions[from] ?? {}), ...row };
  }

  return {
    skills: [...new Set([...base.skills, ...incoming.skills])],
    difficultyLevels,
    successRates,
    engagementStats,
    transitions,
    version: base.version + 1,
    updatedAt: new Date().toISOString(),
  };
}
