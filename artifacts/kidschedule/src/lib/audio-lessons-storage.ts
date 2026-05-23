import type { AgeNavGroup } from "./audio-lessons-nav";

export const RESUME_KEY = "amynest_audio_resume_v1";
export const LAST_AGE_KEY = "amynest_audio_last_age_v1";
export const LAST_LESSON_KEY = "amynest_audio_last_lesson_v1";
export const LAST_PLAYED_AT_KEY = "amynest_audio_last_played_at_v1";
export const SKIPS_KEY = "amynest_audio_skips_v1";
export const PREGENERATE_SESSION_KEY = "amynest_audio_pregenerate_v1";

export type ResumeMap = Record<string, number>;

export function loadResume(): ResumeMap {
  try {
    return JSON.parse(localStorage.getItem(RESUME_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveResume(map: ResumeMap): void {
  localStorage.setItem(RESUME_KEY, JSON.stringify(map));
}

export function loadLastAgeGroup(): AgeNavGroup | null {
  try {
    const raw = localStorage.getItem(LAST_AGE_KEY);
    if (!raw) return null;
    return raw as AgeNavGroup;
  } catch {
    return null;
  }
}

export function saveLastAgeGroup(age: AgeNavGroup): void {
  try {
    localStorage.setItem(LAST_AGE_KEY, age);
  } catch {
    /* quota / private mode */
  }
}

export function saveLastLessonId(lessonId: string): void {
  try {
    localStorage.setItem(LAST_LESSON_KEY, lessonId);
    localStorage.setItem(LAST_PLAYED_AT_KEY, String(Date.now()));
  } catch {
    /* quota */
  }
}

export function loadLastPlayedAt(): number | null {
  try {
    const raw = localStorage.getItem(LAST_PLAYED_AT_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function loadRecentSkips(): string[] {
  try {
    const raw = localStorage.getItem(SKIPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function recordLessonSkip(skippedLessonId: string): void {
  try {
    const prev = loadRecentSkips().filter((id) => id !== skippedLessonId);
    const next = [skippedLessonId, ...prev].slice(0, 10);
    localStorage.setItem(SKIPS_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

export function loadLastLessonId(): string | null {
  try {
    return localStorage.getItem(LAST_LESSON_KEY);
  } catch {
    return null;
  }
}

export function shouldSkipPregenerate(age: string, lang: string): boolean {
  try {
    const raw = sessionStorage.getItem(PREGENERATE_SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { age?: string; lang?: string };
    return parsed.age === age && parsed.lang === lang;
  } catch {
    return false;
  }
}

export function markPregenerateDone(age: string, lang: string): void {
  try {
    sessionStorage.setItem(PREGENERATE_SESSION_KEY, JSON.stringify({ age, lang }));
  } catch {
    /* quota / private mode */
  }
}
