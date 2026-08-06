/**
 * Practice / mission completion counter for v2_practice_day3.
 */

import { daysSinceCohortDay0 } from "./dates";
import { V2_ANALYTICS_PRACTICE_LOG_KEY } from "./storage-keys";

export type PracticeCompletionEntry = {
  missionId: string;
  dateKey: string;
  completedAt: string;
};

type PracticeLog = {
  completions: PracticeCompletionEntry[];
};

function readLog(): PracticeLog {
  if (typeof localStorage === "undefined") return { completions: [] };
  try {
    const raw = localStorage.getItem(V2_ANALYTICS_PRACTICE_LOG_KEY);
    if (!raw) return { completions: [] };
    const parsed = JSON.parse(raw) as Partial<PracticeLog>;
    if (!Array.isArray(parsed.completions)) return { completions: [] };
    return {
      completions: parsed.completions.filter(
        (c): c is PracticeCompletionEntry =>
          !!c &&
          typeof c.missionId === "string" &&
          typeof c.dateKey === "string" &&
          typeof c.completedAt === "string",
      ),
    };
  } catch {
    return { completions: [] };
  }
}

function writeLog(log: PracticeLog): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(V2_ANALYTICS_PRACTICE_LOG_KEY, JSON.stringify(log));
  } catch {
    /* ignore */
  }
}

export function recordPracticeCompletion(entry: PracticeCompletionEntry): PracticeLog {
  const log = readLog();
  log.completions.push(entry);
  writeLog(log);
  return log;
}

/** Completions on cohort days 0–3 inclusive. */
export function countPracticesInDay3Window(
  cohortDay0: string,
  log: PracticeLog = readLog(),
): number {
  return log.completions.filter((c) => {
    const offset = daysSinceCohortDay0(cohortDay0, c.dateKey);
    return offset != null && offset >= 0 && offset <= 3;
  }).length;
}

export function clearPracticeLogForTests(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(V2_ANALYTICS_PRACTICE_LOG_KEY);
  } catch {
    /* ignore */
  }
}
