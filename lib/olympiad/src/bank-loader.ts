import type { OlympiadQuestion, OlympiadSubject } from "./types.js";
import { buildGlobalOlympiadBanks } from "./global-bank-builder.js";

import mathBank from "../data/math.json";
import scienceBank from "../data/science.json";
import reasoningBank from "../data/reasoning.json";
import gkBank from "../data/gk.json";

function fromJson(raw: unknown): OlympiadQuestion[] {
  return Array.isArray(raw) ? (raw as OlympiadQuestion[]) : [];
}

/** Committed JSON banks (500+ per subject). Falls back to builder if JSON empty. */
export function loadOlympiadQuestionBank(): OlympiadQuestion[] {
  const combined = [
    ...fromJson(mathBank),
    ...fromJson(scienceBank),
    ...fromJson(reasoningBank),
    ...fromJson(gkBank),
  ];
  if (combined.length >= 2000) return combined;

  const built = buildGlobalOlympiadBanks();
  return [...built.math, ...built.science, ...built.reasoning, ...built.gk];
}

export function olympiadBankCountBySubject(): Record<OlympiadSubject, number> {
  const counts = { math: 0, science: 0, reasoning: 0, gk: 0 } as Record<OlympiadSubject, number>;
  for (const q of loadOlympiadQuestionBank()) {
    counts[q.subject]++;
  }
  return counts;
}
