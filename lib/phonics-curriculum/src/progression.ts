import type {
  ChildCurriculumProgress,
  CurriculumLevel,
  TestOutcomeInput,
  TestOutcomeResult,
} from "./types.js";
import { clampCurriculumLevel, MAX_CURRICULUM_LEVEL } from "./levels.js";

const MASTERY_BOOST_PASS = 8;
const MASTERY_PENALTY_FAIL = 12;
const LEVEL_UP_THRESHOLD = 85;
const LEVEL_REPEAT_THRESHOLD = 50;

/**
 * After a daily/weekly test: adjust mastery, level, and weak phonemes.
 */
export function applyTestOutcome(
  progress: ChildCurriculumProgress,
  input: TestOutcomeInput,
): TestOutcomeResult {
  const score = Math.max(0, Math.min(100, Math.round(input.scorePct)));
  let mastery = progress.masteryScore;
  let level = progress.currentLevel;
  let levelChanged = false;
  let repeatLevel = false;

  if (score > 80) {
    mastery = Math.min(100, mastery + MASTERY_BOOST_PASS);
  } else if (score < LEVEL_REPEAT_THRESHOLD) {
    mastery = Math.max(0, mastery - MASTERY_PENALTY_FAIL);
    repeatLevel = true;
  } else {
    mastery = Math.min(100, mastery + Math.round((score - 50) / 10));
  }

  if (mastery >= LEVEL_UP_THRESHOLD && level < MAX_CURRICULUM_LEVEL) {
    level = clampCurriculumLevel(level + 1);
    mastery = 40;
    levelChanged = true;
  }

  const weakPhonemes = mergeWeakPhonemes(
    progress.weakPhonemes,
    input.weakPhonemesFromContent ?? [],
    score,
  );

  let insight: string;
  if (levelChanged) {
    insight = `Level up! Moving to level ${level}. Keep blending every day.`;
  } else if (repeatLevel) {
    insight = `Let's repeat this level — extra practice on tricky sounds tomorrow.`;
  } else if (score >= 80) {
    insight = `Strong work! Mastery is ${mastery}%.`;
  } else {
    insight = `Good effort. Tomorrow we'll practise ${weakPhonemes[0] ?? "sounds"} again.`;
  }

  return {
    masteryScore: mastery,
    currentLevel: level,
    levelChanged,
    weakPhonemes,
    repeatLevel,
    insight,
  };
}

export function mergeWeakPhonemes(
  existing: string[],
  fromTest: string[],
  scorePct: number,
): string[] {
  const set = new Set(existing);
  for (const p of fromTest) {
    if (p.trim()) set.add(p.trim());
  }
  if (scorePct >= 80 && set.size > 1) {
    const arr = [...set];
    arr.pop();
    return arr.slice(0, 5);
  }
  return [...set].slice(0, 5);
}

/** Bump streak when child completes any plan activity today. */
export function recordActivityDay(
  progress: ChildCurriculumProgress,
  dateIso: string,
): { streak: number; lastPlayedAt: string } {
  const last = progress.lastPlayedAt?.slice(0, 10) ?? null;
  const yesterday = addDays(dateIso, -1);
  let streak = progress.streak;
  if (last === dateIso) {
    // same day — keep streak
  } else if (last === yesterday) {
    streak += 1;
  } else {
    streak = 1;
  }
  return { streak, lastPlayedAt: new Date().toISOString() };
}

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Infer weak IPA phonemes from wrong content symbols (best-effort). */
export function weakPhonemesFromSymbols(symbols: string[]): string[] {
  const out = new Set<string>();
  const vowelMap: Record<string, string> = {
    a: "æ",
    e: "ɛ",
    i: "ɪ",
    o: "ɒ",
    u: "ʌ",
  };
  for (const sym of symbols) {
    const s = sym.trim().toLowerCase();
    if (s.length === 1 && vowelMap[s]) out.add(vowelMap[s]);
    if (/igloo|sit|hit|pin|pig/i.test(s)) out.add("ɪ");
    if (/apple|cat|bat|mat/i.test(s)) out.add("æ");
    if (/egg|pen|hen|bed/i.test(s)) out.add("ɛ");
    if (/octopus|dog|log/i.test(s)) out.add("ɒ");
    if (/umbrella|cup|sun|bus/i.test(s)) out.add("ʌ");
  }
  return [...out].slice(0, 5);
}
