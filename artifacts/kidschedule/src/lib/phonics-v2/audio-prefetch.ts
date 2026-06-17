/**
 * Preload phonics clips for the active V2 lesson — uses existing prefetch APIs only.
 */
import {
  getCvcWordEntry,
  resolveGraphemeToAudioKey,
  type PhonicsAssetType,
} from "@workspace/phonics-sounds";
import {
  getPhonicsContentAudioUrl,
  getPhonicsStaticAudioUrl,
  prefetchPhonicsAudioKeys,
  prefetchPhonicsContentTexts,
} from "@/lib/phonics-static-audio";
import { getPhonicsContentCacheKey } from "@/lib/phonics-audio-map";
import { getPhonicsLetterCacheKey } from "@workspace/phonics-sounds";
import { warmLocalCacheFromUrl } from "@/lib/local-tts-cache";
import { isPhonicsManifestStrictlyValid } from "@/lib/phonics-manifest-validation";
import { shouldPhonicsPrefetch } from "@/lib/phonics-circuit-breaker";
import {
  phonicsTileCvcWordKey,
  phonicsTilePlaybackText,
  type PhonicsTileLike,
} from "@/lib/phonics-tile-playback";
import { isMobileStaticAudioDevice } from "@/lib/static-audio-edge";

/** Session eager-warm budget — higher than generic static-audio prefetch (4/8). */
export function getPhonicsSessionPrewarmLimit(): number {
  return isMobileStaticAudioDevice() ? 24 : 40;
}

export function prefetchCvcWordAudio(word: string): void {
  const entry = getCvcWordEntry(word.trim().toLowerCase());
  if (!entry) {
    prefetchPhonicsContentTexts([word.trim().toLowerCase()], "cvc");
    return;
  }
  const keys = entry.phonemes.map(
    (p) => resolveGraphemeToAudioKey(p) ?? p.trim().toLowerCase(),
  );
  prefetchPhonicsAudioKeys(keys);
  prefetchPhonicsContentTexts([entry.word], "cvc");
}

export function prefetchCvcWordList(words: string[]): void {
  const unique = [...new Set(words.map((w) => w.trim().toLowerCase()).filter(Boolean))];
  for (const w of unique.slice(0, 8)) {
    prefetchCvcWordAudio(w);
  }
}

export function prefetchFamilyAudio(familyWords: string[]): void {
  prefetchCvcWordList(familyWords);
}

/** Warm decodable story line clips (GCS library — no live TTS). */
export function prefetchStoryLines(lines: string[]): void {
  const unique = [...new Set(lines.map((l) => l.trim()).filter(Boolean))];
  prefetchPhonicsContentTexts(unique.slice(0, 12), "sentence");
}

/** Warm CVC clips for phonics games hub (feed / build / family). */
export function prefetchPhonicsGameWords(words: string[]): void {
  prefetchCvcWordList(words.slice(0, 8));
}

export type PhonicsTilePrefetchInput = {
  text: string;
  cvcWordKey?: string;
  phonemeKey?: string;
  phonicsContentType?: PhonicsAssetType;
};

/**
 * Warm one phonics tile clip into IndexedDB — safe on mount, touch-down, and hover.
 * CVC / word tiles must prefetch the whole-word library clip (not letter keys only).
 */
export function prefetchPhonicsTileAudio(input: PhonicsTilePrefetchInput): void {
  const word = input.cvcWordKey?.trim().toLowerCase();
  if (word) {
    prefetchCvcWordAudio(word);
    return;
  }

  const trimmed = (input.text ?? "").trim();
  if (!trimmed) return;

  if (input.phonicsContentType === "sentence" || /\s/.test(trimmed)) {
    prefetchPhonicsContentTexts([trimmed], input.phonicsContentType ?? "sentence");
    return;
  }

  prefetchPhonicsContentTexts([trimmed], "cvc");
  const letterKey = (input.phonemeKey ?? trimmed).trim().toLowerCase();
  if (letterKey) prefetchPhonicsAudioKeys([letterKey]);
}

/** Eager disk warm for visible session tiles — prioritised ahead of idle library sweep. */
export async function warmPhonicsSessionTiles(
  items: PhonicsTileLike[],
  opts?: { limit?: number },
): Promise<void> {
  if (!shouldPhonicsPrefetch() || !isPhonicsManifestStrictlyValid()) return;

  const limit = opts?.limit ?? 20;
  const tasks: Promise<void>[] = [];
  const seen = new Set<string>();

  const queue = (
    cacheKey: string,
    url: string | null,
  ): void => {
    if (!url || seen.has(cacheKey) || tasks.length >= limit) return;
    seen.add(cacheKey);
    tasks.push(warmLocalCacheFromUrl(cacheKey, url));
  };

  for (const item of items) {
    if (tasks.length >= limit) break;
    const wordKey = phonicsTileCvcWordKey(item);
    if (wordKey) {
      queue(
        getPhonicsContentCacheKey(wordKey, "cvc"),
        getPhonicsContentAudioUrl(wordKey, "cvc"),
      );
      const entry = getCvcWordEntry(wordKey);
      if (entry) {
        for (const p of entry.phonemes) {
          const audioKey = resolveGraphemeToAudioKey(p) ?? p.trim().toLowerCase();
          queue(
            getPhonicsLetterCacheKey(audioKey),
            getPhonicsStaticAudioUrl(audioKey),
          );
        }
      }
      continue;
    }

    const text = phonicsTilePlaybackText(item);
    if (!text) continue;
    if (item.type === "sentence" || item.type === "story" || /\s/.test(text)) {
      queue(
        getPhonicsContentCacheKey(text, "sentence"),
        getPhonicsContentAudioUrl(text, "sentence"),
      );
      continue;
    }

    queue(
      getPhonicsContentCacheKey(text, "cvc"),
      getPhonicsContentAudioUrl(text, "cvc"),
    );
    const letterKey = (item.phoneme ?? text).trim().toLowerCase();
    queue(
      getPhonicsLetterCacheKey(letterKey),
      getPhonicsStaticAudioUrl(letterKey),
    );
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }
}

/** Warm decodable story lines for the active reader (current + next lines first). */
export async function warmStoryLinesEager(
  lines: string[],
  opts?: { limit?: number },
): Promise<void> {
  if (!shouldPhonicsPrefetch() || !isPhonicsManifestStrictlyValid()) return;
  const unique = [...new Set(lines.map((l) => l.trim()).filter(Boolean))];
  const limit = opts?.limit ?? 6;
  await Promise.all(
    unique.slice(0, limit).map((text) => {
      const url = getPhonicsContentAudioUrl(text, "sentence");
      if (!url) return Promise.resolve();
      return warmLocalCacheFromUrl(getPhonicsContentCacheKey(text, "sentence"), url);
    }),
  );
  if (unique.length > limit) {
    prefetchStoryLines(unique.slice(limit));
  }
}
