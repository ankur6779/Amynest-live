// ─── Smart Olympiad Zone — question bank + pickers ───────────────────────────

export type {
  OlympiadSubject,
  OlympiadAgeBand,
  OlympiadDifficulty,
  OlympiadTrackId,
  OlympiadRunType,
  OlympiadQuestion,
  OlympiadTrack,
} from "./types.js";

export { OLYMPIAD_TRACKS, TRACK_BY_ID } from "./tracks.js";
export { computeOlympiadScore } from "./score.js";
export {
  OLYMPIAD_RANK_TIERS,
  olympiadRankForPoints,
  nextRankProgress,
  subjectMasteryPct,
  subjectMasteryRingPct,
  subjectMasteryRemaining,
  weakestSubjects,
  SUBJECT_MASTERY_GOAL,
  type OlympiadRankTier,
} from "./gamification.js";
export {
  normalizeOlympiadCountry,
  countryProfile,
  countryLabel,
  countryGkQuestions,
  localizeOlympiadQuestion,
  COUNTRY_PROFILES,
} from "./country-localization.js";
export {
  applyCountryLocalization,
  finalizeLocalizedSet,
  aiQuestionsToOlympiad,
  filterExcluded,
  injectCountryGk,
} from "./pick-localized.js";
export type { AiOlympiadQuestionInput } from "./pick-localized.js";

import type {
  OlympiadSubject,
  OlympiadAgeBand,
  OlympiadDifficulty,
  OlympiadQuestion,
  OlympiadTrackId,
} from "./types.js";
import { loadOlympiadQuestionBank, olympiadBankCountBySubject } from "./bank-loader.js";

export { loadOlympiadQuestionBank, olympiadBankCountBySubject };
export { buildGlobalOlympiadBanks, globalBankCounts } from "./global-bank-builder.js";

export const DAILY_TIME_LIMIT_SEC = 600;
export const MOCK_EXAM_TIME_LIMIT_SEC = 2700;
export const MOCK_EXAM_QUESTION_COUNT = 30;

export const SUBJECT_LABELS: Record<OlympiadSubject, string> = {
  math: "Math",
  science: "Science",
  reasoning: "Reasoning",
  gk: "GK",
};

export const SUBJECT_EMOJI: Record<OlympiadSubject, string> = {
  math: "🔢",
  science: "🔬",
  reasoning: "🧩",
  gk: "🌍",
};

export const DIFFICULTY_LABELS: Record<OlympiadDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export function ageBandFor(ageYears: number): OlympiadAgeBand {
  if (ageYears <= 5) return "tiny";
  if (ageYears <= 9) return "junior";
  return "senior";
}

export function ageBandLabel(band: OlympiadAgeBand): string {
  return band === "tiny" ? "3–5 yrs" : band === "junior" ? "6–9 yrs" : "10–15 yrs";
}

// ─── Global-first question bank (500+ per subject, stored in data/*.json) ───

/** Full olympiad dataset loaded from committed JSON banks. */
export const OLYMPIAD_QUESTIONS: OlympiadQuestion[] = loadOlympiadQuestionBank();

export function questionsFor(
  ageBand: OlympiadAgeBand,
  subject?: OlympiadSubject,
  difficulty?: OlympiadDifficulty,
): OlympiadQuestion[] {
  return OLYMPIAD_QUESTIONS.filter(
    (q) =>
      q.ageBand === ageBand &&
      (!subject || q.subject === subject) &&
      (!difficulty || q.difficulty === difficulty),
  );
}

// Deterministic seeded pick — same date + child gives same daily set.
function dateSeed(date: string, childKey: string | number): number {
  let h = 0;
  const s = `${date}|${childKey}`;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function shuffled<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 9301) + 49297) | 0;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Pick the daily 5: 1–2 from each subject, at the current difficulty band. */
export function pickDailyQuestions(
  ageBand: OlympiadAgeBand,
  difficulty: OlympiadDifficulty,
  date: string,
  childKey: string | number,
): OlympiadQuestion[] {
  const seed = dateSeed(date, childKey);
  const subjects: OlympiadSubject[] = ["math", "science", "reasoning", "gk"];
  const picks: OlympiadQuestion[] = [];
  // 1 from each subject = 4
  subjects.forEach((subj, i) => {
    const pool = questionsFor(ageBand, subj, difficulty);
    const fallback = pool.length > 0 ? pool : questionsFor(ageBand, subj);
    if (fallback.length > 0) {
      picks.push(fallback[Math.abs(seed + i * 7) % fallback.length]!);
    }
  });
  // 5th + fill: rotate, then fall back through every pool until we have 5.
  const tryAdd = (pool: OlympiadQuestion[], offset: number) => {
    const fresh = pool.filter((q) => !picks.find((p) => p.id === q.id));
    if (fresh.length > 0) {
      picks.push(fresh[Math.abs(seed + offset) % fresh.length]!);
      return true;
    }
    return false;
  };
  const rotOrder: OlympiadSubject[] = (() => {
    const start = Math.abs(seed) % 4;
    return [0, 1, 2, 3].map((i) => subjects[(start + i) % 4]!);
  })();
  for (const subj of rotOrder) {
    if (picks.length >= 5) break;
    if (tryAdd(questionsFor(ageBand, subj, difficulty), 13)) continue;
    tryAdd(questionsFor(ageBand, subj), 17);
  }
  // Final safety net — pull from any remaining question in the age band.
  if (picks.length < 5) {
    const anyPool = OLYMPIAD_QUESTIONS.filter((q) => q.ageBand === ageBand);
    let off = 23;
    while (picks.length < 5 && tryAdd(anyPool, off)) off += 7;
  }
  return picks;
}

/** Pick weekly 20: 5 from each subject, mixed difficulty. */
export function pickWeeklyQuestions(
  ageBand: OlympiadAgeBand,
  weekStartDate: string,
  childKey: string | number,
): OlympiadQuestion[] {
  const seed = dateSeed(weekStartDate, childKey);
  const subjects: OlympiadSubject[] = ["math", "science", "reasoning", "gk"];
  const out: OlympiadQuestion[] = [];
  subjects.forEach((subj, si) => {
    const pool = shuffled(questionsFor(ageBand, subj), seed + si * 31);
    out.push(...pool.slice(0, 5));
  });
  return out;
}

/** Practice picker — random pool from chosen subject + difficulty. */
export function pickPracticeQuestions(
  ageBand: OlympiadAgeBand,
  subject: OlympiadSubject,
  difficulty: OlympiadDifficulty,
  count: number = 10,
): OlympiadQuestion[] {
  const pool = questionsFor(ageBand, subject, difficulty);
  const fallback = pool.length >= count ? pool : questionsFor(ageBand, subject);
  return shuffled(fallback, Date.now()).slice(0, Math.min(count, fallback.length));
}

function questionsForTrack(
  ageBand: OlympiadAgeBand,
  trackId: OlympiadTrackId,
  difficulty?: OlympiadDifficulty,
): OlympiadQuestion[] {
  return OLYMPIAD_QUESTIONS.filter(
    (q) =>
      q.ageBand === ageBand &&
      (!difficulty || q.difficulty === difficulty) &&
      (q.tracks?.includes(trackId) ||
        (trackId === "nso" && q.subject === "science") ||
        (trackId === "math_olympiad" && q.subject === "math") ||
        (trackId === "gk_olympiad" && q.subject === "gk")),
  );
}

/** Syllabus track practice — 10 questions from track pool. */
export function pickTrackQuestions(
  ageBand: OlympiadAgeBand,
  trackId: OlympiadTrackId,
  difficulty: OlympiadDifficulty,
  childKey: string | number,
  count: number = 10,
): OlympiadQuestion[] {
  const seed = dateSeed(todayIso(), `${childKey}|${trackId}`);
  const pool = questionsForTrack(ageBand, trackId, difficulty);
  const fallback = pool.length >= count ? pool : questionsForTrack(ageBand, trackId);
  return shuffled(fallback, seed).slice(0, Math.min(count, fallback.length));
}

/** Full mock exam — 30 mixed-subject questions, mixed difficulty. */
export function pickMockExamQuestions(
  ageBand: OlympiadAgeBand,
  weekStartDate: string,
  childKey: string | number,
  count: number = MOCK_EXAM_QUESTION_COUNT,
): OlympiadQuestion[] {
  const seed = dateSeed(weekStartDate, `${childKey}|mock`);
  const pool = OLYMPIAD_QUESTIONS.filter((q) => q.ageBand === ageBand);
  return shuffled(pool, seed).slice(0, Math.min(count, pool.length));
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Daily 5 with extra weight on weak subjects (2 slots each vs 1 for others). */
export function pickDailyQuestionsWeighted(
  ageBand: OlympiadAgeBand,
  difficulty: OlympiadDifficulty,
  date: string,
  childKey: string | number,
  weakSubjects: OlympiadSubject[] = [],
): OlympiadQuestion[] {
  const uniqueWeak = [...new Set(weakSubjects)].filter(Boolean);
  if (uniqueWeak.length === 0) {
    return pickDailyQuestions(ageBand, difficulty, date, childKey);
  }

  const seed = dateSeed(date, childKey);
  const allSubjects: OlympiadSubject[] = ["math", "science", "reasoning", "gk"];
  const weighted: OlympiadSubject[] = [];
  for (const s of allSubjects) {
    const slots = uniqueWeak.includes(s) ? 2 : 1;
    for (let i = 0; i < slots; i++) weighted.push(s);
  }
  const slotSubjects = shuffled(weighted, seed).slice(0, 5);

  const picks: OlympiadQuestion[] = [];
  const usedIds = new Set<string>();

  const tryAdd = (subj: OlympiadSubject, offset: number) => {
    const pool = questionsFor(ageBand, subj, difficulty).filter((q) => !usedIds.has(q.id));
    const fallback =
      pool.length > 0 ? pool : questionsFor(ageBand, subj).filter((q) => !usedIds.has(q.id));
    if (fallback.length === 0) return false;
    const q = fallback[Math.abs(seed + offset) % fallback.length]!;
    picks.push(q);
    usedIds.add(q.id);
    return true;
  };

  slotSubjects.forEach((subj, i) => {
    if (picks.length >= 5) return;
    if (!tryAdd(subj, i * 7)) {
      for (const alt of allSubjects) {
        if (picks.length >= 5) break;
        tryAdd(alt, i * 11 + picks.length);
      }
    }
  });

  if (picks.length < 5) {
    for (const q of pickDailyQuestions(ageBand, difficulty, date, childKey)) {
      if (picks.length >= 5) break;
      if (!usedIds.has(q.id)) {
        picks.push(q);
        usedIds.add(q.id);
      }
    }
  }

  return picks.slice(0, 5);
}
