import type { LearningLoadMoreSection } from "@/hooks/use-learning-load-more";
import type { AuthFetchFn } from "@/lib/poll-result";
import { pregenerateTtsTexts } from "@/lib/pregenerate-tts";

const MAX_PREFETCH_TEXTS = 8;

type LoadMoreItems = {
  questions?: unknown[];
  words?: unknown[];
  tasks?: unknown[];
  tricks?: unknown[];
};

/** Collect speakable strings from load-more items (client-side mirror of server seed). */
export function collectLoadMoreTtsTexts(
  section: LearningLoadMoreSection,
  items: LoadMoreItems,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (raw: unknown) => {
    if (typeof raw !== "string") return;
    const text = raw.trim();
    if (text.length < 2 || seen.has(text)) return;
    seen.add(text);
    out.push(text);
  };

  if (section === "smart_math_tricks") {
    for (const item of items.tricks ?? []) {
      if (item && typeof item === "object" && "audioText" in item) {
        push((item as { audioText?: string }).audioText);
      }
    }
    return out.slice(0, MAX_PREFETCH_TEXTS);
  }

  if (section === "spelling" || section === "phonics") {
    for (const item of items.words ?? []) {
      if (typeof item === "string") {
        push(item);
      } else if (item && typeof item === "object" && "word" in item) {
        push((item as { word?: string }).word);
      }
    }
    return out.slice(0, MAX_PREFETCH_TEXTS);
  }

  if (section === "smart_study" || section === "olympiad") {
    for (const item of items.questions ?? []) {
      if (!item || typeof item !== "object") continue;
      const row = item as { q?: string; question?: string };
      push(row.q ?? row.question);
    }
    return out.slice(0, MAX_PREFETCH_TEXTS);
  }

  if (section === "life_skills") {
    for (const item of items.tasks ?? []) {
      if (!item || typeof item !== "object") continue;
      const row = item as {
        title?: { en?: string };
        description?: { en?: string };
      };
      push(row.title?.en);
    }
    return out.slice(0, MAX_PREFETCH_TEXTS);
  }

  return out;
}

/**
 * Safe pattern: warm TTS only for items the user just loaded (not on hub open).
 * Fire-and-forget; phonics CVC words use default Amy TTS (not static phoneme clips).
 */
export function prefetchLoadMoreAudio(
  authFetch: AuthFetchFn,
  section: LearningLoadMoreSection,
  items: LoadMoreItems,
): void {
  const texts = collectLoadMoreTtsTexts(section, items);
  if (texts.length === 0) return;
  pregenerateTtsTexts(authFetch, texts, "default");
}
