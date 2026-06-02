import { and, eq } from "drizzle-orm";
import {
  db,
  speechConversationMemoryTable,
  type ConversationWordStat,
  type SpeechConversationMemory,
} from "@workspace/db";

export type CoachTone = "supportive" | "balanced" | "challenging";

/** Compact memory the conversation prompt consumes. */
export interface ConversationPromptMemory {
  isReturning: boolean;
  totalSessions: number;
  lastSummary: string | null;
  lastNextFocus: string | null;
  targetSounds: string[];
  masteredSounds: string[];
  tone: CoachTone;
  daysSinceLast: number | null;
}

export interface ConversationSessionReport {
  summary?: string;
  focusWords?: { word: string; score: number }[];
  nextFocus?: string;
  clarity?: number;
}

const TARGET_MAX = 6;
const MASTERED_MIN_SCORE = 85;
const MASTERED_MIN_ATTEMPTS = 2;
const TRICKY_MAX_SCORE = 70;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function toneFromClarity(clarityAvg: number | null): CoachTone {
  if (clarityAvg == null) return "supportive";
  if (clarityAvg <= 54) return "supportive";
  if (clarityAvg >= 82) return "challenging";
  return "balanced";
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const last = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(last.getTime())) return null;
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Math.max(0, Math.round((today.getTime() - last.getTime()) / 86_400_000));
}

export async function loadConversationMemory(
  userId: string,
  childId: number,
): Promise<SpeechConversationMemory | null> {
  const rows = await db
    .select()
    .from(speechConversationMemoryTable)
    .where(
      and(
        eq(speechConversationMemoryTable.userId, userId),
        eq(speechConversationMemoryTable.childId, childId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export function buildPromptMemory(
  row: SpeechConversationMemory | null,
): ConversationPromptMemory {
  if (!row || row.totalSessions <= 0) {
    return {
      isReturning: false,
      totalSessions: row?.totalSessions ?? 0,
      lastSummary: null,
      lastNextFocus: null,
      targetSounds: [],
      masteredSounds: [],
      tone: "supportive",
      daysSinceLast: null,
    };
  }
  return {
    isReturning: true,
    totalSessions: row.totalSessions,
    lastSummary: row.lastSummary ?? null,
    lastNextFocus: row.lastNextFocus ?? null,
    targetSounds: (row.targetSounds ?? []).slice(0, TARGET_MAX),
    masteredSounds: (row.masteredWords ?? []).slice(0, 8),
    tone: toneFromClarity(row.clarityAvg),
    daysSinceLast: daysSince(row.lastSessionDate),
  };
}

function mergeWordStats(
  prev: Record<string, ConversationWordStat>,
  focusWords: { word: string; score: number }[],
): Record<string, ConversationWordStat> {
  const next: Record<string, ConversationWordStat> = { ...prev };
  for (const fw of focusWords) {
    const word = fw.word.trim();
    if (!word) continue;
    const key = word.toLowerCase();
    const score = Math.max(0, Math.min(100, Math.round(fw.score)));
    const cur = next[key];
    next[key] = {
      word,
      bestScore: Math.max(cur?.bestScore ?? 0, score),
      lastScore: score,
      attempts: (cur?.attempts ?? 0) + 1,
    };
  }
  return next;
}

function deriveTargets(stats: Record<string, ConversationWordStat>): string[] {
  const all = Object.values(stats);
  const tricky = all
    .filter((w) => w.lastScore < TRICKY_MAX_SCORE)
    .sort((a, b) => a.lastScore - b.lastScore)
    .map((w) => w.word);
  if (tricky.length > 0) return tricky.slice(0, TARGET_MAX);
  // Everything sounds good — keep the few lowest as light reinforcement.
  return all
    .sort((a, b) => a.lastScore - b.lastScore)
    .slice(0, 3)
    .map((w) => w.word);
}

function deriveMastered(stats: Record<string, ConversationWordStat>): string[] {
  return Object.values(stats)
    .filter((w) => w.bestScore >= MASTERED_MIN_SCORE && w.attempts >= MASTERED_MIN_ATTEMPTS)
    .sort((a, b) => b.bestScore - a.bestScore)
    .map((w) => w.word)
    .slice(0, 12);
}

/**
 * Persist a completed live talk session into the child's cross-device memory.
 * Idempotent-ish upsert keyed by (userId, childId).
 */
export async function recordConversationSession(
  userId: string,
  childId: number,
  report: ConversationSessionReport,
): Promise<SpeechConversationMemory | null> {
  const prev = await loadConversationMemory(userId, childId);
  const focusWords = (report.focusWords ?? [])
    .filter((f) => typeof f?.word === "string" && f.word.trim())
    .slice(0, 8);

  const wordStats = mergeWordStats(prev?.wordStats ?? {}, focusWords);
  const targetSounds = deriveTargets(wordStats);
  const masteredWords = deriveMastered(wordStats);

  const reportClarity =
    typeof report.clarity === "number" ? Math.max(0, Math.min(100, Math.round(report.clarity))) : null;
  const clarityAvg =
    reportClarity == null
      ? (prev?.clarityAvg ?? null)
      : prev?.clarityAvg == null
        ? reportClarity
        : Math.round(prev.clarityAvg * 0.6 + reportClarity * 0.4);

  const values = {
    userId,
    childId,
    totalSessions: (prev?.totalSessions ?? 0) + 1,
    lastSessionDate: todayUtc(),
    lastSummary: report.summary?.trim()?.slice(0, 300) || prev?.lastSummary || null,
    lastNextFocus: report.nextFocus?.trim()?.slice(0, 200) || prev?.lastNextFocus || null,
    targetSounds,
    masteredWords,
    wordStats,
    clarityAvg,
    updatedAt: new Date(),
  };

  const rows = await db
    .insert(speechConversationMemoryTable)
    .values(values)
    .onConflictDoUpdate({
      target: [speechConversationMemoryTable.userId, speechConversationMemoryTable.childId],
      set: {
        totalSessions: values.totalSessions,
        lastSessionDate: values.lastSessionDate,
        lastSummary: values.lastSummary,
        lastNextFocus: values.lastNextFocus,
        targetSounds: values.targetSounds,
        masteredWords: values.masteredWords,
        wordStats: values.wordStats,
        clarityAvg: values.clarityAvg,
        updatedAt: values.updatedAt,
      },
    })
    .returning();
  return rows[0] ?? null;
}
