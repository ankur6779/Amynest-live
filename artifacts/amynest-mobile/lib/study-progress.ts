// Per-child Smart Study Zone progress — AsyncStorage version.
// Mirrors artifacts/kidschedule/src/lib/study-progress.ts (localStorage)
// but uses AsyncStorage so it works in React Native.
// No I/O inside the pure helpers — all persistence is here.

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  applyEvent as applyEngagementEvent,
  emptyEngagement,
  noopApplyResult,
  viewState as freshenEngagement,
  type ApplyResult,
  type EngagementState,
  type StudyEvent,
} from "@workspace/study-zone";

const KEY = (childId: number | string) =>
  `amynest:study-progress:${childId}`;

export interface StudyProgress {
  play: Record<string, string[]>;
  basic: Record<string, Record<string, { score: number; total: number; completed: boolean }>>;
  advanced: Record<string, Record<string, { score: number; total: number; completed: boolean }>>;
  engagement: EngagementState;
}

function empty(): StudyProgress {
  return { play: {}, basic: {}, advanced: {}, engagement: emptyEngagement() };
}

export async function loadProgress(
  childId: number | string,
): Promise<StudyProgress> {
  try {
    const raw = await AsyncStorage.getItem(KEY(childId));
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<StudyProgress>;
    const merged: StudyProgress = {
      ...empty(),
      ...parsed,
      engagement: { ...emptyEngagement(), ...(parsed.engagement ?? {}) },
    };
    merged.engagement = freshenEngagement(merged.engagement);
    return merged;
  } catch {
    return empty();
  }
}

export async function saveProgress(
  childId: number | string,
  p: StudyProgress,
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY(childId), JSON.stringify(p));
  } catch {
    /* ignore quota / serialization errors */
  }
}

export async function markPlayItem(
  childId: number | string,
  categoryId: string,
  itemId: string,
): Promise<{ progress: StudyProgress; engagement: ApplyResult }> {
  const p = await loadProgress(childId);
  const prevList = new Set(p.play[categoryId] ?? []);
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

  await saveProgress(childId, p);
  return { progress: p, engagement: result };
}

export async function markTopicResult(
  childId: number | string,
  mode: "basic" | "advanced",
  subjectId: string,
  topicId: string,
  score: number,
  total: number,
): Promise<{ progress: StudyProgress; engagement: ApplyResult }> {
  const p = await loadProgress(childId);
  const subj = p[mode][subjectId] ?? {};
  const prev = subj[topicId];
  const wasAlreadyCompleted = prev?.completed === true;
  const wasAlreadyPerfect = prev?.score === total && total > 0;
  const bestScore = prev ? Math.max(prev.score, score) : score;
  const willBeCompleted = bestScore >= Math.ceil(total * 0.6);
  subj[topicId] = { score: bestScore, total, completed: willBeCompleted };
  p[mode][subjectId] = subj;

  const isNewCompletion = !wasAlreadyCompleted && willBeCompleted;
  const isNewPerfect = !wasAlreadyPerfect && score === total && total > 0;

  let result: ApplyResult;
  if (isNewCompletion || isNewPerfect) {
    const event: StudyEvent = {
      kind: "topic-result",
      mode,
      subjectId,
      topicId,
      score,
      total,
    };
    result = applyEngagementEvent(p.engagement, event);
    p.engagement = result.next;
  } else {
    result = noopApplyResult(p.engagement);
  }

  await saveProgress(childId, p);
  return { progress: p, engagement: result };
}

export function categoryPercent(
  p: StudyProgress,
  categoryId: string,
  total: number,
): number {
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
