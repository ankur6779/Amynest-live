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
  local: Record<string, MasteryRecordJson> | undefined,
  remote: Record<string, MasteryRecordJson> | undefined,
): Record<string, MasteryRecordJson> {
  const l = local ?? {};
  const r = remote ?? {};
  const ids = new Set([...Object.keys(l), ...Object.keys(r)]);
  const out: Record<string, MasteryRecordJson> = {};
  for (const id of ids) {
    const merged = mergeMasteryRecords(l[id], r[id]);
    if (merged) out[id] = merged;
  }
  return out;
}

/** Never lose mastery history — union counts (max) + merged daily history. */
export function mergeMasteryPayload(
  local: PhonicsMasteryPayload,
  remote: PhonicsMasteryPayload,
): PhonicsMasteryPayload {
  const safeLocal = coerceMasteryPayload(local);
  const safeRemote = coerceMasteryPayload(remote);
  return {
    version: 3,
    words: mergeMasteryBucket(safeLocal.words, safeRemote.words),
    letters: mergeMasteryBucket(safeLocal.letters, safeRemote.letters),
    phonemes: mergeMasteryBucket(safeLocal.phonemes, safeRemote.phonemes),
    families: mergeMasteryBucket(safeLocal.families, safeRemote.families),
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
  const safeLocal = coerceFluencyPayload(local);
  const safeRemote = coerceFluencyPayload(remote);
  const daily = mergeDailySnapshots(safeLocal.daily, safeRemote.daily);
  return {
    version: 3,
    streakDays: max(safeLocal.streakDays, safeRemote.streakDays),
    lastActiveDate:
      safeLocal.lastActiveDate >= safeRemote.lastActiveDate
        ? safeLocal.lastActiveDate
        : safeRemote.lastActiveDate,
    wordsAttemptedTotal: max(safeLocal.wordsAttemptedTotal, safeRemote.wordsAttemptedTotal),
    wordsCompletedTotal: max(safeLocal.wordsCompletedTotal, safeRemote.wordsCompletedTotal),
    storiesCompletedTotal: max(safeLocal.storiesCompletedTotal, safeRemote.storiesCompletedTotal),
    daily,
  };
}

export function mergeStoryProgressPayload(
  local: PhonicsStoryProgressPayload,
  remote: PhonicsStoryProgressPayload,
): PhonicsStoryProgressPayload {
  const safeLocal = coerceStoryProgressPayload(local);
  const safeRemote = coerceStoryProgressPayload(remote);
  const completed = { ...safeRemote.completed };
  for (const [id, rec] of Object.entries(safeLocal.completed)) {
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
  const safeLocal = coerceRetentionPayload(local);
  const safeRemote = coerceRetentionPayload(remote);
  const keys = new Set([...Object.keys(safeLocal.tracks), ...Object.keys(safeRemote.tracks)]);
  const tracks: Record<string, RetentionTrackPayload> = {};
  for (const key of keys) {
    const l = safeLocal.tracks[key];
    const r = safeRemote.tracks[key];
    if (l && r) tracks[key] = mergeRetentionTrack(l, r);
    else if (l) tracks[key] = l;
    else if (r) tracks[key] = r;
  }
  return { version: 3, tracks };
}

/** Coerce partial API/local payloads before merge or persistence. */
export function coerceMasteryPayload(
  payload: PhonicsMasteryPayload | null | undefined,
): PhonicsMasteryPayload {
  if (!payload || typeof payload !== "object") return defaultMasteryPayload();
  return {
    version: 3,
    words: payload.words ?? {},
    letters: payload.letters ?? {},
    phonemes: payload.phonemes ?? {},
    families: payload.families ?? {},
  };
}

export function coerceFluencyPayload(
  payload: PhonicsFluencyPayload | null | undefined,
): PhonicsFluencyPayload {
  if (!payload || typeof payload !== "object") return defaultFluencyPayload();
  return {
    version: 3,
    streakDays: payload.streakDays ?? 0,
    lastActiveDate: payload.lastActiveDate ?? "",
    wordsAttemptedTotal: payload.wordsAttemptedTotal ?? 0,
    wordsCompletedTotal: payload.wordsCompletedTotal ?? 0,
    storiesCompletedTotal: payload.storiesCompletedTotal ?? 0,
    daily: Array.isArray(payload.daily) ? payload.daily : [],
  };
}

export function coerceStoryProgressPayload(
  payload: PhonicsStoryProgressPayload | null | undefined,
): PhonicsStoryProgressPayload {
  if (!payload || typeof payload !== "object") return defaultStoryProgressPayload();
  return {
    version: 3,
    completed: payload.completed ?? {},
  };
}

export function coerceRetentionPayload(
  payload: PhonicsRetentionPayload | null | undefined,
): PhonicsRetentionPayload {
  if (!payload || typeof payload !== "object") return defaultRetentionPayload();
  return {
    version: 3,
    tracks: payload.tracks ?? {},
  };
}

export function coercePhonicsV3ProgressBundle(
  bundle: PhonicsV3ProgressBundle | null | undefined,
): PhonicsV3ProgressBundle {
  if (!bundle || typeof bundle !== "object") {
    return {
      mastery: null,
      fluency: null,
      stories: null,
      missions: null,
      retention: null,
    };
  }
  return {
    mastery: bundle.mastery
      ? {
          payload: coerceMasteryPayload(bundle.mastery.payload),
          clientUpdatedAt: bundle.mastery.clientUpdatedAt ?? 0,
        }
      : null,
    fluency: bundle.fluency
      ? {
          payload: coerceFluencyPayload(bundle.fluency.payload),
          clientUpdatedAt: bundle.fluency.clientUpdatedAt ?? 0,
        }
      : null,
    stories: bundle.stories
      ? {
          payload: coerceStoryProgressPayload(bundle.stories.payload),
          clientUpdatedAt: bundle.stories.clientUpdatedAt ?? 0,
        }
      : null,
    missions: bundle.missions ?? null,
    retention: bundle.retention
      ? {
          payload: coerceRetentionPayload(bundle.retention.payload),
          clientUpdatedAt: bundle.retention.clientUpdatedAt ?? 0,
        }
      : null,
  };
}

export function mergePhonicsV3Bundle(
  local: PhonicsV3ProgressBundle,
  remote: PhonicsV3ProgressBundle,
): PhonicsV3ProgressBundle {
  const safeLocal = coercePhonicsV3ProgressBundle(local);
  const safeRemote = coercePhonicsV3ProgressBundle(remote);
  const mastery = mergeDomainEnvelope(safeLocal.mastery, safeRemote.mastery, mergeMasteryPayload);
  const fluency = mergeDomainEnvelope(safeLocal.fluency, safeRemote.fluency, mergeFluencyPayload);
  const stories = mergeDomainEnvelope(safeLocal.stories, safeRemote.stories, mergeStoryProgressPayload);
  const retention = mergeDomainEnvelope(safeLocal.retention, safeRemote.retention, mergeRetentionPayload);

  let missions: PhonicsV3ProgressBundle["missions"] = null;
  if (safeLocal.missions && safeRemote.missions) {
    const merged = mergeMissionPayload(
      safeLocal.missions.payload,
      safeRemote.missions.payload,
      safeLocal.missions.clientUpdatedAt,
      safeRemote.missions.clientUpdatedAt,
    );
    if (merged) {
      missions = {
        payload: merged,
        clientUpdatedAt: max(safeLocal.missions.clientUpdatedAt, safeRemote.missions.clientUpdatedAt),
      };
    }
  } else {
    missions = safeLocal.missions ?? safeRemote.missions;
  }

  return coercePhonicsV3ProgressBundle({ mastery, fluency, stories, missions, retention });
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
