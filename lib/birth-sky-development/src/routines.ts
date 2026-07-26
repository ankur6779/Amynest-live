/**
 * Routine alignment — strengths, gaps, suggested improvements, priority ranking.
 */

import {
  ROUTINE_DOMAIN_SUPPORT,
  STAGE_CRITICAL_ROUTINES,
} from "./catalog.js";
import type {
  AgeStage,
  RoutineAlignment,
  RoutineInput,
  RoutineKind,
} from "./types.js";

function normalizeKind(raw: string): RoutineKind {
  const k = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (k in ROUTINE_DOMAIN_SUPPORT) return k as RoutineKind;
  const aliases: Record<string, RoutineKind> = {
    bedtime: "sleep",
    nap: "sleep",
    homework: "focus",
    study: "focus",
    dinner: "meal",
    breakfast: "meal",
    park: "outdoor",
    book: "reading",
    books: "reading",
    bedtime_routine: "wind_down",
    friends: "social",
  };
  return aliases[k] ?? "other";
}

export function evaluateRoutines(input: {
  stage: AgeStage;
  routines?: RoutineInput[];
}): RoutineAlignment {
  const present = new Set<RoutineKind>();
  const strengths: string[] = [];

  for (const r of input.routines ?? []) {
    if (r.present === false) continue;
    const kind = normalizeKind(String(r.kind ?? "other"));
    present.add(kind);
    const support = ROUTINE_DOMAIN_SUPPORT[kind];
    const label = r.label?.trim() || support.strengthLabel;
    if (!strengths.includes(label)) strengths.push(label);
  }

  const critical = STAGE_CRITICAL_ROUTINES[input.stage.id] ?? [];
  const missingOpportunities: string[] = [];
  const suggestedImprovements: string[] = [];
  const priorityRanking: string[] = [];

  for (const kind of critical) {
    if (present.has(kind)) {
      priorityRanking.push(`keep:${kind}`);
      continue;
    }
    const support = ROUTINE_DOMAIN_SUPPORT[kind];
    missingOpportunities.push(`missing_${kind}`);
    suggestedImprovements.push(`add_${kind}_rhythm`);
    priorityRanking.push(`add:${kind}`);
    void support;
  }

  // Present non-critical still ranked as keep
  for (const kind of present) {
    if (!critical.includes(kind)) {
      priorityRanking.push(`keep:${kind}`);
    }
  }

  if (present.size === 0) {
    missingOpportunities.push("no_routines_provided");
    suggestedImprovements.push("start_with_sleep_and_wind_down");
  }

  return {
    strengths: strengths.slice(0, 8),
    missingOpportunities: missingOpportunities.slice(0, 8),
    suggestedImprovements: suggestedImprovements.slice(0, 8),
    priorityRanking: priorityRanking.slice(0, 10),
  };
}
