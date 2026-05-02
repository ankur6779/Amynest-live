// Per-child Smart Study Zone progress, stored in localStorage so we don't
// need a new DB table for v1. Shape is intentionally flat and forward-compatible.
//
// Now also tracks an `engagement` slice (streak, XP, daily goal, badges)
// powered by `@workspace/study-zone`'s pure helpers so the same rules
// run on web and mobile.

import {
  applyEvent as applyEngagementEvent,
  emptyEngagement,
  viewState as freshenEngagement,
  type ApplyResult,
  type EngagementState,
  type StudyEvent,
} from "@workspace/study-zone";

const KEY = (childId: number | string) => `amynest:study-progress:${childId}`;

export interface StudyProgress {
  // play mode: completed item ids per category
  play: Record<string, string[]>;
  // basic / advanced: best score per topic (0..N) plus completion flag
  basic: Record<string, Record<string, { score: number; total: number; completed: boolean }>>;
  advanced: Record<string, Record<string, { score: number; total: number; completed: boolean }>>;
  // streak / XP / daily goal / badges (forward-compatible: missing on
  // legacy stored payloads → seeded by `loadProgress`)
  engagement: EngagementState;
}

function empty(): StudyProgress {
  return { play: {}, basic: {}, advanced: {}, engagement: emptyEngagement() };
}

export function loadProgress(childId: number | string): StudyProgress {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(KEY(childId));
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    const merged: StudyProgress = {
      ...empty(),
      ...parsed,
      engagement: { ...emptyEngagement(), ...(parsed.engagement ?? {}) },
    };
    // Freshen the streak view (drops to 0 if a day was skipped).
    merged.engagement = freshenEngagement(merged.engagement);
    return merged;
  } catch {
    return empty();
  }
}

export function saveProgress(childId: number | string, p: StudyProgress) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY(childId), JSON.stringify(p));
  } catch { /* ignore quota errors */ }
}

export function markPlayItem(
  childId: number | string,
  categoryId: string,
  itemId: string,
): { progress: StudyProgress; engagement: ApplyResult } {
  const p = loadProgress(childId);
  const list = new Set(p.play[categoryId] ?? []);
  list.add(itemId);
  p.play[categoryId] = Array.from(list);

  const event: StudyEvent = { kind: "play-tap", categoryId, itemId };
  const result = applyEngagementEvent(p.engagement, event);
  p.engagement = result.next;

  saveProgress(childId, p);
  return { progress: p, engagement: result };
}

export function markTopicResult(
  childId: number | string,
  mode: "basic" | "advanced",
  subjectId: string,
  topicId: string,
  score: number,
  total: number,
): { progress: StudyProgress; engagement: ApplyResult } {
  const p = loadProgress(childId);
  const subj = p[mode][subjectId] ?? {};
  const prev = subj[topicId];
  const bestScore = prev ? Math.max(prev.score, score) : score;
  subj[topicId] = { score: bestScore, total, completed: bestScore >= Math.ceil(total * 0.6) };
  p[mode][subjectId] = subj;

  const event: StudyEvent = { kind: "topic-result", mode, subjectId, topicId, score, total };
  const result = applyEngagementEvent(p.engagement, event);
  p.engagement = result.next;

  saveProgress(childId, p);
  return { progress: p, engagement: result };
}

export function categoryPercent(p: StudyProgress, categoryId: string, total: number): number {
  if (total === 0) return 0;
  const done = p.play[categoryId]?.length ?? 0;
  return Math.min(100, Math.round((done / total) * 100));
}

export function subjectPercent(
  p: StudyProgress,
  mode: "basic" | "advanced",
  subjectId: string,
  totalTopics: number,
): number {
  if (totalTopics === 0) return 0;
  const subj = p[mode][subjectId] ?? {};
  const completed = Object.values(subj).filter((t) => t.completed).length;
  return Math.min(100, Math.round((completed / totalTopics) * 100));
}
