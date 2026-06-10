/**
 * Amy Audio Lessons — prefetch on page open (resume, daily pick, quick play, age recs).
 * Static catalog + IndexedDB + optional live TTS cache — batched, capped for low-end devices.
 */

import type { AmyHomeState } from "@/lib/amy-signals";
import type { AuthFetchFn } from "@/lib/poll-result";
import type { LangCode, Lesson } from "@/lib/audio-lessons";
import { getLessonById, getLessonText } from "@/lib/audio-lessons";
import { AMY_TTS_MODEL_ID, AMY_TTS_VOICE_ID } from "@workspace/static-audio/browser";
import { prefetchLessonParagraph } from "@/lib/amy-voice-pipeline-optimizer";
import { prepareAmyLessonParagraphSpeech } from "@/lib/amy-speech-mode";
import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";
import { createAudioIdentity } from "@/lib/lesson-audio-identity";
import { preloadStaticPhrases } from "@/lib/static-audio";

/** Match player-sheet voice — lesson narration uses ElevenLabs Amy EN. */
export { AMY_TTS_VOICE_ID as LESSON_VOICE_ID, AMY_TTS_MODEL_ID as LESSON_MODEL_ID } from "@workspace/static-audio/browser";

const MAX_WARM_LESSONS = 3;
const MAX_PARAGRAPHS_PER_LESSON = 4;
const BATCH_GAP_MS = 60;

export type AudioLessonsWarmResumeTarget = {
  lesson: Lesson;
  paragraphIdx: number;
};

export type AudioLessonsPageWarmParams = {
  lang?: LangCode;
  amyHome: AmyHomeState;
  resumeTarget: AudioLessonsWarmResumeTarget | null;
  ageRecommendationIds?: readonly string[];
};

let lastWarmKey = "";

function runIdle(task: () => void): void {
  if (typeof window !== "undefined" && window.requestIdleCallback) {
    window.requestIdleCallback(task, { timeout: 1500 });
    return;
  }
  if (typeof window !== "undefined") {
    window.setTimeout(task, 120);
    return;
  }
  task();
}

function todaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10_000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/** Paragraph indices to warm — resume point + following lines; include intro when resuming mid-lesson. */
export function paragraphIndicesToWarm(
  totalParagraphs: number,
  startParagraphIdx: number,
  maxParagraphs = MAX_PARAGRAPHS_PER_LESSON,
): number[] {
  if (totalParagraphs <= 0) return [];
  const start = Math.max(0, Math.min(startParagraphIdx, totalParagraphs - 1));
  const indices: number[] = [];
  for (let i = 0; i < maxParagraphs && start + i < totalParagraphs; i++) {
    indices.push(start + i);
  }
  if (start > 0 && !indices.includes(0)) {
    indices.unshift(0);
  }
  return [...new Set(indices)].slice(0, maxParagraphs);
}

/** Priority: resume → quick play → daily pick → age recommendations. */
export function collectAudioLessonsWarmTargets(
  params: AudioLessonsPageWarmParams,
): AudioLessonsWarmResumeTarget[] {
  const seen = new Set<string>();
  const targets: AudioLessonsWarmResumeTarget[] = [];

  const push = (lessonId: string | null | undefined, paragraphIdx = 0) => {
    const id = lessonId?.trim();
    if (!id || seen.has(id)) return;
    const lesson = getLessonById(id);
    if (!lesson) return;
    seen.add(id);
    targets.push({ lesson, paragraphIdx: Math.max(0, paragraphIdx) });
  };

  if (params.resumeTarget) {
    push(params.resumeTarget.lesson.id, params.resumeTarget.paragraphIdx);
  }
  if (params.amyHome.quickPlay?.lessonId) {
    push(params.amyHome.quickPlay.lessonId, 0);
  }
  if (params.amyHome.dailyPick?.lessonId) {
    push(params.amyHome.dailyPick.lessonId, 0);
  }
  for (const id of params.ageRecommendationIds ?? []) {
    push(id, 0);
  }

  return targets.slice(0, MAX_WARM_LESSONS);
}

async function warmLessonParagraphs(
  authFetch: AuthFetchFn,
  lesson: Lesson,
  lang: LangCode,
  startParagraphIdx: number,
): Promise<void> {
  const paragraphs = getLessonText(lesson, lang).paragraphs;
  const indices = paragraphIndicesToWarm(paragraphs.length, startParagraphIdx);
  if (indices.length === 0) return;

  const staticTexts: string[] = [];

  for (const idx of indices) {
    const text = paragraphs[idx]?.trim();
    if (!text) continue;

    const identity = createAudioIdentity(lesson.id, idx, text);
    prefetchLessonParagraph(identity, authFetch, AMY_TTS_VOICE_ID, AMY_TTS_MODEL_ID);
    staticTexts.push(text);

    if (BATCH_GAP_MS > 0) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_GAP_MS));
    }
  }

  if (staticTexts.length > 0) {
    const mode = prepareAmyLessonParagraphSpeech(staticTexts[0]!).pipelineMode;
    preloadStaticPhrases(staticTexts, mode, staticTexts.length);
  }
}

/**
 * Prefetch likely lesson paragraphs when the Audio Lessons page opens or age detail updates.
 * Safe to call on every render cycle — dedupes by day + target lesson set.
 */
export function warmAudioLessonsOnPageOpen(
  authFetch: AuthFetchFn,
  params: AudioLessonsPageWarmParams,
): void {
  if (typeof window === "undefined") return;

  const lang = params.lang ?? "en";
  const targets = collectAudioLessonsWarmTargets(params);
  if (targets.length === 0) return;

  const warmKey = [
    todaySeed(),
    lang,
    targets.map((t) => `${t.lesson.id}:${t.paragraphIdx}`).join("|"),
  ].join(":");
  if (warmKey === lastWarmKey) return;
  lastWarmKey = warmKey;

  logAmyVoiceDiag("audio_lessons_page_warmup", {
    lessonCount: targets.length,
    lessonIds: targets.map((t) => t.lesson.id),
  });

  runIdle(() => {
    void (async () => {
      for (const target of targets) {
        await warmLessonParagraphs(authFetch, target.lesson, lang, target.paragraphIdx);
      }
    })();
  });
}

/** Test-only reset */
export function _resetAudioLessonsWarmupForTests(): void {
  lastWarmKey = "";
}
