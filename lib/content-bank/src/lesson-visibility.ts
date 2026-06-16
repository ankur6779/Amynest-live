import { contentBankActivityId, parseContentBankActivityId } from "./unlock.js";
import type { FreshLessonProgressState } from "./fresh-lesson-state.js";
import { emptyFreshLessonState } from "./fresh-lesson-state.js";

/** Stored under learning_progress.section_progress.__contentBankLessons */
export const VISIBILITY_STORAGE_KEY = "__contentBankLessons";

export interface ContentBankLessonVisibility {
  /** lessonId → ISO timestamp of last view */
  viewed: Record<string, string>;
}

export interface ContentBankLessonStorage extends ContentBankLessonVisibility {
  currentFreshLessonId?: string | null;
  currentFreshLessonAssignedAt?: string | null;
  freshLessonSequence?: string[];
}

export function emptyLessonVisibility(): ContentBankLessonVisibility {
  return { viewed: {} };
}

export function extractCompletedSmartStudyIds(completedActivityIds: string[]): Set<string> {
  const out = new Set<string>();
  for (const id of completedActivityIds) {
    const parsed = parseContentBankActivityId(id);
    if (parsed?.category === "smart-study") out.add(parsed.itemId);
  }
  return out;
}

export function readLessonVisibility(
  sectionProgress: unknown,
): ContentBankLessonVisibility {
  return readContentBankLessonStorage(sectionProgress);
}

export function readContentBankLessonStorage(
  sectionProgress: unknown,
): ContentBankLessonStorage {
  if (!sectionProgress || typeof sectionProgress !== "object") {
    return emptyLessonVisibility();
  }
  const blob = (sectionProgress as Record<string, unknown>)[VISIBILITY_STORAGE_KEY];
  if (!blob || typeof blob !== "object") return emptyLessonVisibility();
  const viewedRaw = (blob as Record<string, unknown>).viewed;
  const viewed: Record<string, string> = {};
  if (viewedRaw && typeof viewedRaw === "object") {
    for (const [k, v] of Object.entries(viewedRaw as Record<string, unknown>)) {
      if (typeof v === "string" && v.length > 0) viewed[k] = v;
    }
  }
  const seqRaw = (blob as Record<string, unknown>).freshLessonSequence;
  const freshLessonSequence = Array.isArray(seqRaw)
    ? seqRaw.filter((x): x is string => typeof x === "string")
    : undefined;
  const currentFreshLessonId = (blob as Record<string, unknown>).currentFreshLessonId;
  const currentFreshLessonAssignedAt = (blob as Record<string, unknown>).currentFreshLessonAssignedAt;
  return {
    viewed,
    freshLessonSequence,
    currentFreshLessonId: typeof currentFreshLessonId === "string" ? currentFreshLessonId : null,
    currentFreshLessonAssignedAt:
      typeof currentFreshLessonAssignedAt === "string" ? currentFreshLessonAssignedAt : null,
  };
}

export function readFreshLessonState(sectionProgress: unknown): FreshLessonProgressState {
  const blob = readContentBankLessonStorage(sectionProgress);
  return {
    currentFreshLessonId: blob.currentFreshLessonId ?? null,
    currentFreshLessonAssignedAt: blob.currentFreshLessonAssignedAt ?? null,
    freshLessonSequence: blob.freshLessonSequence ?? [],
  };
}

export function mergeSectionProgressStorage(
  sectionProgress: Record<string, unknown>,
  storage: ContentBankLessonStorage,
): Record<string, unknown> {
  return {
    ...sectionProgress,
    [VISIBILITY_STORAGE_KEY]: storage,
  };
}

export function mergeSectionProgressVisibility(
  sectionProgress: Record<string, unknown>,
  visibility: ContentBankLessonVisibility,
  fresh?: FreshLessonProgressState,
): Record<string, unknown> {
  const prev = readContentBankLessonStorage(sectionProgress);
  return mergeSectionProgressStorage(sectionProgress, {
    ...prev,
    viewed: visibility.viewed,
    ...(fresh
      ? {
          currentFreshLessonId: fresh.currentFreshLessonId,
          currentFreshLessonAssignedAt: fresh.currentFreshLessonAssignedAt,
          freshLessonSequence: fresh.freshLessonSequence,
        }
      : {}),
  });
}

export function mergeFreshLessonState(
  sectionProgress: Record<string, unknown>,
  visibility: ContentBankLessonVisibility,
  fresh: FreshLessonProgressState,
): Record<string, unknown> {
  return mergeSectionProgressVisibility(sectionProgress, visibility, fresh);
}

export function recordLessonViewed(
  visibility: ContentBankLessonVisibility,
  lessonId: string,
  ts: string,
): ContentBankLessonVisibility {
  return {
    viewed: { ...visibility.viewed, [lessonId]: ts },
  };
}

export function smartStudyActivityId(lessonId: string): string {
  return contentBankActivityId("smart-study", lessonId);
}
