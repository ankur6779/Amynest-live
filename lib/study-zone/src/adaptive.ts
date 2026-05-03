// Smart Study Zone — adaptive daily plan engine.
// Pure helpers used by the API server to build a 3–5 item plan that mixes
// the child's weak topics with age-appropriate fresh material. No I/O here.

import { BASIC_SUBJECTS } from "./content/basic";
import { ADVANCED_SUBJECTS } from "./content/advanced";
import { resolveStudyMode } from "./types";
import type { StudyMode, SubjectPack, StudyTopic } from "./types";

export type Difficulty = "easy" | "medium" | "hard";

/** Window used by `difficultyForAccuracy` — accuracy is computed only from
 *  attempts within the last N days so the engine reacts to *recent* form,
 *  not stale wins from weeks ago. */
export const ACCURACY_WINDOW_DAYS = 7;

export interface PlanItem {
  /** Stable id used by the client for routing into Learn/Practice/Test. */
  id: string;
  subject: string;
  subjectTitle: string;
  subjectEmoji: string;
  topicId: string;
  topicTitle: string;
  difficulty: Difficulty;
  /** "weak" — pulled from weak topics; "fresh" — new exposure. */
  source: "weak" | "fresh";
  mode: "basic" | "advanced";
}

export interface DailyPlan {
  date: string; // YYYY-MM-DD
  mode: "basic" | "advanced";
  items: PlanItem[];
}

export interface SubjectAttemptSummary {
  subject: string;
  /** Last 20 attempts shape — order doesn't matter for accuracy math.
   *  `ts` is optional to keep tests/legacy callers light, but production
   *  callers should supply ISO timestamps so the 7-day window applies. */
  attempts: { topicId: string; correct: boolean; ts?: string }[];
  weakTopics: string[];
}

/**
 * Difficulty bumps with rolling 7-day accuracy. Inputs are the subject's
 * recent attempts; only those within `ACCURACY_WINDOW_DAYS` of `now`
 * count. Thresholds are: >80% → hard, <60% → easy, otherwise medium. An
 * empty (or fully expired) window starts at "easy".
 *
 * Attempts whose `ts` is missing or unparseable are conservatively
 * counted as in-window — keeps legacy data working before timestamps
 * are universally present.
 */
export function difficultyForAccuracy(
  attempts: { correct: boolean; ts?: string }[],
  now: Date = new Date(),
): Difficulty {
  const cutoff = now.getTime() - ACCURACY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const recent = attempts.filter((a) => {
    if (!a.ts) return true;
    const t = Date.parse(a.ts);
    return Number.isNaN(t) ? true : t >= cutoff;
  });
  if (recent.length === 0) return "easy";
  const correct = recent.filter((a) => a.correct).length;
  const pct = (correct / recent.length) * 100;
  if (pct > 80) return "hard";
  if (pct < 60) return "easy";
  return "medium";
}

/**
 * Recompute the rolling weak-topics list from the last 20 attempts. A topic
 * is "weak" when it has at least 2 attempts and the per-topic accuracy is
 * <60%. We keep at most 5 weak topics so plans stay focused.
 */
export function recomputeWeakTopics(
  attempts: { topicId: string; correct: boolean }[],
): string[] {
  const byTopic = new Map<string, { ok: number; total: number }>();
  for (const a of attempts) {
    const cur = byTopic.get(a.topicId) ?? { ok: 0, total: 0 };
    cur.total += 1;
    if (a.correct) cur.ok += 1;
    byTopic.set(a.topicId, cur);
  }
  const weak: { topicId: string; pct: number }[] = [];
  for (const [topicId, s] of byTopic.entries()) {
    if (s.total < 2) continue;
    const pct = (s.ok / s.total) * 100;
    if (pct < 60) weak.push({ topicId, pct });
  }
  weak.sort((a, b) => a.pct - b.pct);
  return weak.slice(0, 5).map((w) => w.topicId);
}

/**
 * Append a new attempt and return the next rolling-20 window. Pure: caller
 * persists the result.
 */
export function appendAttempt(
  prev: { topicId: string; correct: boolean; ts: string }[],
  next: { topicId: string; correct: boolean; ts: string },
  windowSize = 20,
): { topicId: string; correct: boolean; ts: string }[] {
  const merged = [...prev, next];
  if (merged.length <= windowSize) return merged;
  return merged.slice(merged.length - windowSize);
}

function pickFreshTopic(
  pack: SubjectPack,
  difficulty: Difficulty,
  exclude: Set<string>,
  seed: number,
): StudyTopic | null {
  const candidates = pack.topics.filter((t) => !exclude.has(t.id));
  if (candidates.length === 0) return null;
  // Difficulty maps to position in the topic list — first third = easy,
  // middle = medium, last third = hard. Topic packs in @workspace/study-zone
  // are already ordered roughly easy→hard.
  const n = candidates.length;
  let lo = 0, hi = n;
  if (difficulty === "easy") { lo = 0; hi = Math.max(1, Math.ceil(n / 3)); }
  else if (difficulty === "medium") { lo = Math.floor(n / 3); hi = Math.max(lo + 1, Math.ceil((2 * n) / 3)); }
  else { lo = Math.floor((2 * n) / 3); hi = n; }
  const window = candidates.slice(lo, hi);
  if (window.length === 0) return candidates[seed % candidates.length] ?? null;
  return window[seed % window.length] ?? null;
}

export interface BuildPlanInput {
  childAge: number;
  childClass?: string | null;
  /** YYYY-MM-DD, used as deterministic seed so the plan is stable per day. */
  dateIso: string;
  /** Per-subject summaries from `child_learning_progress`. */
  subjects: SubjectAttemptSummary[];
  /** Optional override of total item count (3–5). */
  size?: number;
}

/** Hash a string into a non-negative int for deterministic picking. */
function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * Build today's plan: mix weak topics (carry-over) with age-appropriate
 * fresh material. Difficulty bumps based on the subject's rolling accuracy.
 * Returns 3–5 items deterministically per (childAge + dateIso) so that
 * refreshing the page doesn't reshuffle the plan mid-day.
 */
export function buildDailyPlan(input: BuildPlanInput): DailyPlan {
  const mode: StudyMode = resolveStudyMode(input.childAge, input.childClass);
  // Play mode (under 6) doesn't have study topics — plan is empty and the
  // client falls back to the existing Play tiles.
  if (mode === "play") {
    return { date: input.dateIso, mode: "basic", items: [] };
  }
  const planMode: "basic" | "advanced" = mode;
  const packs: SubjectPack[] = planMode === "basic" ? BASIC_SUBJECTS : ADVANCED_SUBJECTS;
  const target = Math.max(3, Math.min(5, input.size ?? 4));
  const seedBase = hash(`${input.dateIso}:${input.childAge}:${input.childClass ?? ""}`);
  const items: PlanItem[] = [];
  const used = new Set<string>(); // "subject:topicId"

  // Per-subject difficulty + weak topic map.
  const summaryBySubject = new Map<string, SubjectAttemptSummary>();
  for (const s of input.subjects) summaryBySubject.set(s.subject, s);

  // 1) Weak topics first — round-robin across subjects so one weak subject
  //    doesn't crowd out the rest.
  const weakQueue: { pack: SubjectPack; topic: StudyTopic; difficulty: Difficulty }[] = [];
  for (const pack of packs) {
    const sum = summaryBySubject.get(pack.id);
    const diff = difficultyForAccuracy(sum?.attempts ?? []);
    for (const tid of sum?.weakTopics ?? []) {
      const topic = pack.topics.find((t) => t.id === tid);
      if (topic) weakQueue.push({ pack, topic, difficulty: diff });
    }
  }
  // Deterministic shuffle by seed.
  weakQueue.sort((a, b) => hash(`${seedBase}:${a.pack.id}:${a.topic.id}`) - hash(`${seedBase}:${b.pack.id}:${b.topic.id}`));
  for (const w of weakQueue) {
    if (items.length >= target) break;
    const key = `${w.pack.id}:${w.topic.id}`;
    if (used.has(key)) continue;
    used.add(key);
    items.push({
      id: key,
      subject: w.pack.id,
      subjectTitle: w.pack.title,
      subjectEmoji: w.pack.emoji,
      topicId: w.topic.id,
      topicTitle: w.topic.title,
      // Weak topics are intentionally pinned to "easy" so the kid actually
      // recovers — no point quizzing them harder on the same gap.
      difficulty: "easy",
      source: "weak",
      mode: planMode,
    });
  }

  // 2) Fill the rest with fresh, age-appropriate material — round-robin
  //    across subjects to keep variety. Difficulty per subject from accuracy.
  let guard = 0;
  while (items.length < target && guard < target * packs.length * 2) {
    guard++;
    for (const pack of packs) {
      if (items.length >= target) break;
      const sum = summaryBySubject.get(pack.id);
      const diff = difficultyForAccuracy(sum?.attempts ?? []);
      const exclude = new Set<string>();
      for (const it of items) if (it.subject === pack.id) exclude.add(it.topicId);
      const seed = hash(`${seedBase}:fresh:${pack.id}:${items.length}`);
      const topic = pickFreshTopic(pack, diff, exclude, seed);
      if (!topic) continue;
      const key = `${pack.id}:${topic.id}`;
      if (used.has(key)) continue;
      used.add(key);
      items.push({
        id: key,
        subject: pack.id,
        subjectTitle: pack.title,
        subjectEmoji: pack.emoji,
        topicId: topic.id,
        topicTitle: topic.title,
        difficulty: diff,
        source: "fresh",
        mode: planMode,
      });
    }
  }

  return { date: input.dateIso, mode: planMode, items };
}

/** Completion percentage for a plan vs. an attempt history. An item counts
 *  as "done today" if any attempt for its topicId exists for today. */
export function planCompletionPct(
  plan: DailyPlan,
  doneTopicIds: Set<string>,
): number {
  if (plan.items.length === 0) return 0;
  const done = plan.items.filter((it) => doneTopicIds.has(it.topicId)).length;
  return Math.round((done / plan.items.length) * 100);
}
