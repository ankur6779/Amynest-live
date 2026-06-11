/**
 * Phonics V3 retention engine — spaced repetition + mastery decay.
 * Stages: 1d → 3d → 7d → 14d → 30d. Failed reviews regress; mastered skills stay scheduled.
 */
import type {
  PhonicsRetentionPayload,
  RetentionTrackPayload,
} from "@workspace/phonics-v3-progress";
import type { MasteryBand, PhonicsMasteryState } from "./mastery-engine";

export type ReviewStage = 1 | 2 | 3 | 4 | 5;

export type SkillTrackType = "word" | "letter" | "phoneme" | "family";

/** Days after introduction / last pass before next review. */
export const REVIEW_INTERVALS_DAYS: Record<ReviewStage, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

/** Mastered skills must be reviewed within this window. */
export const MAX_MASTERED_REVIEW_DAYS = 30;

export type SkillTrack = {
  id: string;
  type: SkillTrackType;
  introducedAt: number;
  lastReviewedAt: number | null;
  reviewStage: ReviewStage;
  nextReviewAt: number;
  /** 0–100 rolling retention strength */
  retentionScore: number;
  consecutiveFails: number;
  consecutivePasses: number;
};

export type PhonicsRetentionState = {
  tracks: Record<string, SkillTrack>;
  version: 3;
};

const STORAGE_PREFIX = "amynest:phonics-v3-retention:";

export function skillTrackKey(type: SkillTrackType, id: string): string {
  return `${type}:${id.trim().toLowerCase()}`;
}

export function defaultRetentionState(): PhonicsRetentionState {
  return { tracks: {}, version: 3 };
}

export function loadRetentionState(childId: number): PhonicsRetentionState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${childId}`);
    if (!raw) return defaultRetentionState();
    return { ...defaultRetentionState(), ...JSON.parse(raw) };
  } catch {
    return defaultRetentionState();
  }
}

export function saveRetentionState(childId: number, state: PhonicsRetentionState): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${childId}`, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function retentionStateToPayload(state: PhonicsRetentionState): PhonicsRetentionPayload {
  const tracks: Record<string, RetentionTrackPayload> = {};
  for (const [key, track] of Object.entries(state.tracks)) {
    tracks[key] = {
      id: track.id,
      type: track.type,
      introducedAt: track.introducedAt,
      lastReviewedAt: track.lastReviewedAt,
      reviewStage: track.reviewStage,
      nextReviewAt: track.nextReviewAt,
      retentionScore: track.retentionScore,
      failStreak: track.consecutiveFails,
      passStreak: track.consecutivePasses,
    };
  }
  return { tracks, version: 3 };
}

export function retentionPayloadToState(payload: PhonicsRetentionPayload): PhonicsRetentionState {
  const tracks: PhonicsRetentionState["tracks"] = {};
  for (const [key, track] of Object.entries(payload.tracks)) {
    tracks[key] = {
      id: track.id,
      type: track.type,
      introducedAt: track.introducedAt,
      lastReviewedAt: track.lastReviewedAt,
      reviewStage: track.reviewStage,
      nextReviewAt: track.nextReviewAt,
      retentionScore: track.retentionScore,
      consecutiveFails: track.failStreak,
      consecutivePasses: track.passStreak,
    };
  }
  return { tracks, version: 3 };
}

export function daysToMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

export function addDays(fromMs: number, days: number): number {
  return fromMs + daysToMs(days);
}

export function scheduleNextReviewAt(fromMs: number, stage: ReviewStage): number {
  return addDays(fromMs, REVIEW_INTERVALS_DAYS[stage]);
}

function createTrack(type: SkillTrackType, id: string, now: number): SkillTrack {
  return {
    id: id.trim().toLowerCase(),
    type,
    introducedAt: now,
    lastReviewedAt: null,
    reviewStage: 1,
    nextReviewAt: scheduleNextReviewAt(now, 1),
    retentionScore: 50,
    consecutiveFails: 0,
    consecutivePasses: 0,
  };
}

/** Register a skill the first time it is practiced. */
export function introduceSkill(
  state: PhonicsRetentionState,
  type: SkillTrackType,
  id: string,
  now = Date.now(),
): PhonicsRetentionState {
  const key = skillTrackKey(type, id);
  if (state.tracks[key]) return state;
  return {
    ...state,
    tracks: { ...state.tracks, [key]: createTrack(type, id, now) },
  };
}

/** Ensure every mastered word has a review track — never unreviewed indefinitely. */
export function syncMasteredTracks(
  retention: PhonicsRetentionState,
  mastery: PhonicsMasteryState,
  now = Date.now(),
): PhonicsRetentionState {
  let next = retention;
  for (const rec of Object.values(mastery.words)) {
    if (!rec.isMastered) continue;
    const key = skillTrackKey("word", rec.id);
    const existing = next.tracks[key];
    if (!existing) {
      const track: SkillTrack = {
        ...createTrack("word", rec.id, rec.firstSeenAt || now),
        reviewStage: 3,
        nextReviewAt: scheduleNextReviewAt(now, 3),
        retentionScore: 80,
      };
      next = { ...next, tracks: { ...next.tracks, [key]: track } };
      continue;
    }
    const overdueLimit = addDays(now, MAX_MASTERED_REVIEW_DAYS);
    if (existing.nextReviewAt > overdueLimit) {
      next = {
        ...next,
        tracks: {
          ...next.tracks,
          [key]: {
            ...existing,
            nextReviewAt: scheduleNextReviewAt(now, 5),
            reviewStage: Math.max(existing.reviewStage, 3) as ReviewStage,
          },
        },
      };
    }
  }
  return next;
}

export function isReviewDue(track: SkillTrack, now = Date.now()): boolean {
  return now >= track.nextReviewAt;
}

export function getOverdueTracks(
  state: PhonicsRetentionState,
  now = Date.now(),
): SkillTrack[] {
  return Object.values(state.tracks)
    .filter((t) => isReviewDue(t, now))
    .sort((a, b) => a.nextReviewAt - b.nextReviewAt);
}

export function advanceReviewStage(stage: ReviewStage): ReviewStage {
  return (Math.min(5, stage + 1) as ReviewStage);
}

export function regressReviewStage(stage: ReviewStage): ReviewStage {
  return (Math.max(1, stage - 1) as ReviewStage);
}

function updateRetentionScore(track: SkillTrack, passed: boolean): number {
  const delta = passed ? 12 : -18;
  return Math.max(0, Math.min(100, track.retentionScore + delta));
}

/** Record a retention check outcome — advances or regresses stage. */
export function recordReviewOutcome(
  state: PhonicsRetentionState,
  type: SkillTrackType,
  id: string,
  passed: boolean,
  now = Date.now(),
): PhonicsRetentionState {
  const key = skillTrackKey(type, id);
  let track = state.tracks[key] ?? createTrack(type, id, now);

  if (passed) {
    const newStage = advanceReviewStage(track.reviewStage);
    track = {
      ...track,
      lastReviewedAt: now,
      reviewStage: newStage,
      nextReviewAt: scheduleNextReviewAt(now, newStage),
      retentionScore: updateRetentionScore(track, true),
      consecutivePasses: track.consecutivePasses + 1,
      consecutiveFails: 0,
    };
  } else {
    const newStage = regressReviewStage(track.reviewStage);
    track = {
      ...track,
      lastReviewedAt: now,
      reviewStage: newStage,
      nextReviewAt: scheduleNextReviewAt(now, newStage),
      retentionScore: updateRetentionScore(track, false),
      consecutiveFails: track.consecutiveFails + 1,
      consecutivePasses: 0,
    };
  }

  return { ...state, tracks: { ...state.tracks, [key]: track } };
}

export type DecayResult = {
  mastery: PhonicsMasteryState;
  decayedSkills: string[];
};

/**
 * Apply mastery decay from repeated failed retention reviews.
 * Mastered → Strong (2 fails) → Practicing (4 fails).
 */
export function applyMasteryDecay(
  mastery: PhonicsMasteryState,
  retention: PhonicsRetentionState,
): DecayResult {
  const decayedSkills: string[] = [];
  const words = { ...mastery.words };

  for (const [key, track] of Object.entries(retention.tracks)) {
    if (track.type !== "word" || track.consecutiveFails < 2) continue;
    const rec = words[track.id];
    if (!rec || rec.band === "learning" || rec.band === "practicing") continue;

    let newBand: MasteryBand = rec.band;
    let newScore = rec.score;
    let isMastered = rec.isMastered;

    if (track.consecutiveFails >= 4) {
      newBand = "practicing";
      newScore = Math.min(newScore, 55);
      isMastered = false;
    } else if (track.consecutiveFails >= 2 && (rec.band === "mastered" || rec.band === "strong")) {
      newBand = rec.band === "mastered" ? "strong" : "practicing";
      newScore = rec.band === "mastered" ? Math.min(newScore, 78) : Math.min(newScore, 58);
      isMastered = false;
    }

    if (newBand !== rec.band || newScore !== rec.score) {
      words[track.id] = {
        ...rec,
        band: newBand,
        score: newScore,
        isMastered,
      };
      decayedSkills.push(track.id);
    }
  }

  return {
    mastery: { ...mastery, words },
    decayedSkills,
  };
}

/** Overall retention % across all tracks. */
export function computeRetentionPct(state: PhonicsRetentionState): number {
  const tracks = Object.values(state.tracks);
  if (tracks.length === 0) return 0;
  const avg = tracks.reduce((s, t) => s + t.retentionScore, 0) / tracks.length;
  return Math.round(avg);
}

export function getSkillsAtRisk(
  state: PhonicsRetentionState,
  now = Date.now(),
): SkillTrack[] {
  return Object.values(state.tracks)
    .filter((t) => isReviewDue(t, now) || t.retentionScore < 45 || t.consecutiveFails >= 2)
    .sort((a, b) => a.retentionScore - b.retentionScore);
}

export function getStrongestRetained(
  state: PhonicsRetentionState,
  limit = 6,
): SkillTrack[] {
  return Object.values(state.tracks)
    .filter((t) => t.retentionScore >= 60 && t.consecutiveFails === 0)
    .sort((a, b) => b.retentionScore - a.retentionScore)
    .slice(0, limit);
}

export function getOverdueWordIds(state: PhonicsRetentionState, now = Date.now()): string[] {
  return getOverdueTracks(state, now)
    .filter((t) => t.type === "word")
    .map((t) => t.id);
}

/** Full retention pipeline after a review attempt. */
export function processRetentionReview(opts: {
  retention: PhonicsRetentionState;
  mastery: PhonicsMasteryState;
  type: SkillTrackType;
  id: string;
  passed: boolean;
  now?: number;
}): { retention: PhonicsRetentionState; mastery: PhonicsMasteryState } {
  const now = opts.now ?? Date.now();
  let retention = introduceSkill(opts.retention, opts.type, opts.id, now);
  retention = recordReviewOutcome(retention, opts.type, opts.id, opts.passed, now);
  const { mastery } = applyMasteryDecay(opts.mastery, retention);
  retention = syncMasteredTracks(retention, mastery, now);
  return { retention, mastery };
}

/** 90-day simulation for certification — returns final retention %. */
export function simulateRetention90Days(opts: {
  initialRetention: PhonicsRetentionState;
  initialMastery: PhonicsMasteryState;
  /** daily review outcomes: skill id → pass rate 0–1 */
  dailyPassRate: (day: number, skillId: string) => boolean;
  skillIds: string[];
  startMs?: number;
}): { retentionPct: number; mastery: PhonicsMasteryState; retention: PhonicsRetentionState } {
  let retention = opts.initialRetention;
  let mastery = opts.initialMastery;
  const start = opts.startMs ?? Date.UTC(2026, 0, 1);

  for (let day = 0; day < 90; day++) {
    const now = start + daysToMs(day);
    retention = syncMasteredTracks(retention, mastery, now);

    for (const skillId of opts.skillIds) {
      retention = introduceSkill(retention, "word", skillId, start);
      const track = retention.tracks[skillTrackKey("word", skillId)];
      if (!track || !isReviewDue(track, now)) continue;

      const passed = opts.dailyPassRate(day, skillId);
      const result = processRetentionReview({
        retention,
        mastery,
        type: "word",
        id: skillId,
        passed,
        now,
      });
      retention = result.retention;
      mastery = result.mastery;
    }
  }

  return {
    retentionPct: computeRetentionPct(retention),
    mastery,
    retention,
  };
}
