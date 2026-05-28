import type { LearningLoadMoreSection } from "@/hooks/use-learning-load-more";
import type { AuthFetchFn } from "@/lib/poll-result";
import {
  scheduleLearningZoneAudioPrewarm,
  type LearningZoneAudioModule,
} from "@/lib/learning-zone-audio-prewarm";

const MAX_PREFETCH_TEXTS = 12;

type LoadMoreItems = {
  questions?: unknown[];
  words?: unknown[];
  tasks?: unknown[];
  tricks?: unknown[];
};

const SECTION_TO_MODULE: Partial<Record<LearningLoadMoreSection, LearningZoneAudioModule>> = {
  smart_math_tricks: "smart_math_tricks",
  spelling: "spelling",
  phonics: "phonics",
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
      if (item && typeof item === "object") {
        const row = item as { audioText?: string; trick?: string; title?: string };
        push(row.audioText);
        push(row.trick);
        push(row.title);
        const pq = (item as { practiceQ?: { question?: string; hint?: string } }).practiceQ;
        push(pq?.question);
        push(pq?.hint);
      }
    }
    return out.slice(0, MAX_PREFETCH_TEXTS);
  }

  if (section === "spelling" || section === "phonics") {
    for (const item of items.words ?? []) {
      if (typeof item === "string") {
        push(item);
      } else if (item && typeof item === "object" && "word" in item) {
        const row = item as { word?: string; hint?: string; chunks?: string[] };
        push(row.word);
        push(row.hint);
        for (const c of row.chunks ?? []) push(c);
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

export function prefetchLoadMoreAudio(
  authFetch: AuthFetchFn,
  section: LearningLoadMoreSection,
  items: LoadMoreItems,
  params: Record<string, unknown> = {},
): void {
  const texts = collectLoadMoreTtsTexts(section, items);
  if (texts.length === 0) return;

  const module = SECTION_TO_MODULE[section];
  if (module) {
    scheduleLearningZoneAudioPrewarm(authFetch, {
      module,
      texts,
      sequenceTexts: texts,
      mode: section === "phonics" ? "phonics" : "default",
      difficulty: String(params.difficulty ?? ""),
      ageGroup: String(params.age ?? params.ageBand ?? ""),
      stateKey: `${section}:${JSON.stringify(params)}`,
    });
    return;
  }

  // Non-core learning sections keep legacy fire-and-forget pregenerate only.
  void import("@/lib/pregenerate-tts").then(({ pregenerateTtsTexts }) => {
    pregenerateTtsTexts(authFetch, texts, "default");
  });
}
