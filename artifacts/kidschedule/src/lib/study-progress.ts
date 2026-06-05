// Per-child Smart Study Zone progress, stored in localStorage so we don't
// need a new DB table for v1. Shape is intentionally flat and forward-compatible.
//
// Now also tracks an `engagement` slice (streak, XP, daily goal, badges)
// powered by `@workspace/study-zone`'s pure helpers so the same rules
// run on web and mobile.

import {
  applyEvent as applyEngagementEvent,
  emptyEngagement,
  noopApplyResult,
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
  const prevList = new Set(p.play[categoryId] ?? []);
  // Idempotency: only award engagement the first time this item is tapped.
  // Re-tapping a completed item still re-plays the audio/animation but does
  // NOT inflate XP, streak, or daily goal.
  const wasNew = !prevList.has(itemId);
  prevList.add(itemId);
  p.play[categoryId] = Array.from(prevList);

  let result: ApplyResult;
  if (wasNew) {
    const event: StudyEvent = { kind: "play-tap", categoryId, itemId };
    result = applyEngagementEvent(p.engagement, event);
    p.engagement = result.next;
  } else {
    result = noopApplyResult(p.engagement);
  }

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
  const wasAlreadyCompleted = prev?.completed === true;
  const wasAlreadyPerfect = prev?.score === total && total > 0;
  const bestScore = prev ? Math.max(prev.score, score) : score;
  const willBeCompleted = bestScore >= Math.ceil(total * 0.6);
  subj[topicId] = { score: bestScore, total, completed: willBeCompleted };
  p[mode][subjectId] = subj;

  // Idempotency: award engagement only on improvement —
  //   • first time the topic is completed at all, OR
  //   • first time the kid hits a perfect score on it.
  // Re-submitting a previously-cleared topic is silent.
  const isNewCompletion = !wasAlreadyCompleted && willBeCompleted;
  const isNewPerfect = !wasAlreadyPerfect && score === total && total > 0;

  let result: ApplyResult;
  if (isNewCompletion || isNewPerfect) {
    const event: StudyEvent = { kind: "topic-result", mode, subjectId, topicId, score, total };
    result = applyEngagementEvent(p.engagement, event);
    p.engagement = result.next;
  } else {
    result = noopApplyResult(p.engagement);
  }

  saveProgress(childId, p);
  return { progress: p, engagement: result };
}

const PLAY_ACTIVITY_RE = /^play_([^_]+)_(.+)$/;

/** Merge server-side completedActivities (play_numbers_3, …) into local play progress. */
export function hydratePlayFromCompletedActivities(
  progress: StudyProgress,
  completedActivities: string[],
): StudyProgress {
  if (completedActivities.length === 0) return progress;
  const play = { ...progress.play };
  let changed = false;
  for (const activityId of completedActivities) {
    const m = PLAY_ACTIVITY_RE.exec(activityId);
    if (!m) continue;
    const categoryId = m[1]!;
    const itemId = m[2]!;
    const prev = new Set(play[categoryId] ?? []);
    if (prev.has(itemId)) continue;
    prev.add(itemId);
    play[categoryId] = Array.from(prev);
    changed = true;
  }
  return changed ? { ...progress, play } : progress;
}

/** Union local + server play completions; persists when server adds new items. */
export function mergePlayProgressWithServer(
  childId: number | string,
  local: StudyProgress,
  completedActivities: string[],
): StudyProgress {
  const merged = hydratePlayFromCompletedActivities(local, completedActivities);
  if (merged !== local) saveProgress(childId, merged);
  return merged;
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
