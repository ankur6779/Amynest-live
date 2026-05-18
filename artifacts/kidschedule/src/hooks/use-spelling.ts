import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { resolveApiMediaUrl } from "@/lib/api";
import { resolveAiApiData } from "@/lib/poll-result";
import { synthesizeTts } from "@/lib/tts-playback";

// ─── Shared types (mirror server shape — no codegen yet for /spelling/*) ─────

export type SpellingAgeGroup = "2-4" | "4-6" | "6-8" | "8-10+";
export type SpellingDifficulty = "easy" | "medium" | "hard";
export type SpellingSource = "curated" | "ai";

/**
 * Trust source for POST /spelling/progress. Narrowed to "parent" only
 * — the parent literally taps ✓/✗ in Parent Mode, so the assertion is
 * out-of-band of the tampered-client surface.
 *
 * Learn + Practice used to write here too, but those are client-graded
 * games where a scripted client could trivially post `correct: true`
 * and inflate stars / level / badges. They're now UI-only flows and
 * don't accumulate progress; star accumulation happens via Parent
 * Mode and the server-graded session flow (Dictation / Competition /
 * Tournament / Battle, via `useSpellingSession` / `useSpellingTournament`
 * below).
 */
export type LegacyProgressSource = "parent";

export interface SpellingWord {
  id: string;
  word: string;
  ageGroup: SpellingAgeGroup;
  difficulty: SpellingDifficulty;
  syllables: string[];
  chunks: string[];
  hint: string;
}

export interface SpellingProgress {
  childId: number;
  ageGroup: SpellingAgeGroup;
  totalCorrect: number;
  totalAttempts: number;
  totalStars: number;
  currentLevel: number;
  currentStreak: number;
  bestStreak: number;
  badges: string[];
  starsEarnedThisAttempt?: number;
}

export interface LeaderboardRow {
  id: number;
  childId: number;
  childName: string | null;
  score: number;
  accuracyPct: number;
  durationSec: number;
  wordsCorrect: number;
  wordsAttempted: number;
  createdAt: string;
}

// Map ageMonths -> spelling age group. MUST stay in sync with the server's
// `spellingAgeGroupFor` (artifacts/api-server/src/data/spelling-words.ts) so
// the default age band shown in the UI matches the band used for progress
// partitioning on the server.
export function spellingAgeGroupFor(ageMonths: number): SpellingAgeGroup {
  if (ageMonths < 48) return "2-4";
  if (ageMonths < 72) return "4-6";
  if (ageMonths < 96) return "6-8";
  return "8-10+";
}

// ─── useSpellingTTS — speaks one word via /api/tts/synthesize ───────────────
//
// Built on the same /api/tts pipeline as poems / phonics, but kept local
// rather than reusing useAmyVoice because the spelling player wants finer
// control: explicit slow mode (playbackRate 0.65), and the ability to
// pre-cache the next word's MP3 while the current one is playing.
//
// Slow mode uses playbackRate on <audio>, NOT a server-side flag — the
// underlying ElevenLabs MP3 is the same, just played back slower.

interface SynthesizeResponse {
  ok: true;
  cacheKey: string;
  audioUrl: string;
  cached: boolean;
  charCount: number;
  contentType: string;
}

export interface UseSpellingTTSState {
  speaking: boolean;
  loading: boolean;
  error: string | null;
  /** Speak the given text via /api/tts/synthesize (legacy reveals-the-word path). */
  speak: (text: string, opts?: { slow?: boolean }) => Promise<void>;
  /**
   * Play a pre-prepared audio URL directly (e.g. session-scoped audio for
   * Competition / Dictation where the server hides the answer). Skips the
   * synthesize step — the URL is the authoritative source.
   */
  playUrl: (url: string, opts?: { slow?: boolean }) => Promise<void>;
  stop: () => void;
}

export function useSpellingTTS(): UseSpellingTTSState {
  const authFetch = useAuthFetch();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reqIdRef = useRef(0);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanup = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.onended = null;
      a.onerror = null;
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    audioRef.current = null;
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    cleanup();
    setSpeaking(false);
    setLoading(false);
  }, [cleanup]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      cleanup();
    };
  }, [cleanup]);

  const playSrc = useCallback(
    async (src: string, slow: boolean, reqId: number) => {
      const audio = new Audio(resolveApiMediaUrl(src));
      audio.preload = "auto";
      audio.playbackRate = slow ? 0.65 : 1;
      audio.onended = () => {
        if (reqId !== reqIdRef.current) return;
        setSpeaking(false);
      };
      audio.onerror = () => {
        if (reqId !== reqIdRef.current) return;
        setError("audio_error");
        setSpeaking(false);
      };
      audioRef.current = audio;
      setLoading(false);
      setSpeaking(true);
      await audio.play();
    },
    [],
  );

  const speak = useCallback(
    async (text: string, opts: { slow?: boolean } = {}) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      abortRef.current?.abort();
      cleanup();
      const reqId = ++reqIdRef.current;
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      setError(null);
      setSpeaking(false);
      try {
        const data = await synthesizeTts(
          authFetch,
          { text: trimmed },
          { signal: ac.signal },
        );
        if (reqId !== reqIdRef.current) return;
        await playSrc(data.audioUrl, !!opts.slow, reqId);
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return;
        if (reqId !== reqIdRef.current) return;
        setError(err instanceof Error ? err.message : "tts_failed");
        setLoading(false);
        setSpeaking(false);
      }
    },
    [authFetch, cleanup, playSrc],
  );

  const playUrl = useCallback(
    async (url: string, opts: { slow?: boolean } = {}) => {
      if (!url) return;
      abortRef.current?.abort();
      cleanup();
      const reqId = ++reqIdRef.current;
      setError(null);
      setLoading(true);
      setSpeaking(false);
      try {
        await playSrc(url, !!opts.slow, reqId);
      } catch (err) {
        if (reqId !== reqIdRef.current) return;
        setError(err instanceof Error ? err.message : "audio_error");
        setLoading(false);
        setSpeaking(false);
      }
    },
    [cleanup, playSrc],
  );

  return { speaking, loading, error, speak, playUrl, stop };
}

// ─── useSpellingWords — fetches a fresh batch of words ──────────────────────

export interface UseSpellingWordsState {
  words: SpellingWord[];
  loading: boolean;
  error: string | null;
  source: SpellingSource;
  refresh: () => Promise<void>;
  /** One-shot AI generation — replaces the current word list. */
  generateWithAI: (difficulty?: SpellingDifficulty) => Promise<void>;
}

export function useSpellingWords(
  ageGroup: SpellingAgeGroup,
  difficulty: SpellingDifficulty,
): UseSpellingWordsState {
  const authFetch = useAuthFetch();
  const [words, setWords] = useState<SpellingWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<SpellingSource>("curated");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/spelling/words?age=${encodeURIComponent(ageGroup)}&difficulty=${difficulty}&count=10`;
      const res = await authFetch(url);
      if (!res.ok) throw new Error(`words_${res.status}`);
      const data = (await res.json()) as { ok: true; words: SpellingWord[]; source: SpellingSource };
      setWords(data.words);
      setSource(data.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : "words_failed");
    } finally {
      setLoading(false);
    }
  }, [authFetch, ageGroup, difficulty]);

  const generateWithAI = useCallback(
    async (diff: SpellingDifficulty = difficulty) => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch("/api/spelling/ai-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ age: ageGroup, difficulty: diff, count: 10 }),
        });
        if (!res.ok) throw new Error(`ai_${res.status}`);
        const raw = await res.json();
        const data = await resolveAiApiData<{ ok?: boolean; words: SpellingWord[]; source: SpellingSource }>(
          raw,
          authFetch,
        );
        setWords(data?.words ?? []);
        setSource(data?.source ?? "ai");
      } catch (err) {
        setError(err instanceof Error ? err.message : "ai_failed");
      } finally {
        setLoading(false);
      }
    },
    [authFetch, ageGroup, difficulty],
  );

  // Auto-fetch on mount and whenever age/difficulty change.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { words, loading, error, source, refresh, generateWithAI };
}

// ─── useSpellingProgress — load + record helpers ────────────────────────────

export interface UseSpellingProgressState {
  progress: SpellingProgress | null;
  loading: boolean;
  error: string | null;
  /**
   * Records a client-asserted attempt outcome via the LEGACY endpoint.
   *
   * Caller MUST tag the source ("parent" | "learn" | "practice"). The
   * server rejects the request without it. Competition + Dictation use
   * `useSpellingSession` instead — they get server-side grading.
   */
  recordAttempt: (
    correct: boolean,
    source: LegacyProgressSource,
  ) => Promise<SpellingProgress | null>;
  /** Locally apply a server-graded progress row from a session attempt. */
  setProgress: (p: SpellingProgress) => void;
  refresh: () => Promise<void>;
}

export function useSpellingProgress(
  childId: number | null,
  ageGroup: SpellingAgeGroup,
): UseSpellingProgressState {
  const authFetch = useAuthFetch();
  const [progress, setProgress] = useState<SpellingProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/spelling/progress?childId=${childId}&ageGroup=${encodeURIComponent(ageGroup)}`,
      );
      if (!res.ok) throw new Error(`progress_${res.status}`);
      const data = (await res.json()) as { ok: true; progress: SpellingProgress };
      setProgress(data.progress);
    } catch (err) {
      setError(err instanceof Error ? err.message : "progress_failed");
    } finally {
      setLoading(false);
    }
  }, [authFetch, childId, ageGroup]);

  const recordAttempt = useCallback(
    async (
      correct: boolean,
      source: LegacyProgressSource,
    ): Promise<SpellingProgress | null> => {
      if (!childId) return null;
      try {
        const res = await authFetch("/api/spelling/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId, ageGroup, correct, source }),
        });
        if (!res.ok) throw new Error(`record_${res.status}`);
        const data = (await res.json()) as { ok: true; progress: SpellingProgress };
        setProgress(data.progress);
        return data.progress;
      } catch (err) {
        setError(err instanceof Error ? err.message : "record_failed");
        return null;
      }
    },
    [authFetch, childId, ageGroup],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { progress, loading, error, recordAttempt, setProgress, refresh };
}

// ─── useSpellingLeaderboard — read-only family leaderboard ──────────────────
//
// In v2 the leaderboard is written exclusively by the server-side finalize
// endpoint inside `useSpellingSession`. This hook only reads.

export interface UseSpellingLeaderboardState {
  rows: LeaderboardRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSpellingLeaderboard(
  ageGroup: SpellingAgeGroup,
): UseSpellingLeaderboardState {
  const authFetch = useAuthFetch();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/spelling/competition/leaderboard?ageGroup=${encodeURIComponent(ageGroup)}`,
      );
      if (!res.ok) throw new Error(`lb_${res.status}`);
      const data = (await res.json()) as { ok: true; leaderboard: LeaderboardRow[] };
      setRows(data.leaderboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "lb_failed");
    } finally {
      setLoading(false);
    }
  }, [authFetch, ageGroup]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, loading, error, refresh };
}

// ─── useSpellingSession — server-graded Competition / Dictation / Battle ────

export type SessionMode = "competition" | "dictation" | "battle";

/** AI opponent strength for Battle Mode. */
export type SpellingAiOpponent = "ai_easy" | "ai_medium" | "ai_hard";

export const AI_OPPONENT_LABELS: Record<SpellingAiOpponent, string> = {
  ai_easy:   "Beginner Bot",
  ai_medium: "Smart Bot",
  ai_hard:   "Master Bot",
};

/**
 * Per-word payload returned by the server. Deliberately omits the actual
 * word, syllables, chunks, and hint — those are server-only state. The
 * client only ever knows: there's a word with this many letters, here's
 * the audio URL to play it.
 */
export interface SafeSessionWord {
  id: string;
  ageGroup: SpellingAgeGroup;
  difficulty: SpellingDifficulty;
  audioUrl: string;
  letterCount: number;
}

export interface SessionAttemptResult {
  correct: boolean;
  /**
   * Canonical spelling — Dictation surfaces this on a wrong answer so the
   * child can see the right word. Competition UI hides it until finalize.
   */
  correctAnswer: string;
  progress: SpellingProgress;
  /**
   * Battle Mode only: the AI opponent's pre-computed result for THIS
   * word (deterministic, server-seeded). Null for other modes.
   */
  aiResult: { correct: boolean; ms: number } | null;
}

export interface SessionFinalizeSummary {
  mode: string;
  wordsAttempted: number;
  wordsCorrect: number;
  durationSec: number;
  accuracyPct: number;
  /** Null for Dictation. Set for Competition / Tournament / Battle. */
  score: number | null;
  /** Battle Mode only: AI's final score using same formula. Null otherwise. */
  aiScore: number | null;
  /** Battle Mode only: who won. Null otherwise. */
  winner: "you" | "ai" | "tie" | null;
}

export interface UseSpellingSessionState {
  sessionToken: string | null;
  words: SafeSessionWord[];
  startedAt: string | null;
  loading: boolean;
  error: string | null;
  finalSummary: SessionFinalizeSummary | null;
  /** Already-graded word indices — drives the "next" pointer in the UI. */
  gradedIndices: Set<number>;
  start: (opts: {
    mode: SessionMode;
    difficulty: SpellingDifficulty;
    count?: number;
    source?: SpellingSource;
    /** Required iff mode === "battle". */
    opponent?: SpellingAiOpponent;
  }) => Promise<boolean>;
  /** Submit a typed guess. Server returns correctness + updated progress. */
  attempt: (wordIndex: number, guess: string) => Promise<SessionAttemptResult | null>;
  /** Close the session — writes leaderboard row for Competition. Idempotent. */
  finalize: () => Promise<SessionFinalizeSummary | null>;
  /** Drop local state — does NOT abandon the server session (it just lingers). */
  reset: () => void;
}

export function useSpellingSession(
  childId: number | null,
  ageGroup: SpellingAgeGroup,
  onProgressUpdate?: (p: SpellingProgress) => void,
): UseSpellingSessionState {
  const authFetch = useAuthFetch();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [words, setWords] = useState<SafeSessionWord[]>([]);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalSummary, setFinalSummary] =
    useState<SessionFinalizeSummary | null>(null);
  const [gradedIndices, setGradedIndices] = useState<Set<number>>(
    () => new Set(),
  );

  const reset = useCallback(() => {
    setSessionToken(null);
    setWords([]);
    setStartedAt(null);
    setError(null);
    setFinalSummary(null);
    setGradedIndices(new Set());
  }, []);

  const start = useCallback(
    async (opts: {
      mode: SessionMode;
      difficulty: SpellingDifficulty;
      count?: number;
      source?: SpellingSource;
      opponent?: SpellingAiOpponent;
    }): Promise<boolean> => {
      if (!childId) return false;
      setLoading(true);
      setError(null);
      setFinalSummary(null);
      setGradedIndices(new Set());
      try {
        const res = await authFetch("/api/spelling/sessions/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId,
            ageGroup,
            mode: opts.mode,
            difficulty: opts.difficulty,
            count: opts.count ?? 10,
            source: opts.source ?? "curated",
            // Only include opponent for Battle Mode — server's refine()
            // will reject a stray opponent on competition/dictation.
            ...(opts.mode === "battle" && opts.opponent
              ? { opponent: opts.opponent }
              : {}),
          }),
        });
        if (!res.ok) throw new Error(`session_start_${res.status}`);
        const data = (await res.json()) as {
          ok: true;
          sessionToken: string;
          mode: SessionMode;
          ageGroup: SpellingAgeGroup;
          difficulty: SpellingDifficulty;
          startedAt: string;
          words: SafeSessionWord[];
        };
        setSessionToken(data.sessionToken);
        setWords(data.words);
        setStartedAt(data.startedAt);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "session_start_failed");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [authFetch, childId, ageGroup],
  );

  const attempt = useCallback(
    async (
      wordIndex: number,
      guess: string,
    ): Promise<SessionAttemptResult | null> => {
      if (!sessionToken) return null;
      try {
        const res = await authFetch(
          `/api/spelling/sessions/${sessionToken}/attempt`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wordIndex, guess }),
          },
        );
        // Replay / already-graded responses come back as 409 with the
        // previous verdict — surface them as a soft failure rather than
        // throwing, so the UI can advance to the next word.
        if (res.status === 409) {
          setError("already_graded");
          return null;
        }
        if (!res.ok) throw new Error(`session_attempt_${res.status}`);
        const data = (await res.json()) as {
          ok: true;
          correct: boolean;
          correctAnswer: string;
          progress: SpellingProgress;
          aiResult: { correct: boolean; ms: number } | null;
        };
        setGradedIndices((prev) => {
          const next = new Set(prev);
          next.add(wordIndex);
          return next;
        });
        onProgressUpdate?.(data.progress);
        return {
          correct: data.correct,
          correctAnswer: data.correctAnswer,
          progress: data.progress,
          aiResult: data.aiResult,
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "session_attempt_failed");
        return null;
      }
    },
    [authFetch, sessionToken, onProgressUpdate],
  );

  const finalize = useCallback(async (): Promise<SessionFinalizeSummary | null> => {
    if (!sessionToken) return null;
    try {
      const res = await authFetch(
        `/api/spelling/sessions/${sessionToken}/finalize`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      if (!res.ok) throw new Error(`session_finalize_${res.status}`);
      const data = (await res.json()) as {
        ok: true;
        summary: SessionFinalizeSummary;
        competitionScoreId: number | null;
        alreadyFinalized: boolean;
      };
      setFinalSummary(data.summary);
      return data.summary;
    } catch (err) {
      setError(err instanceof Error ? err.message : "session_finalize_failed");
      return null;
    }
  }, [authFetch, sessionToken]);

  // Memoised state for stable identity in dependent hooks.
  return useMemo(
    () => ({
      sessionToken,
      words,
      startedAt,
      loading,
      error,
      finalSummary,
      gradedIndices,
      start,
      attempt,
      finalize,
      reset,
    }),
    [
      sessionToken,
      words,
      startedAt,
      loading,
      error,
      finalSummary,
      gradedIndices,
      start,
      attempt,
      finalize,
      reset,
    ],
  );
}

// ─── useSpellingTournament — 3-round elimination orchestrator ───────────────
//
// The server owns the round progression: each round is its own
// server-graded session (mode "tournament"), and the tournament row
// stores the rolling state. This hook is a thin client driver that:
//   1. POST /spelling/tournaments/start  → tournament + round 1 session
//   2. attempt(idx, guess) hits the standard /sessions/:token/attempt
//      using the active round's session token (re-using the v2 trust model)
//   3. advance() finalizes the active round via the tournament endpoint
//      and either receives the next round's session OR a terminal status.

/** Per-round result as the server-side state machine returns it. */
export interface TournamentRoundSnapshot {
  round: number;
  difficulty: SpellingDifficulty;
  sessionToken: string;
  score: number;
  wordsCorrect: number;
  wordsAttempted: number;
  durationSec: number;
  passed: boolean;
}

export interface TournamentSummary {
  tournamentToken: string;
  childId: number;
  ageGroup: SpellingAgeGroup;
  status: "active" | "eliminated" | "completed";
  currentRound: number;
  rounds: TournamentRoundSnapshot[];
  totalScore: number;
  eliminatedAtRound: number | null;
  startedAt: string;
  finalizedAt: string | null;
}

/** Active round's session — same shape the public start endpoint returns. */
export interface TournamentActiveSession {
  sessionToken: string;
  mode: "tournament";
  ageGroup: SpellingAgeGroup;
  difficulty: SpellingDifficulty;
  round: number;
  passThreshold: number;
  startedAt: string;
  words: SafeSessionWord[];
}

export interface UseSpellingTournamentState {
  tournament: TournamentSummary | null;
  activeSession: TournamentActiveSession | null;
  /** Indices of the active round's session that have been graded. */
  gradedIndices: Set<number>;
  /** Result of the most recently finalized round (for inter-round banner). */
  lastRound: TournamentRoundSnapshot | null;
  loading: boolean;
  error: string | null;
  start: () => Promise<boolean>;
  /** Submit a typed guess for the active round's word. */
  attempt: (wordIndex: number, guess: string) => Promise<SessionAttemptResult | null>;
  /** Finalize the active round and (if active) load the next one. */
  advance: () => Promise<TournamentSummary | null>;
  /** Drop local state — does NOT delete the server-side tournament. */
  reset: () => void;
}

export function useSpellingTournament(
  childId: number | null,
  ageGroup: SpellingAgeGroup,
  onProgressUpdate?: (p: SpellingProgress) => void,
): UseSpellingTournamentState {
  const authFetch = useAuthFetch();
  const [tournament, setTournament] = useState<TournamentSummary | null>(null);
  const [activeSession, setActiveSession] =
    useState<TournamentActiveSession | null>(null);
  const [gradedIndices, setGradedIndices] = useState<Set<number>>(
    () => new Set(),
  );
  const [lastRound, setLastRound] = useState<TournamentRoundSnapshot | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTournament(null);
    setActiveSession(null);
    setGradedIndices(new Set());
    setLastRound(null);
    setError(null);
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (!childId) return false;
    setLoading(true);
    setError(null);
    setLastRound(null);
    setGradedIndices(new Set());
    try {
      const res = await authFetch("/api/spelling/tournaments/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, ageGroup }),
      });
      if (!res.ok) throw new Error(`tournament_start_${res.status}`);
      const data = (await res.json()) as {
        ok: true;
        tournament: TournamentSummary;
        session: TournamentActiveSession;
      };
      setTournament(data.tournament);
      setActiveSession(data.session);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "tournament_start_failed");
      return false;
    } finally {
      setLoading(false);
    }
  }, [authFetch, childId, ageGroup]);

  const attempt = useCallback(
    async (
      wordIndex: number,
      guess: string,
    ): Promise<SessionAttemptResult | null> => {
      if (!activeSession) return null;
      try {
        const res = await authFetch(
          `/api/spelling/sessions/${activeSession.sessionToken}/attempt`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wordIndex, guess }),
          },
        );
        if (res.status === 409) {
          setError("already_graded");
          return null;
        }
        if (!res.ok) throw new Error(`tournament_attempt_${res.status}`);
        const data = (await res.json()) as {
          ok: true;
          correct: boolean;
          correctAnswer: string;
          progress: SpellingProgress;
          aiResult: { correct: boolean; ms: number } | null;
        };
        setGradedIndices((prev) => {
          const next = new Set(prev);
          next.add(wordIndex);
          return next;
        });
        onProgressUpdate?.(data.progress);
        return {
          correct: data.correct,
          correctAnswer: data.correctAnswer,
          progress: data.progress,
          aiResult: data.aiResult,
        };
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "tournament_attempt_failed",
        );
        return null;
      }
    },
    [authFetch, activeSession, onProgressUpdate],
  );

  const advance = useCallback(async (): Promise<TournamentSummary | null> => {
    if (!tournament) return null;
    setLoading(true);
    try {
      const res = await authFetch(
        `/api/spelling/tournaments/${tournament.tournamentToken}/advance`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      if (!res.ok) throw new Error(`tournament_advance_${res.status}`);
      const data = (await res.json()) as {
        ok: true;
        tournament: TournamentSummary;
        lastRound: TournamentRoundSnapshot;
        nextSession: TournamentActiveSession | null;
      };
      setTournament(data.tournament);
      setLastRound(data.lastRound);
      setActiveSession(data.nextSession);
      // Reset graded indices for the new round (or clear when terminal).
      setGradedIndices(new Set());
      return data.tournament;
    } catch (err) {
      setError(err instanceof Error ? err.message : "tournament_advance_failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, [authFetch, tournament]);

  return useMemo(
    () => ({
      tournament,
      activeSession,
      gradedIndices,
      lastRound,
      loading,
      error,
      start,
      attempt,
      advance,
      reset,
    }),
    [
      tournament,
      activeSession,
      gradedIndices,
      lastRound,
      loading,
      error,
      start,
      attempt,
      advance,
      reset,
    ],
  );
}

// ─── Badge metadata (UI labels) ─────────────────────────────────────────────

export const BADGE_LABELS: Record<string, { label: string; emoji: string }> = {
  first_word:      { label: "First Word",      emoji: "🌱" },
  spelling_star:   { label: "Spelling Star",   emoji: "⭐" },
  streak_10:       { label: "10 in a Row",     emoji: "🔥" },
  level_3:         { label: "Level 3",         emoji: "🥉" },
  level_5:         { label: "Level 5",         emoji: "🥈" },
  spelling_master: { label: "Spelling Master", emoji: "🏆" },
};
