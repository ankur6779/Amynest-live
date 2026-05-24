import type {
  OlympiadAgeBand,
  OlympiadDifficulty,
  OlympiadQuestion,
  OlympiadSubject,
} from "./types.js";
import {
  countryGkQuestions,
  localizeOlympiadQuestion,
  normalizeOlympiadCountry,
} from "./country-localization.js";

export function applyCountryLocalization(
  questions: OlympiadQuestion[],
  country: string,
): OlympiadQuestion[] {
  return questions.map((q) => localizeOlympiadQuestion(q, country));
}

export function filterExcluded(
  pool: OlympiadQuestion[],
  excludeIds?: Set<string>,
): OlympiadQuestion[] {
  if (!excludeIds?.size) return pool;
  return pool.filter((q) => !excludeIds.has(q.id));
}

/** Swap up to 2 GK slots with country-specific questions. */
export function injectCountryGk(
  questions: OlympiadQuestion[],
  country: string,
  ageBand: OlympiadAgeBand,
  difficulty: OlympiadDifficulty,
): OlympiadQuestion[] {
  const gkCountry = countryGkQuestions(country).filter(
    (q) => q.ageBand === ageBand && q.difficulty === difficulty,
  );
  if (gkCountry.length === 0) return questions;
  const out = [...questions];
  let swapped = 0;
  for (let i = 0; i < out.length && swapped < 2; i++) {
    if (out[i]!.subject === "gk") {
      const repl = gkCountry[swapped % gkCountry.length]!;
      if (!out.some((x) => x.id === repl.id)) {
        out[i] = repl;
        swapped++;
      }
    }
  }
  return out;
}

export function finalizeLocalizedSet(
  questions: OlympiadQuestion[],
  country: string,
  ageBand: OlympiadAgeBand,
  difficulty: OlympiadDifficulty,
  excludeIds?: Set<string>,
): OlympiadQuestion[] {
  const withGk = injectCountryGk(questions, country, ageBand, difficulty);
  const localized = applyCountryLocalization(withGk, country);
  return filterExcluded(localized, excludeIds);
}

export interface AiOlympiadQuestionInput {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

export function aiQuestionsToOlympiad(
  rows: AiOlympiadQuestionInput[],
  subject: OlympiadSubject,
  ageBand: OlympiadAgeBand,
  difficulty: OlympiadDifficulty,
  country: string,
  seed: string,
): OlympiadQuestion[] {
  const out: OlympiadQuestion[] = [];
  rows.forEach((row, i) => {
    if (row.options.length < 2) return;
    const opts = row.options.slice(0, 4);
    while (opts.length < 4) opts.push(`Option ${opts.length + 1}`);
    const idx = opts.findIndex(
      (o) => o.trim().toLowerCase() === row.answer.trim().toLowerCase(),
    );
    if (idx < 0 || idx > 3) return;
    out.push({
      id: `ai-${seed}-${i}-${Date.now()}`,
      subject,
      ageBand,
      difficulty,
      question: row.question,
      options: opts as [string, string, string, string],
      correct: idx as 0 | 1 | 2 | 3,
      explanation: row.explanation ?? `The answer is ${row.answer}.`,
      countryCode: normalizeOlympiadCountry(country),
    });
  });
  return out;
}
