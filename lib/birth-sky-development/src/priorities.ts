/**
 * Priority ranking from domain scores + parent goals.
 */

import {
  DOMAIN_AVOID,
  DOMAIN_PARENT_ACTIONS,
  PARENT_GOAL_PRIORITY,
  STAGE_ACTIVITIES,
  normalizeParentGoal,
} from "./catalog.js";
import type {
  AgeStage,
  AvoidPattern,
  DevelopmentDomain,
  DomainScore,
  PriorityArea,
  RecommendedItem,
} from "./types.js";
import { DEVELOPMENT_DOMAINS } from "./types.js";

const DOMAIN_LABELS: Record<DevelopmentDomain, string> = {
  emotionalRegulation: "Emotional regulation",
  communication: "Communication",
  socialInteraction: "Social interaction",
  learningStyle: "Learning style",
  attention: "Attention",
  creativity: "Creativity",
  motorDevelopment: "Motor development",
  sleepTendencies: "Sleep tendencies",
  routineAdaptability: "Routine adaptability",
  curiosity: "Curiosity",
  confidence: "Confidence",
};

export function rankPriorityAreas(input: {
  domains: Record<DevelopmentDomain, DomainScore>;
  parentGoals?: string[];
}): PriorityArea[] {
  const goalBoost = new Map<DevelopmentDomain, number>();
  const goalReasons = new Map<DevelopmentDomain, string>();

  for (const raw of input.parentGoals ?? []) {
    const g = normalizeParentGoal(raw);
    if (!g) continue;
    const meta = PARENT_GOAL_PRIORITY[g];
    for (const d of meta.domains) {
      goalBoost.set(d, (goalBoost.get(d) ?? 0) + meta.weight * 0.12);
      if (!goalReasons.has(d)) {
        goalReasons.set(d, `parent_goal=${g}`);
      }
    }
  }

  const ranked = DEVELOPMENT_DOMAINS.map((domain) => {
    const ds = input.domains[domain];
    // Lower scores + goal boost → higher need/priority weight
    const need = 1 - ds.score;
    const boost = goalBoost.get(domain) ?? 0;
    const priorityScore = Math.round((need * 0.7 + boost + (1 - ds.confidence) * 0.1) * 100) / 100;
    return {
      id: domain,
      domain,
      label: DOMAIN_LABELS[domain],
      rank: 0,
      score: priorityScore,
      reason: goalReasons.get(domain) ?? `domain_need=${need.toFixed(2)}`,
    } satisfies PriorityArea;
  }).sort((a, b) => b.score - a.score);

  return ranked.slice(0, 6).map((p, i) => ({ ...p, rank: i + 1 }));
}

export function buildRecommendations(input: {
  stage: AgeStage;
  priorities: PriorityArea[];
  meaningActions?: Array<{ label: string; confidence: number }>;
}): {
  activities: RecommendedItem[];
  parentActions: RecommendedItem[];
  avoidPatterns: AvoidPattern[];
} {
  const topDomains = new Set(input.priorities.slice(0, 4).map((p) => p.domain));
  const stageActs = STAGE_ACTIVITIES[input.stage.id] ?? [];

  const activities: RecommendedItem[] = [];
  for (const a of stageActs) {
    const pri = topDomains.has(a.domain) ? 1 : 2;
    activities.push({
      id: a.id,
      label: a.label,
      domain: a.domain,
      priority: pri,
    });
  }
  activities.sort((a, b) => a.priority - b.priority);

  const parentActions: RecommendedItem[] = [];
  const seen = new Set<string>();
  for (const p of input.priorities.slice(0, 5)) {
    const tip = DOMAIN_PARENT_ACTIONS[p.domain];
    if (seen.has(tip.id)) continue;
    seen.add(tip.id);
    parentActions.push({
      id: tip.id,
      label: tip.label,
      domain: p.domain,
      priority: p.rank,
    });
  }
  for (const m of input.meaningActions ?? []) {
    const id = `meaning_${m.label.toLowerCase().replace(/\s+/g, "_").slice(0, 40)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    parentActions.push({
      id,
      label: m.label,
      priority: 5 + parentActions.length,
    });
    if (parentActions.length >= 8) break;
  }

  const avoidPatterns: AvoidPattern[] = [];
  for (const p of input.priorities.slice(0, 4)) {
    const a = DOMAIN_AVOID[p.domain];
    if (a) avoidPatterns.push(a);
  }

  return {
    activities: activities.slice(0, 8),
    parentActions: parentActions.slice(0, 8),
    avoidPatterns: avoidPatterns.slice(0, 6),
  };
}
