// i18n-ignore-start
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { API_BASE_URL } from "@/constants/api";

// ─── Shared types (mirror server shape) ──────────────────────────────────────

export type SpellingAgeGroup = "2-4" | "4-6" | "6-8" | "8-10+";
export type SpellingDifficulty = "easy" | "medium" | "hard";
export type SpellingSource = "curated" | "ai";
export type LegacyProgressSource = "parent";
export type SessionMode = "competition" | "dictation" | "battle";
export type SpellingAiOpponent = "ai_easy" | "ai_medium" | "ai_hard";

export const AI_OPPONENT_LABELS: Record<SpellingAiOpponent, string> = {
  ai_easy: "Beginner Bot",
  ai_medium: "Smart Bot",
  ai_hard: "Master Bot",
};

export const BADGE_LABELS: Record<string, { label: string; emoji: string }> = {
  first_word:      { label: "First Word",      emoji: "🌱" },
  spelling_star:   { label: "Spelling Star",   emoji: "⭐" },
  streak_10:       { label: "10 in a Row",     emoji: "🔥" },
  level_3:         { label: "Level 3",         emoji: "🥉" },
  level_5:         { label: "Level 5",         emoji: "🥈" },
  spelling_master: { label: "Spelling Master", emoji: "🏆" },
};

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

export interface SafeSessionWord {
  id: string;
  ageGroup: SpellingAgeGroup;
  difficulty: SpellingDifficulty;
  audioUrl: string;
  letterCount: number;
}

export interface SessionAttemptResult {
  correct: boolean;
  correctAnswer: string;
  progress: SpellingProgress;
  aiResult: { correct: boolean; ms: number } | null;
}

export interface SessionFinalizeSummary {
  mode: string;
  wordsAttempted: number;
  wordsCorrect: number;
  durationSec: number;
  accuracyPct: number;
  score: number | null;
  aiScore: number | null;
  winner: "you" | "ai" | "tie" | null;
}

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

// ─── Utility ─────────────────────────────────────────────────────────────────

export function spellingAgeGroupFor(ageMonths: number): SpellingAgeGroup {
  if (ageMonths < 48) return "2-4";
  if (ageMonths < 72) return "4-6";
  if (ageMonths < 96) return "6-8";
  return "8-10+";
}

// ─── useSpellingTTS — Mobile adaptation using expo-audio ─────────────────────

export interface UseSpellingTTSState {
  speaking: boolean;
  loading: boolean;
  error: string | null;
  speak: (text: string, opts?: { slow?: boolean }) => Promise<void>;
  playUrl: (url: string, opts?: { slow?: boolean }) => Promise<void>;
  stop: () => void;
}

interface SynthesizeResponse {
  ok: true;
  cacheKey: string;
  audioUrl: string;
  cached: boolean;
  charCount: number;
  contentType: string;
}

export function useSpellingTTS(): UseSpellingTTSState {
  const authFetch = useAuthFetch();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [requestedPlaying, setRequestedPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reqIdRef = useRef(0);
  const isMountedRef = useRef(true);

  const speaking = requestedPlaying && status.playing;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
      try { player.pause(); } catch {}
    };
  }, [player]);

  useEffect(() => {
    if (status.didJustFinish) {
      setRequestedPlaying(false);
    }
  }, [status.didJustFinish]);

  const stop = useCallback(() => {
    reqIdRef.current++;
    abortRef.current?.abort();
    abortRef.current = null;
    try { player.pause(); } catch {}
    if (isMountedRef.current) {
      setRequestedPlaying(false);
      setLoading(false);
    }
  }, [player]);

  const _playUri = useCallback((uri: string, myId: number) => {
    if (myId !== reqIdRef.current || !isMountedRef.current) return;
    const fullUri = uri.startsWith("http") ? uri : `${API_BASE_URL}${uri}`;
    player.replace({ uri: fullUri });
    player.play();
    if (isMountedRef.current) setRequestedPlaying(true);
  }, [player]);

  const speak = useCallback(async (text: string, opts?: { slow?: boolean }) => {
    const trimmed = (text ?? "").trim();
    if (!trimmed) return;
    const myId = ++reqIdRef.current;
    abortRef.current?.abort();
    try { player.pause(); } catch {}
    const controller = new AbortController();
    abortRef.current = controller;
    if (isMountedRef.current) {
      setRequestedPlaying(false);
      setLoading(true);
      setError(null);
    }
    try {
      const { readResolvedApiJson, resolveAiApiData } = await import("@/lib/poll-result");
      const res = await authFetch("/api/tts/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
        signal: controller.signal,
      });
      if (myId !== reqIdRef.current || !isMountedRef.current) return;
      if (!res.ok) throw new Error(`tts_synth_${res.status}`);
      const data = await readResolvedApiJson<SynthesizeResponse>(res, authFetch);
      if (!data?.audioUrl) throw new Error("tts_missing_audio_url");
      _playUri(data.audioUrl, myId);
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      if (isMountedRef.current && myId === reqIdRef.current) {
        setError(err instanceof Error ? err.message : "tts_failed");
        setRequestedPlaying(false);
      }
    } finally {
      if (isMountedRef.current && myId === reqIdRef.current) {
        setLoading(false);
        if (abortRef.current === controller) abortRef.current = null;
      }
    }
  }, [authFetch, _playUri, player]);

  const playUrl = useCallback(async (url: string, _opts?: { slow?: boolean }) => {
    if (!url) return;
    const myId = ++reqIdRef.current;
    abortRef.current?.abort();
    abortRef.current = null;
    try { player.pause(); } catch {}
    if (isMountedRef.current) {
      setError(null);
      setLoading(true);
      setRequestedPlaying(false);
    }
    _playUri(url, myId);
    if (isMountedRef.current && myId === reqIdRef.current) setLoading(false);
  }, [_playUri, player]);

  return { speaking, loading, error, speak, playUrl, stop };
}

// ─── useSpellingWords ────────────────────────────────────────────────────────

export interface UseSpellingWordsState {
  words: SpellingWord[];
  loading: boolean;
  error: string | null;
  source: SpellingSource;
  refresh: () => Promise<void>;
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

  const generateWithAI = useCallback(async (diff: SpellingDifficulty = difficulty) => {
    setLoading(true);
    setError(null);
    try {
      const { resolveAiApiData } = await import("@/lib/poll-result");
      const res = await authFetch("/api/spelling/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ age: ageGroup, difficulty: diff, count: 10 }),
      });
      if (!res.ok) throw new Error(`ai_${res.status}`);
      const raw = await res.json();
      const data = await resolveAiApiData<{ words: SpellingWord[]; source: SpellingSource }>(
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
  }, [authFetch, ageGroup, difficulty]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { words, loading, error, source, refresh, generateWithAI };
}

// ─── useSpellingProgress ─────────────────────────────────────────────────────

export interface UseSpellingProgressState {
  progress: SpellingProgress | null;
  loading: boolean;
  error: string | null;
  recordAttempt: (correct: boolean, source: LegacyProgressSource) => Promise<SpellingProgress | null>;
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
    async (correct: boolean, source: LegacyProgressSource): Promise<SpellingProgress | null> => {
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

  useEffect(() => { void refresh(); }, [refresh]);

  return { progress, loading, error, recordAttempt, setProgress, refresh };
}

// ─── useSpellingLeaderboard ──────────────────────────────────────────────────

export interface UseSpellingLeaderboardState {
  rows: LeaderboardRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSpellingLeaderboard(ageGroup: SpellingAgeGroup): UseSpellingLeaderboardState {
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

  useEffect(() => { void refresh(); }, [refresh]);

  return { rows, loading, error, refresh };
}

// ─── useSpellingSession ──────────────────────────────────────────────────────

export interface UseSpellingSessionState {
  sessionToken: string | null;
  words: SafeSessionWord[];
  startedAt: string | null;
  loading: boolean;
  error: string | null;
  finalSummary: SessionFinalizeSummary | null;
  gradedIndices: Set<number>;
  start: (opts: {
    mode: SessionMode;
    difficulty: SpellingDifficulty;
    count?: number;
    source?: SpellingSource;
    opponent?: SpellingAiOpponent;
  }) => Promise<boolean>;
  attempt: (wordIndex: number, guess: string) => Promise<SessionAttemptResult | null>;
  finalize: () => Promise<SessionFinalizeSummary | null>;
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
  const [finalSummary, setFinalSummary] = useState<SessionFinalizeSummary | null>(null);
  const [gradedIndices, setGradedIndices] = useState<Set<number>>(() => new Set());

  const reset = useCallback(() => {
    setSessionToken(null);
    setWords([]);
    setStartedAt(null);
    setError(null);
    setFinalSummary(null);
    setGradedIndices(new Set());
  }, []);

  const start = useCallback(async (opts: {
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
          ...(opts.mode === "battle" && opts.opponent ? { opponent: opts.opponent } : {}),
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
  }, [authFetch, childId, ageGroup]);

  const attempt = useCallback(async (wordIndex: number, guess: string): Promise<SessionAttemptResult | null> => {
    if (!sessionToken) return null;
    try {
      const res = await authFetch(`/api/spelling/sessions/${sessionToken}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordIndex, guess }),
      });
      if (res.status === 409) { setError("already_graded"); return null; }
      if (!res.ok) throw new Error(`session_attempt_${res.status}`);
      const data = (await res.json()) as {
        ok: true;
        correct: boolean;
        correctAnswer: string;
        progress: SpellingProgress;
        aiResult: { correct: boolean; ms: number } | null;
      };
      setGradedIndices((prev) => { const next = new Set(prev); next.add(wordIndex); return next; });
      onProgressUpdate?.(data.progress);
      return { correct: data.correct, correctAnswer: data.correctAnswer, progress: data.progress, aiResult: data.aiResult };
    } catch (err) {
      setError(err instanceof Error ? err.message : "session_attempt_failed");
      return null;
    }
  }, [authFetch, sessionToken, onProgressUpdate]);

  const finalize = useCallback(async (): Promise<SessionFinalizeSummary | null> => {
    if (!sessionToken) return null;
    try {
      const res = await authFetch(`/api/spelling/sessions/${sessionToken}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`session_finalize_${res.status}`);
      const data = (await res.json()) as { ok: true; summary: SessionFinalizeSummary };
      setFinalSummary(data.summary);
      return data.summary;
    } catch (err) {
      setError(err instanceof Error ? err.message : "session_finalize_failed");
      return null;
    }
  }, [authFetch, sessionToken]);

  return useMemo(
    () => ({ sessionToken, words, startedAt, loading, error, finalSummary, gradedIndices, start, attempt, finalize, reset }),
    [sessionToken, words, startedAt, loading, error, finalSummary, gradedIndices, start, attempt, finalize, reset],
  );
}

// ─── useSpellingTournament ───────────────────────────────────────────────────

export interface UseSpellingTournamentState {
  tournament: TournamentSummary | null;
  activeSession: TournamentActiveSession | null;
  gradedIndices: Set<number>;
  lastRound: TournamentRoundSnapshot | null;
  loading: boolean;
  error: string | null;
  start: () => Promise<boolean>;
  attempt: (wordIndex: number, guess: string) => Promise<SessionAttemptResult | null>;
  advance: () => Promise<TournamentSummary | null>;
  reset: () => void;
}

export function useSpellingTournament(
  childId: number | null,
  ageGroup: SpellingAgeGroup,
  onProgressUpdate?: (p: SpellingProgress) => void,
): UseSpellingTournamentState {
  const authFetch = useAuthFetch();
  const [tournament, setTournament] = useState<TournamentSummary | null>(null);
  const [activeSession, setActiveSession] = useState<TournamentActiveSession | null>(null);
  const [gradedIndices, setGradedIndices] = useState<Set<number>>(() => new Set());
  const [lastRound, setLastRound] = useState<TournamentRoundSnapshot | null>(null);
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
      const data = (await res.json()) as { ok: true; tournament: TournamentSummary; session: TournamentActiveSession };
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

  const attempt = useCallback(async (wordIndex: number, guess: string): Promise<SessionAttemptResult | null> => {
    if (!activeSession) return null;
    try {
      const res = await authFetch(`/api/spelling/sessions/${activeSession.sessionToken}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordIndex, guess }),
      });
      if (res.status === 409) { setError("already_graded"); return null; }
      if (!res.ok) throw new Error(`tournament_attempt_${res.status}`);
      const data = (await res.json()) as {
        ok: true; correct: boolean; correctAnswer: string;
        progress: SpellingProgress; aiResult: { correct: boolean; ms: number } | null;
      };
      setGradedIndices((prev) => { const next = new Set(prev); next.add(wordIndex); return next; });
      onProgressUpdate?.(data.progress);
      return { correct: data.correct, correctAnswer: data.correctAnswer, progress: data.progress, aiResult: data.aiResult };
    } catch (err) {
      setError(err instanceof Error ? err.message : "tournament_attempt_failed");
      return null;
    }
  }, [authFetch, activeSession, onProgressUpdate]);

  const advance = useCallback(async (): Promise<TournamentSummary | null> => {
    if (!tournament) return null;
    setLoading(true);
    try {
      const res = await authFetch(`/api/spelling/tournaments/${tournament.tournamentToken}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`tournament_advance_${res.status}`);
      const data = (await res.json()) as {
        ok: true; tournament: TournamentSummary;
        lastRound: TournamentRoundSnapshot; nextSession: TournamentActiveSession | null;
      };
      setTournament(data.tournament);
      setLastRound(data.lastRound);
      setActiveSession(data.nextSession);
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
    () => ({ tournament, activeSession, gradedIndices, lastRound, loading, error, start, attempt, advance, reset }),
    [tournament, activeSession, gradedIndices, lastRound, loading, error, start, attempt, advance, reset],
  );
}
// i18n-ignore-end
