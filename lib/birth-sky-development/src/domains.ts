/**
 * Build domain scores from stage baselines + meaning + milestones + routines.
 */

import type { MeaningSnapshot } from "@workspace/birth-sky-meaning";
import {
  MEANING_DOMAIN_BOOSTS,
  ROUTINE_DOMAIN_SUPPORT,
  STAGE_BASELINES,
  conceptKey,
} from "./catalog.js";
import type {
  AgeStage,
  DevelopmentDomain,
  DomainScore,
  RoutineInput,
  RoutineKind,
} from "./types.js";
import { DEVELOPMENT_DOMAINS } from "./types.js";

const DEFAULT_BASE = 0.48;

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function collectMeaningLabels(meaning: MeaningSnapshot): string[] {
  const p = meaning.profile;
  return [
    ...p.strengths,
    ...p.learningStyle,
    ...p.communicationStyle,
    ...p.creativeStrength,
    ...p.attentionPattern,
    ...p.emotionalProfile,
    ...p.socialProfile,
    ...p.comfortNeeds,
    ...p.motivationStyle,
    ...p.curiosityPattern,
  ];
}

export function buildDomainScores(input: {
  stage: AgeStage;
  meaning: MeaningSnapshot;
  milestones?: string[];
  routines?: RoutineInput[];
}): Record<DevelopmentDomain, DomainScore> {
  const baseline = STAGE_BASELINES[input.stage.id] ?? {};
  const scores = {} as Record<DevelopmentDomain, number>;
  const labels = {} as Record<DevelopmentDomain, string[]>;
  const conf = {} as Record<DevelopmentDomain, number>;

  for (const d of DEVELOPMENT_DOMAINS) {
    scores[d] = baseline[d] ?? DEFAULT_BASE;
    labels[d] = [];
    conf[d] = 0.55;
  }

  for (const raw of collectMeaningLabels(input.meaning)) {
    const key = conceptKey(raw);
    const boosts = MEANING_DOMAIN_BOOSTS[key];
    if (!boosts) continue;
    for (const [domain, delta] of Object.entries(boosts) as Array<
      [DevelopmentDomain, number]
    >) {
      scores[domain] = clamp01(scores[domain] + delta);
      if (!labels[domain].includes(raw)) labels[domain].push(raw);
      conf[domain] = clamp01(conf[domain] + 0.04);
    }
  }

  for (const m of input.milestones ?? []) {
    const k = conceptKey(m);
    if (k.includes("walk") || k.includes("motor")) {
      scores.motorDevelopment = clamp01(scores.motorDevelopment + 0.08);
      labels.motorDevelopment.push(m);
    } else if (k.includes("talk") || k.includes("word") || k.includes("speech")) {
      scores.communication = clamp01(scores.communication + 0.08);
      labels.communication.push(m);
    } else if (k.includes("sleep")) {
      scores.sleepTendencies = clamp01(scores.sleepTendencies + 0.06);
      labels.sleepTendencies.push(m);
    } else if (k.includes("friend") || k.includes("social")) {
      scores.socialInteraction = clamp01(scores.socialInteraction + 0.06);
      labels.socialInteraction.push(m);
    }
  }

  for (const r of input.routines ?? []) {
    if (r.present === false) continue;
    const kind = (r.kind || "other") as RoutineKind;
    const support = ROUTINE_DOMAIN_SUPPORT[kind] ?? ROUTINE_DOMAIN_SUPPORT.other;
    for (const d of support.domains) {
      scores[d] = clamp01(scores[d] + 0.05);
      conf[d] = clamp01(conf[d] + 0.02);
    }
  }

  for (const cap of input.stage.capabilities.slice(0, 2)) {
    labels.learningStyle.push(cap);
  }

  const out = {} as Record<DevelopmentDomain, DomainScore>;
  for (const d of DEVELOPMENT_DOMAINS) {
    out[d] = {
      domain: d,
      score: Math.round(scores[d] * 100) / 100,
      labels: labels[d].slice(0, 6),
      confidence: Math.round(conf[d] * 100) / 100,
    };
  }
  return out;
}
