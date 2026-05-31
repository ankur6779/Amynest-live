/**
 * Curated phonics library playback — GCS pre-generated assets only.
 * Never calls ElevenLabs or OpenAI at runtime.
 *
 * Fallback order: global cache → IndexedDB → GCS manifest → fail safe (no wrong clip).
 */

import {
  getAllPhonicsAudioKeys,
  getPhonicsLetterCacheKey,
  resolveLetterClipCatalogKey,
  resolvePhonicsAudioKey,
  resolvePhonicsSequenceKeys,
  type PhonicsAssetType,
} from "@workspace/phonics-sounds";
import { getGlobalCachedAudioForPlayback } from "@/lib/global-audio-cache";
import { getLocalCachedAudioUrl, warmLocalCacheFromUrl } from "@/lib/local-tts-cache";
import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";
import { logAudioHealthSuccess } from "@/lib/audio-health";
import { recordTtsUserGesture } from "@/lib/tts-guard";
import { logPhonicsPlaybackFailure } from "@/lib/phonics-playback-fallback";
import {
  shouldPhonicsPrefetch,
  shouldPhonicsUseCache,
} from "@/lib/phonics-circuit-breaker";
import { isPhonicsManifestStrictlyValid } from "@/lib/phonics-manifest-validation";
import {
  getPhonicsContentCacheKey,
  listPhonicsLibraryPrewarmItems,
  lookupPhonicsContentUrl,
  lookupPhonicsLetterUrl,
  prefetchPhonicsLibraryUrls,
  reportPhonicsLibraryMissing,
} from "@/lib/phonics-audio-map";
import {
  playPhonicsUrl,
  stopPhonicsPlayback,
  isPhonicsPlaying,
} from "@/lib/phonics-player";
import {
  playCatalogPreparedUrl,
  resolvePhonicsCatalogPhrase,
  shouldBypassPhonicsSpellingLibraries,
} from "@/lib/unified-catalog-playback";
import { lookupStaticAudioUrl } from "@/lib/static-audio";

export { getAllPhonicsAudioKeys, resolvePhonicsAudioKey, resolvePhonicsSequenceKeys };
export { stopPhonicsPlayback, isPhonicsPlaying };

const PHONICS_PREWARM_BATCH_SIZE = 5;
const PHONICS_PREWARM_BATCH_GAP_MS = 40;

let libraryPrewarmStarted = false;

/** HTTPS URL for a letter/digraph phoneme clip — empty when manifest entry missing (no fallback). */
export function getPhonicsStaticAudioUrl(audioKey: string): string {
  const fromLibrary = lookupPhonicsLetterUrl(audioKey);
  if (fromLibrary) return fromLibrary;

  const catalogKey = resolveLetterClipCatalogKey(audioKey);
  if (catalogKey) reportPhonicsLibraryMissing(catalogKey, `letter:${audioKey}`);

  return "";
}

/** HTTPS URL for CVC word, sight word, sentence, or quiz — empty when missing (no fallback). */
export function getPhonicsContentAudioUrl(
  text: string,
  preferredType?: PhonicsAssetType,
): string {
  const fromLibrary = lookupPhonicsContentUrl(text, preferredType);
  if (fromLibrary) return fromLibrary;

  const type = preferredType ?? "cvc";
  reportPhonicsLibraryMissing(`${type}:${text}`, "content");
  return "";
}

export function prefetchPhonicsAudioKeys(keys: string[]): void {
  if (!shouldPhonicsPrefetch() || !isPhonicsManifestStrictlyValid()) return;
  const unique = [...new Set(keys.map((k) => k.trim().toLowerCase()).filter(Boolean))];
  for (const key of unique) {
    const url = getPhonicsStaticAudioUrl(key);
    if (!url) continue;
    void warmLocalCacheFromUrl(getPhonicsLetterCacheKey(key), url);
  }
}

export function prefetchPhonicsContentTexts(
  texts: string[],
  preferredType?: PhonicsAssetType,
): void {
  if (!shouldPhonicsPrefetch() || !isPhonicsManifestStrictlyValid()) return;
  for (const text of texts) {
    const url = getPhonicsContentAudioUrl(text, preferredType);
    if (!url) continue;
    void warmLocalCacheFromUrl(getPhonicsContentCacheKey(text, preferredType), url);
  }
}

async function prewarmPhonicsLibraryBatched(items: ReturnType<typeof listPhonicsLibraryPrewarmItems>): Promise<void> {
  prefetchPhonicsLibraryUrls(items.map((item) => item.url));
  for (let i = 0; i < items.length; i += PHONICS_PREWARM_BATCH_SIZE) {
    if (!shouldPhonicsPrefetch()) break;
    const batch = items.slice(i, i + PHONICS_PREWARM_BATCH_SIZE);
    await Promise.all(
      batch.map((item) => warmLocalCacheFromUrl(item.localCacheKey, item.url)),
    );
    if (i + PHONICS_PREWARM_BATCH_SIZE < items.length) {
      await new Promise((r) => setTimeout(r, PHONICS_PREWARM_BATCH_GAP_MS));
    }
  }
}

/** Prewarm GCS phonics library into IndexedDB — batched to protect low-end devices. */
export function prefetchEntirePhonicsLibrary(): void {
  if (!shouldPhonicsPrefetch() || !isPhonicsManifestStrictlyValid()) return;
  if (libraryPrewarmStarted) return;
  libraryPrewarmStarted = true;

  const items = listPhonicsLibraryPrewarmItems();
  if (items.length === 0) return;

  const run = () => {
    void prewarmPhonicsLibraryBatched(items).catch(() => undefined);
  };

  if (typeof window !== "undefined" && window.requestIdleCallback) {
    window.requestIdleCallback(run, { timeout: 2000 });
  } else if (typeof window !== "undefined") {
    window.setTimeout(run, 120);
  } else {
    run();
  }
}

export function prefetchAllPhonicsAudio(): void {
  prefetchEntirePhonicsLibrary();
}

/** Test-only reset */
export function _resetPhonicsStaticPrewarmForTests(): void {
  libraryPrewarmStarted = false;
}

export type PlayPhonicsStaticOptions = {
  waitUntilEnd?: boolean;
  playbackRate?: number;
  isCancelled?: () => boolean;
  blendSequence?: boolean;
};

export type PlayPhonicsStaticResult =
  | { ok: true; audioKey: string; url?: string }
  | { ok: false; audioKey: string; error: string };

type ResolvedPlayUrl = { url: string; cleanup?: () => void };

async function resolveBestPlayUrl(
  cacheKey: string,
  networkUrl: string,
): Promise<ResolvedPlayUrl> {
  if (shouldPhonicsUseCache()) {
    const warmed = getGlobalCachedAudioForPlayback(cacheKey);
    if (warmed?.src) return { url: warmed.src };

    const blobUrl = await getLocalCachedAudioUrl(cacheKey);
    if (blobUrl) {
      return { url: blobUrl, cleanup: () => URL.revokeObjectURL(blobUrl) };
    }
  }

  if (!networkUrl) {
    return { url: "" };
  }
  return { url: networkUrl };
}

function isCancelledError(error: string): boolean {
  return error === "phonics_superseded" || error === "phonics_cancelled";
}

async function playUrlClip(
  label: string,
  networkUrl: string,
  cacheKey: string,
  source: string,
  options?: Pick<PlayPhonicsStaticOptions, "isCancelled" | "playbackRate">,
): Promise<PlayPhonicsStaticResult> {
  if (!label.trim()) return { ok: false, audioKey: label, error: "phonics_empty_key" };
  if (options?.isCancelled?.()) {
    return { ok: false, audioKey: label, error: "phonics_cancelled" };
  }

  recordTtsUserGesture();

  if (shouldBypassPhonicsSpellingLibraries()) {
    const phrase = resolvePhonicsCatalogPhrase(label);
    const catalog = await playCatalogPreparedUrl(phrase, {
      playbackRate: options?.playbackRate,
      isCancelled: options?.isCancelled,
      source,
    });
    if (catalog.ok) {
      logAudioHealthSuccess({ layer: "static", fallbackUsed: false });
      return { ok: true, audioKey: label, url: lookupStaticAudioUrl(phrase, "phonics") ?? undefined };
    }
    if (isCancelledError(catalog.error ?? "")) {
      return { ok: false, audioKey: label, error: "phonics_cancelled" };
    }
    return { ok: false, audioKey: label, error: catalog.error ?? "phonics_library_missing" };
  }

  const resolved = await resolveBestPlayUrl(cacheKey, networkUrl);
  if (!resolved.url) {
    return { ok: false, audioKey: label, error: "phonics_library_missing" };
  }

  logAmyVoiceDiag("phonics_library_play", { label, url: resolved.url, source });

  const result = await playPhonicsUrl(resolved.url, {
    label,
    playbackRate: options?.playbackRate,
    isCancelled: options?.isCancelled,
    cleanup: resolved.cleanup,
  });

  if (result.ok) {
    if (shouldPhonicsUseCache()) {
      void warmLocalCacheFromUrl(cacheKey, networkUrl || resolved.url);
    }
    logAudioHealthSuccess({ layer: "static", fallbackUsed: false });
    return { ok: true, audioKey: label, url: resolved.url };
  }

  if (isCancelledError(result.error)) {
    return { ok: false, audioKey: label, error: "phonics_cancelled" };
  }

  logPhonicsPlaybackFailure(label, result.error);
  return { ok: false, audioKey: label, error: result.error };
}

async function playStaticKeyClip(
  audioKey: string,
  source: string,
  options?: Pick<PlayPhonicsStaticOptions, "isCancelled" | "playbackRate">,
): Promise<PlayPhonicsStaticResult> {
  const key = (audioKey ?? "").trim().toLowerCase();
  const url = getPhonicsStaticAudioUrl(key);
  return playUrlClip(key, url, getPhonicsLetterCacheKey(key), source, options);
}

/** Play pre-generated word/sentence/quiz audio from the library. */
export async function playPhonicsContentAudio(
  text: string,
  options?: PlayPhonicsStaticOptions & { contentType?: PhonicsAssetType },
): Promise<PlayPhonicsStaticResult> {
  const trimmed = (text ?? "").trim();
  const url = getPhonicsContentAudioUrl(trimmed, options?.contentType);
  const cacheKey = getPhonicsContentCacheKey(trimmed, options?.contentType);
  return playUrlClip(trimmed, url, cacheKey, "phonics-content", options);
}

export async function playBlendPhonemeClip(
  audioKey: string,
  options?: Pick<PlayPhonicsStaticOptions, "isCancelled" | "playbackRate">,
): Promise<PlayPhonicsStaticResult> {
  return playStaticKeyClip(audioKey, "cvc-blend-phoneme", options);
}

export async function playPhonicsStaticAudio(
  audioKey: string,
  options?: PlayPhonicsStaticOptions,
): Promise<PlayPhonicsStaticResult> {
  return playStaticKeyClip(audioKey, "phonics-library", options);
}

export async function playPhonicsSequence(
  word: string,
  options?: PlayPhonicsStaticOptions & { gapMs?: number },
): Promise<{ ok: boolean; keys: string[]; error?: string }> {
  const keys = resolvePhonicsSequenceKeys(word);
  if (keys.length === 0) {
    return { ok: false, keys, error: "phonics_sequence_empty" };
  }

  prefetchPhonicsAudioKeys(keys);

  const gap = options?.gapMs ?? 120;
  for (let i = 0; i < keys.length; i++) {
    if (options?.isCancelled?.()) {
      return { ok: false, keys, error: "phonics_cancelled" };
    }
    const result = await playPhonicsStaticAudio(keys[i]!, {
      ...options,
      waitUntilEnd: true,
    });
    if (!result.ok) {
      return { ok: false, keys, error: result.error };
    }
    if (i < keys.length - 1) {
      await new Promise((r) => setTimeout(r, gap));
    }
  }

  return { ok: true, keys };
}
