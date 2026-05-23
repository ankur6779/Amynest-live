import type { ModuleId } from "../types.js";
import type { SkillKey } from "../types-v2.js";
import type { CommunityPatterns, GlobalGraph } from "./types-global.js";

const SKILL_ORDER: SkillKey[] = ["phonics", "motor_skills", "cognitive", "social"];

function transitionScore(graph: GlobalGraph, from: SkillKey, to: SkillKey): number {
  return graph.transitions[from]?.[to] ?? 0;
}

export function detectCommunityPatterns(graph: GlobalGraph): CommunityPatterns {
  const sequences: { path: SkillKey[]; score: number }[] = [];

  for (let i = 0; i < SKILL_ORDER.length - 1; i++) {
    const from = SKILL_ORDER[i]!;
    let path: SkillKey[] = [from];
    let score = graph.successRates[from] ?? 0.5;
    for (let j = i + 1; j < SKILL_ORDER.length; j++) {
      const to = SKILL_ORDER[j]!;
      const t = transitionScore(graph, path[path.length - 1]!, to);
      if (t < 0.35) break;
      path = [...path, to];
      score += t;
    }
    if (path.length >= 2) sequences.push({ path, score: score / path.length });
  }

  sequences.sort((a, b) => b.score - a.score);

  const bestSequences = sequences
    .filter((s) => s.score >= 0.55)
    .slice(0, 5)
    .map((s) => s.path);

  const riskySequences = sequences
    .filter((s) => s.score < 0.4)
    .slice(0, 3)
    .map((s) => s.path);

  const highRetentionFlows = sequences
    .filter((s) => {
      const eng =
        s.path.reduce((a, sk) => a + (graph.engagementStats[sk] ?? 0.5), 0) /
        s.path.length;
      return eng >= 0.55 && s.score >= 0.45;
    })
    .slice(0, 4)
    .map((s) => s.path);

  if (bestSequences.length === 0) {
    bestSequences.push(["phonics", "motor_skills", "cognitive"]);
  }
  if (highRetentionFlows.length === 0) {
    highRetentionFlows.push(["phonics", "cognitive"]);
  }

  return { bestSequences, riskySequences, highRetentionFlows };
}

let cachedPatterns: CommunityPatterns | null = null;

export function getCommunityPatterns(graph: GlobalGraph): CommunityPatterns {
  cachedPatterns = detectCommunityPatterns(graph);
  return cachedPatterns;
}

export function moduleSequenceFromSkills(skills: string[]): ModuleId[] {
  const map: Record<string, ModuleId> = {
    phonics: "phonics",
    motor_skills: "motor_skills",
    cognitive: "cognitive",
    social: "social_emotional",
  };
  return skills.map((s) => map[s] ?? "phonics");
}
