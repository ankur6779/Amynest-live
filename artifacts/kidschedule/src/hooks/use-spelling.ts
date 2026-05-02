import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";

// ─── Shared types (mirror server shape — no codegen yet for /spelling/*) ─────

export type SpellingAgeGroup = "2-4" | "4-6" | "6-8" | "8-10+";
export type SpellingDifficulty = "easy" | "medium" | "hard";
export type SpellingSource = "curated" | "ai";

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

// Map ageMonths -> spelling age group (mirrors server `spellingAgeGroupFor`).
export function spellingAgeGroupFor(ageMonths: number): SpellingAgeGroup {
  if (ageMonths < 72) return "4-6";
  if (ageMonths < 96) return "6-8";
  if (ageMonths >= 120) return "8-10+";
  return ageMonths < 48 ? "2-4" : "4-6";
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
  /** Speak the given text. If already playing, stops and starts fresh. */
  speak: (text: string, opts?: { slow?: boolean }) => Promise<void>;
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

  const speak = useCallback(
    async (text: string, opts: { slow?: boolean } = {}) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      // Cancel anything in-flight + bump the request id so any older
      // resolve no longer mutates state.
      abortRef.current?.abort();
      cleanup();
      const reqId = ++reqIdRef.current;
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      setError(null);
      setSpeaking(false);

      try {
        const res = await authFetch("/api/tts/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(`tts_synth_${res.status}`);
        const data = (await res.json()) as SynthesizeResponse;
        if (reqId !== reqIdRef.current) return; // stale

        const audio = new Audio(data.audioUrl);
        audio.preload = "auto";
        audio.playbackRate = opts.slow ? 0.65 : 1;
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
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return;
        if (reqId !== reqIdRef.current) return;
        setError(err instanceof Error ? err.message : "tts_failed");
        setLoading(false);
        setSpeaking(false);
      }
    },
    [authFetch, cleanup],
  );

  return { speaking, loading, error, speak, stop };
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
        const data = (await res.json()) as { ok: true; words: SpellingWord[]; source: SpellingSource };
        setWords(data.words);
        setSource(data.source);
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
  /** Records an attempt and returns the new server-authoritative progress. */
  recordAttempt: (correct: boolean) => Promise<SpellingProgress | null>;
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
    async (correct: boolean): Promise<SpellingProgress | null> => {
      if (!childId) return null;
      try {
        const res = await authFetch("/api/spelling/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ childId, ageGroup, correct }),
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

  return { progress, loading, error, recordAttempt, refresh };
}

// ─── useSpellingLeaderboard ─────────────────────────────────────────────────

export interface UseSpellingLeaderboardState {
  rows: LeaderboardRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  recordScore: (input: {
    childId: number;
    wordsAttempted: number;
    wordsCorrect: number;
    durationSec: number;
  }) => Promise<LeaderboardRow | null>;
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

  const recordScore = useCallback(
    async (input: {
      childId: number;
      wordsAttempted: number;
      wordsCorrect: number;
      durationSec: number;
    }): Promise<LeaderboardRow | null> => {
      try {
        const res = await authFetch("/api/spelling/competition/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, ageGroup }),
        });
        if (!res.ok) throw new Error(`record_${res.status}`);
        const data = (await res.json()) as { ok: true; score: LeaderboardRow };
        // Refresh leaderboard so the UI reflects the new entry immediately.
        void refresh();
        return data.score;
      } catch (err) {
        setError(err instanceof Error ? err.message : "score_failed");
        return null;
      }
    },
    [authFetch, ageGroup, refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, loading, error, refresh, recordScore };
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
