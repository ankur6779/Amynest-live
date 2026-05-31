import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import type {
  OlympiadAgeBand,
  OlympiadDifficulty,
  OlympiadQuestion,
  OlympiadSubject,
  OlympiadTrackId,
} from "@workspace/olympiad";
import {
  pickDailyQuestions,
  pickDailyQuestionsWeighted,
  pickPracticeQuestions,
  pickTrackQuestions,
  pickWeeklyQuestions,
  pickMockExamQuestions,
  finalizeLocalizedSet,
} from "@workspace/olympiad";

export type OlympiadQuestionKind = "daily" | "weekly" | "practice" | "track" | "mock";

export interface OlympiadQuestionSetResult {
  questions: OlympiadQuestion[];
  source: "ai" | "dataset";
  country: string;
  isPremium: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface OlympiadQuestionRequest {
  childId: number;
  ageBand: OlympiadAgeBand;
  difficulty: OlympiadDifficulty;
  kind: OlympiadQuestionKind;
  country: string;
  subject?: OlympiadSubject;
  trackId?: OlympiadTrackId;
  count?: number;
  dateKey?: string;
  enabled?: boolean;
  weakSubjects?: OlympiadSubject[];
}

const SEEN_KEY = (childId: number) => `olympiad:seen:v1:${childId}`;
const CACHE_KEY = (childId: number, kind: string, dateKey: string) =>
  `olympiad:cache:v1:${childId}:${kind}:${dateKey}`;

function readSeen(childId: number): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY(childId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function appendSeen(childId: number, ids: string[]) {
  try {
    const prev = readSeen(childId);
    ids.forEach((id) => prev.add(id));
    const capped = [...prev].slice(-200);
    localStorage.setItem(SEEN_KEY(childId), JSON.stringify(capped));
  } catch { /* quota */ }
}

function readCache(key: string): OlympiadQuestion[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OlympiadQuestion[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, questions: OlympiadQuestion[]) {
  try {
    localStorage.setItem(key, JSON.stringify(questions));
  } catch { /* quota */ }
}

function offlineFallback(req: OlympiadQuestionRequest): OlympiadQuestion[] {
  const childKey = req.childId;
  const dateKey = req.dateKey ?? new Date().toISOString().slice(0, 10);
  let picks: OlympiadQuestion[] = [];
  switch (req.kind) {
    case "daily":
      picks = req.weakSubjects?.length
        ? pickDailyQuestionsWeighted(req.ageBand, req.difficulty, dateKey, childKey, req.weakSubjects)
        : pickDailyQuestions(req.ageBand, req.difficulty, dateKey, childKey);
      break;
    case "weekly":
      picks = pickWeeklyQuestions(req.ageBand, dateKey, childKey);
      break;
    case "practice":
      picks = pickPracticeQuestions(
        req.ageBand,
        req.subject ?? "math",
        req.difficulty,
        req.count ?? 5,
      );
      break;
    case "track":
      picks = pickTrackQuestions(
        req.ageBand,
        req.trackId ?? "nso",
        req.difficulty,
        childKey,
        req.count ?? 10,
      );
      break;
    case "mock":
      picks = pickMockExamQuestions(req.ageBand, dateKey, childKey, req.count ?? 30);
      break;
  }
  return finalizeLocalizedSet(picks, req.country, req.ageBand, req.difficulty);
}

export function useOlympiadQuestionSet(
  req: OlympiadQuestionRequest | null,
): OlympiadQuestionSetResult {
  const authFetch = useAuthFetch();
  const [questions, setQuestions] = useState<OlympiadQuestion[]>([]);
  const [source, setSource] = useState<"ai" | "dataset">("dataset");
  const [country, setCountry] = useState(req?.country ?? "US");
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!req || req.enabled === false) return;

    setLoading(true);
    setError(null);

    const dateKey =
      req.dateKey ??
      (req.kind === "daily"
        ? new Date().toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10));

    const cacheKey = CACHE_KEY(req.childId, req.kind, dateKey);
    const cached = readCache(cacheKey);
    if (cached?.length) {
      setQuestions(cached);
      setCountry(req.country);
      setLoading(false);
      return;
    }

    try {
      const res = await authFetch("/api/olympiad/next-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: req.childId,
          ageBand: req.ageBand,
          difficulty: req.difficulty,
          kind: req.kind,
          subject: req.subject,
          trackId: req.trackId,
          count: req.count,
          country: req.country,
          dateKey,
          excludeIds: [...readSeen(req.childId)],
          weakSubjects: req.weakSubjects,
        }),
      });

      if (!res.ok) throw new Error(`fetch_${res.status}`);

      const data = (await res.json()) as {
        source: "ai" | "dataset";
        country: string;
        isPremium: boolean;
        questions: OlympiadQuestion[];
      };

      if (!mounted.current) return;

      const qs = data.questions ?? [];
      if (qs.length === 0) throw new Error("empty_set");

      setQuestions(qs);
      setSource(data.source);
      setCountry(data.country);
      setIsPremium(data.isPremium);
      writeCache(cacheKey, qs);
      appendSeen(req.childId, qs.map((q) => q.id));
    } catch {
      if (!mounted.current) return;
      const fallback = offlineFallback(req);
      setQuestions(fallback);
      setSource("dataset");
      setCountry(req.country);
      setError("offline_fallback");
      writeCache(cacheKey, fallback);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [authFetch, req]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  return { questions, source, country, isPremium, loading, error, refresh };
}

/** Read cached question set (e.g. daily review after completion). */
export function readOlympiadQuestionCache(
  childId: number,
  kind: string,
  dateKey: string,
): OlympiadQuestion[] | null {
  return readCache(CACHE_KEY(childId, kind, dateKey));
}

/** Clear cached question set (e.g. after completing daily). */
export function clearOlympiadQuestionCache(
  childId: number,
  kind: string,
  dateKey: string,
) {
  try {
    localStorage.removeItem(CACHE_KEY(childId, kind, dateKey));
  } catch { /* ignore */ }
}
