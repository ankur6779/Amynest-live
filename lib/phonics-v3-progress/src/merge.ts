import type {
  FluencyDailySnapshot,
  MasteryRecordJson,
  PhonicsFluencyPayload,
  PhonicsMasteryPayload,
  PhonicsMissionPayload,
  PhonicsRetentionPayload,
  PhonicsStoryProgressPayload,
  RetentionTrackPayload,
  PhonicsV3DomainEnvelope,
  PhonicsV3ProgressBundle,
} from "./types.js";

function max(a: number, b: number): number {
  return a >= b ? a : b;
}

function mergeMasteryRecords(
  local: MasteryRecordJson | undefined,
  remote: MasteryRecordJson | undefined,
): MasteryRecordJson | undefined {
  if (!local) return remote;
  if (!remote) return local;

  const counts = {
    heard: max(local.counts.heard, remote.counts.heard),
    blended: max(local.counts.blended, remote.counts.blended),
    identified: max(local.counts.identified, remote.counts.identified),
    spoken: max(local.counts.spoken, remote.counts.spoken),
  };

  const historyMap = new Map<string, number>();
  for (const h of [...local.history, ...remote.history]) {
    historyMap.set(h.dateKey, max(historyMap.get(h.dateKey) ?? 0, h.score));
  }
  const history = [...historyMap.entries()]
    .map(([dateKey, score]) => ({ dateKey, score }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(-90);

  const score = max(local.score, remote.score);
  const isMastered = local.isMastered || remote.isMastered;

  return {
    id: local.id,
    type: local.type,
    counts,
    score,
    band: score >= 90 ? "mastered" : score >= 70 ? "strong" : score >= 40 ? "practicing" : "learning",
    isMastered,
    firstSeenAt: Math.min(local.firstSeenAt, remote.firstSeenAt),
    lastActivityAt: max(local.lastActivityAt, remote.lastActivityAt),
    history,
  };
}

function mergeMasteryBucket(
  local: Record<string, MasteryRecordJson>,
  remote: Record<string, MasteryRecordJson>,
): Record<string, MasteryRecordJson> {
  const ids = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const out: Record<string, MasteryRecordJson> = {};
  for (const id of ids) {
    const merged = mergeMasteryRecords(local[id], remote[id]);
    if (merged) out[id] = merged;
  }
  return out;
}

/** Never lose mastery history — union counts (max) + merged daily history. */
export function mergeMasteryPayload(
  local: PhonicsMasteryPayload,
  remote: PhonicsMasteryPayload,
): PhonicsMasteryPayload {
  return {
    version: 3,
    words: mergeMasteryBucket(local.words, remote.words),
    letters: mergeMasteryBucket(local.letters, remote.letters),
    phonemes: mergeMasteryBucket(local.phonemes, remote.phonemes),
    families: mergeMasteryBucket(local.families, remote.families),
  };
}

function mergeDailySnapshots(
  local: FluencyDailySnapshot[],
  remote: FluencyDailySnapshot[],
): FluencyDailySnapshot[] {
  const map = new Map<string, FluencyDailySnapshot>();
  for (const d of [...local, ...remote]) {
    const prev = map.get(d.dateKey);
    if (!prev) {
      map.set(d.dateKey, { ...d });
      continue;
    }
    map.set(d.dateKey, {
      dateKey: d.dateKey,
      wordsAttempted: max(prev.wordsAttempted, d.wordsAttempted),
      wordsCompleted: max(prev.wordsCompleted, d.wordsCompleted),
      storiesCompleted: max(prev.storiesCompleted, d.storiesCompleted),
      fluencyScore: max(prev.fluencyScore, d.fluencyScore),
    });
  }
  return [...map.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey)).slice(-120);
}

export function mergeFluencyPayload(
  local: PhonicsFluencyPayload,
  remote: PhonicsFluencyPayload,
): PhonicsFluencyPayload {
  const daily = mergeDailySnapshots(local.daily, remote.daily);
  return {
    version: 3,
    streakDays: max(local.streakDays, remote.streakDays),
    lastActiveDate:
      local.lastActiveDate >= remote.lastActiveDate
        ? local.lastActiveDate
        : remote.lastActiveDate,
    wordsAttemptedTotal: max(local.wordsAttemptedTotal, remote.wordsAttemptedTotal),
    wordsCompletedTotal: max(local.wordsCompletedTotal, remote.wordsCompletedTotal),
    storiesCompletedTotal: max(local.storiesCompletedTotal, remote.storiesCompletedTotal),
    daily,
  };
}

export function mergeStoryProgressPayload(
  local: PhonicsStoryProgressPayload,
  remote: PhonicsStoryProgressPayload,
): PhonicsStoryProgressPayload {
  const completed = { ...remote.completed };
  for (const [id, rec] of Object.entries(local.completed)) {
    const prev = completed[id];
    if (!prev) {
      completed[id] = rec;
      continue;
    }
    completed[id] = {
      completedAt: max(prev.completedAt, rec.completedAt),
      readCount: max(prev.readCount, rec.readCount),
    };
  }
  return { version: 3, completed };
}

export function mergeMissionPayload(
  local: PhonicsMissionPayload | null,
  remote: PhonicsMissionPayload | null,
  localTs: number,
  remoteTs: number,
): PhonicsMissionPayload | null {
  if (!local) return remote;
  if (!remote) return local;
  if (local.dateKey !== remote.dateKey) {
    return localTs >= remoteTs ? local : remote;
  }
  const localDone = local.tasks.filter((t) => t.completed).length;
  const remoteDone = remote.tasks.filter((t) => t.completed).length;
  if (localDone !== remoteDone) {
    return localDone >= remoteDone ? local : remote;
  }
  return localTs >= remoteTs ? local : remote;
}

export function mergeDomainEnvelope<T>(
  local: PhonicsV3DomainEnvelope<T> | null,
  remote: PhonicsV3DomainEnvelope<T> | null,
  mergeFn: (a: T, b: T) => T,
): PhonicsV3DomainEnvelope<T> | null {
  if (!local) return remote;
  if (!remote) return local;

  const localTs = local.clientUpdatedAt;
  const remoteTs = remote.clientUpdatedAt;
  const mergedPayload = mergeFn(local.payload, remote.payload);
  return {
    payload: mergedPayload,
    clientUpdatedAt: max(localTs, remoteTs),
  };
}

function maxNullable(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return max(a, b);
}

function mergeRetentionTrack(
  local: RetentionTrackPayload,
  remote: RetentionTrackPayload,
): RetentionTrackPayload {
  const reviewStage = Math.max(local.reviewStage, remote.reviewStage) as RetentionTrackPayload["reviewStage"];
  const lastReviewedAt = maxNullable(local.lastReviewedAt, remote.lastReviewedAt);
  const retentionScore = max(local.retentionScore, remote.retentionScore);
  const passStreak = max(local.passStreak, remote.passStreak);
  const failStreak = max(local.failStreak, remote.failStreak);

  let nextReviewAt: number;
  if (local.reviewStage > remote.reviewStage) {
    nextReviewAt = local.nextReviewAt;
  } else if (remote.reviewStage > local.reviewStage) {
    nextReviewAt = remote.nextReviewAt;
  } else {
    nextReviewAt = max(local.nextReviewAt, remote.nextReviewAt);
  }

  return {
    id: local.id,
    type: local.type,
    introducedAt: Math.min(local.introducedAt, remote.introducedAt),
    lastReviewedAt,
    reviewStage,
    nextReviewAt,
    retentionScore,
    failStreak,
    passStreak,
  };
}

/** Merge retention schedules — prefer advanced review stages and later review dates. */
export function mergeRetentionPayload(
  local: PhonicsRetentionPayload,
  remote: PhonicsRetentionPayload,
): PhonicsRetentionPayload {
  const keys = new Set([...Object.keys(local.tracks), ...Object.keys(remote.tracks)]);
  const tracks: Record<string, RetentionTrackPayload> = {};
  for (const key of keys) {
    const l = local.tracks[key];
    const r = remote.tracks[key];
    if (l && r) tracks[key] = mergeRetentionTrack(l, r);
    else if (l) tracks[key] = l;
    else if (r) tracks[key] = r;
  }
  return { version: 3, tracks };
}

export function mergePhonicsV3Bundle(
  local: PhonicsV3ProgressBundle,
  remote: PhonicsV3ProgressBundle,
): PhonicsV3ProgressBundle {
  const mastery = mergeDomainEnvelope(local.mastery, remote.mastery, mergeMasteryPayload);
  const fluency = mergeDomainEnvelope(local.fluency, remote.fluency, mergeFluencyPayload);
  const stories = mergeDomainEnvelope(local.stories, remote.stories, mergeStoryProgressPayload);
  const retention = mergeDomainEnvelope(local.retention, remote.retention, mergeRetentionPayload);

  let missions: PhonicsV3ProgressBundle["missions"] = null;
  if (local.missions && remote.missions) {
    const merged = mergeMissionPayload(
      local.missions.payload,
      remote.missions.payload,
      local.missions.clientUpdatedAt,
      remote.missions.clientUpdatedAt,
    );
    if (merged) {
      missions = {
        payload: merged,
        clientUpdatedAt: max(local.missions.clientUpdatedAt, remote.missions.clientUpdatedAt),
      };
    }
  } else {
    missions = local.missions ?? remote.missions;
  }

  return { mastery, fluency, stories, missions, retention };
}

export function defaultMasteryPayload(): PhonicsMasteryPayload {
  return { words: {}, letters: {}, phonemes: {}, families: {}, version: 3 };
}

export function defaultFluencyPayload(): PhonicsFluencyPayload {
  return {
    streakDays: 0,
    lastActiveDate: "",
    wordsAttemptedTotal: 0,
    wordsCompletedTotal: 0,
    storiesCompletedTotal: 0,
    daily: [],
    version: 3,
  };
}

export function defaultStoryProgressPayload(): PhonicsStoryProgressPayload {
  return { completed: {}, version: 3 };
}

export function defaultRetentionPayload(): PhonicsRetentionPayload {
  return { tracks: {}, version: 3 };
}
