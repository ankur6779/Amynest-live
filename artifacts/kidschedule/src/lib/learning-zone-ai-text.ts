import type { AuthFetchFn } from "@/lib/poll-result";
import {
  isNonEnglishLearningZoneText,
  validateLearningZonePayload,
} from "@workspace/learning-zone-english";
import type { LearningLoadMoreSection } from "@/hooks/use-learning-load-more";
import type { LoadMoreResponse } from "@/hooks/use-learning-load-more";

const MAX_SILENT_RETRIES = 1;

export { isNonEnglishLearningZoneText, validateLearningZonePayload };

export function guardLearningZoneUiText(text: string, fallback: string): string {
  if (isNonEnglishLearningZoneText(text)) return fallback;
  return text;
}

type LoadMoreBody = {
  childId?: number;
  count?: number;
  excludeIds?: string[];
  params?: Record<string, unknown>;
};

/**
 * Client safeguard: if AI load-more payload contains non-English strings,
 * silently retry once before surfacing to UI.
 */
export async function fetchLoadMoreWithEnglishGuard(
  section: LearningLoadMoreSection,
  authFetch: AuthFetchFn,
  body: LoadMoreBody,
  loadFn: (
    section: LearningLoadMoreSection,
    body: LoadMoreBody,
  ) => Promise<LoadMoreResponse | null>,
): Promise<LoadMoreResponse | null> {
  let attempt = 0;
  let last: LoadMoreResponse | null = null;

  while (attempt <= MAX_SILENT_RETRIES) {
    last = await loadFn(section, body);
    if (!last?.items) return last;

    const check = validateLearningZonePayload(last.items);
    if (check.valid) return last;

    attempt += 1;
    if (attempt > MAX_SILENT_RETRIES) break;
  }

  return last;
}

/** Filter string fields in arbitrary AI objects for display (best-effort). */
export function sanitizeLearningZoneAiObject<T>(value: T): T {
  if (typeof value === "string") {
    return (isNonEnglishLearningZoneText(value) ? "" : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeLearningZoneAiObject(v)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeLearningZoneAiObject(v);
    }
    return out as T;
  }
  return value;
}
