/**
 * Defensive parsers for Gaming Hub localStorage — never throw on corrupt data.
 */
import type { GameCategory } from "@/lib/games";
import type { LedgerEntry } from "@/lib/rewards";
import type { PlayLogEntry, SkillRecord } from "@/lib/gaming-wallet-storage";

export function sanitizePlayLog(raw: unknown): PlayLogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is PlayLogEntry =>
      !!e &&
      typeof e === "object" &&
      typeof (e as PlayLogEntry).id === "string" &&
      typeof (e as PlayLogEntry).date === "string" &&
      typeof (e as PlayLogEntry).pointsEarned === "number" &&
      typeof (e as PlayLogEntry).perfect === "boolean",
  );
}

export function sanitizeUnlockedGames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.length > 0);
}

export function sanitizeLeaderboardLog(
  raw: unknown,
): { gameId: string; score: number; total: number; ratio: number; date: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is { gameId: string; score: number; total: number; ratio: number; date: string } =>
      !!e &&
      typeof e === "object" &&
      typeof (e as { gameId?: string }).gameId === "string" &&
      typeof (e as { date?: string }).date === "string" &&
      typeof (e as { score?: number }).score === "number" &&
      typeof (e as { total?: number }).total === "number" &&
      typeof (e as { ratio?: number }).ratio === "number",
  );
}

const SKILL_CATEGORIES: GameCategory[] = [
  "brain",
  "memory",
  "math",
  "focus",
  "creativity",
  "behavior",
  "action",
  "puzzle",
];

function emptySkillRecord(): SkillRecord {
  return {
    brain: { attempts: 0, correct: 0, plays: 0 },
    memory: { attempts: 0, correct: 0, plays: 0 },
    math: { attempts: 0, correct: 0, plays: 0 },
    focus: { attempts: 0, correct: 0, plays: 0 },
    creativity: { attempts: 0, correct: 0, plays: 0 },
    behavior: { attempts: 0, correct: 0, plays: 0 },
    action: { attempts: 0, correct: 0, plays: 0 },
    puzzle: { attempts: 0, correct: 0, plays: 0 },
  };
}

export function sanitizeSkillRecord(raw: unknown): SkillRecord {
  const base = emptySkillRecord();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  for (const cat of SKILL_CATEGORIES) {
    const s = (raw as Record<string, unknown>)[cat];
    if (!s || typeof s !== "object") continue;
    const row = s as { attempts?: unknown; correct?: unknown; plays?: unknown };
    base[cat] = {
      attempts:
        typeof row.attempts === "number" && Number.isFinite(row.attempts)
          ? Math.max(0, Math.floor(row.attempts))
          : 0,
      correct:
        typeof row.correct === "number" && Number.isFinite(row.correct)
          ? Math.max(0, Math.floor(row.correct))
          : 0,
      plays:
        typeof row.plays === "number" && Number.isFinite(row.plays)
          ? Math.max(0, Math.floor(row.plays))
          : 0,
    };
  }
  return base;
}

export function sanitizeLedger(raw: unknown): LedgerEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is LedgerEntry =>
      !!e &&
      typeof e === "object" &&
      typeof (e as LedgerEntry).date === "string" &&
      typeof (e as LedgerEntry).childName === "string" &&
      typeof (e as LedgerEntry).activity === "string" &&
      typeof (e as LedgerEntry).points === "number",
  );
}
