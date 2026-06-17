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
import { getLocalCachedAudioUrl, warmLocalCacheFromUrl } from "@/lib/local-tts-cache";
import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";
import { recordPhonicsPlayback } from "@/lib/phonics-prewarm-telemetry";
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
import { lookupStaticAudioUrlStrict } from "@/lib/static-audio";

export { getAllPhonicsAudioKeys, resolvePhonicsAudioKey, resolvePhonicsSequenceKeys };
export { stopPhonicsPlayback, isPhonicsPlaying };

const PHONICS_PREWARM_BATCH_SIZE = 5;
const PHONICS_PREWARM_BATCH_GAP_MS = 40;

let libraryPrewarmStarted = false;

/**
 * Hard cutover switch for ElevenLabs-only phonics. Phonics resolves ONLY from
 * the certified ElevenLabs library manifest and never touches the static-audio
 * catalog (which historically held OpenAI clips).
 *
 * Default ON as of the Phase G regeneration + full-coverage certification
 * (1393/1393 ElevenLabs assets, library check 10/10, OpenAI static phonics
 * buckets purged). This guarantees no non-library / OpenAI voice can ever be
 * served for phonics across web/PWA/native. Emergency escape hatch only:
 * VITE_PHONICS_LIBRARY_ONLY=0 (or "false") re-enables the legacy fallback.
 */
export function isPhonicsLibraryOnlyEnforced(): boolean {
  const raw = import.meta.env.VITE_PHONICS_LIBRARY_ONLY;
  return raw !== "0" && raw !== "false";
}

/** HTTPS URL for a letter/digraph phoneme clip — library first, then static catalog. */
export function getPhonicsStaticAudioUrl(audioKey: string): string {
  const fromLibrary = lookupPhonicsLetterUrl(audioKey);
  if (fromLibrary) return fromLibrary;
  if (isPhonicsLibraryOnlyEnforced()) return "";

  const phrase = resolvePhonicsCatalogPhrase(audioKey, { phonicsOnly: true });
  return lookupStaticAudioUrlStrict(phrase, "phonics") ?? "";
}

/** HTTPS URL for CVC word, sight word, sentence, or quiz — library first, then static catalog. */
export function getPhonicsContentAudioUrl(
  text: string,
  preferredType?: PhonicsAssetType,
): string {
  const fromLibrary = lookupPhonicsContentUrl(text, preferredType);
  if (fromLibrary) return fromLibrary;
  if (isPhonicsLibraryOnlyEnforced()) return "";

  const phrase = resolvePhonicsCatalogPhrase(text, { phonicsOnly: true });
  return lookupStaticAudioUrlStrict(phrase, "phonics") ?? "";
}

export function prefetchPhonicsAudioKeys(keys: string[]): void {
  if (!shouldPhonicsPrefetch()) return;
  if (!isPhonicsManifestStrictlyValid()) return;
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
  if (!shouldPhonicsPrefetch()) return;
  if (!isPhonicsManifestStrictlyValid()) return;
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

function lookupPhonicsLibraryUrl(
  label: string,
  contentType?: PhonicsAssetType,
): string | null {
  const key = label.trim().toLowerCase();
  if (!key) return null;
  return (
    lookupPhonicsLetterUrl(key) ??
    lookupPhonicsContentUrl(key, contentType) ??
    null
  );
}

async function playPhonicsLibraryUrlClip(
  label: string,
  cacheKey: string,
  source: string,
  options?: Pick<PlayPhonicsStaticOptions, "isCancelled" | "playbackRate">,
  contentType?: PhonicsAssetType,
): Promise<PlayPhonicsStaticResult | null> {
  const libraryUrl = lookupPhonicsLibraryUrl(label, contentType);
  if (!libraryUrl) return null;

  const resolved = await resolveBestPlayUrl(cacheKey, libraryUrl);
  if (!resolved.url) return null;

  logAmyVoiceDiag("phonics_library_play", { label, url: resolved.url, source });

  const result = await playPhonicsUrl(resolved.url, {
    label,
    playbackRate: options?.playbackRate,
    isCancelled: options?.isCancelled,
    cleanup: resolved.cleanup,
  });

  if (result.ok) {
    if (shouldPhonicsUseCache()) {
      void warmLocalCacheFromUrl(cacheKey, libraryUrl);
    }
    logAudioHealthSuccess({ layer: "static", fallbackUsed: false });
    return { ok: true, audioKey: label, url: resolved.url };
  }

  if (isCancelledError(result.error ?? "")) {
    return { ok: false, audioKey: label, error: "phonics_cancelled" };
  }

  return null;
}

async function tryStaticCatalogClip(
  label: string,
  source: string,
  options?: Pick<PlayPhonicsStaticOptions, "isCancelled" | "playbackRate">,
): Promise<PlayPhonicsStaticResult | null> {
  if (isPhonicsLibraryOnlyEnforced()) return null;
  const phrase = resolvePhonicsCatalogPhrase(label, { phonicsOnly: true });
  const staticUrl = lookupStaticAudioUrlStrict(phrase, "phonics");
  if (!staticUrl) return null;

  const catalog = await playCatalogPreparedUrl(phrase, {
    playbackRate: options?.playbackRate,
    isCancelled: options?.isCancelled,
    source,
    phonicsOnly: true,
  });
  if (catalog.ok) {
    logAudioHealthSuccess({ layer: "static", fallbackUsed: true });
    return { ok: true, audioKey: label, url: staticUrl };
  }
  if (isCancelledError(catalog.error ?? "")) {
    return { ok: false, audioKey: label, error: "phonics_cancelled" };
  }
  return { ok: false, audioKey: label, error: catalog.error ?? "phonics_library_missing" };
}

async function playUrlClip(
  label: string,
  networkUrl: string,
  cacheKey: string,
  source: string,
  options?: Pick<PlayPhonicsStaticOptions, "isCancelled" | "playbackRate">,
  contentType?: PhonicsAssetType,
): Promise<PlayPhonicsStaticResult> {
  if (!label.trim()) return { ok: false, audioKey: label, error: "phonics_empty_key" };
  if (options?.isCancelled?.()) {
    return { ok: false, audioKey: label, error: "phonics_cancelled" };
  }

  recordTtsUserGesture();

  const libraryPlay = await playPhonicsLibraryUrlClip(
    label,
    cacheKey,
    source,
    options,
    contentType,
  );
  if (libraryPlay) return libraryPlay;

  const staticCatalogPlay = await tryStaticCatalogClip(label, `${source}-static-catalog`, options);
  if (staticCatalogPlay?.ok) return staticCatalogPlay;
  if (staticCatalogPlay?.error === "phonics_cancelled") return staticCatalogPlay;

  if (shouldBypassPhonicsSpellingLibraries()) {
    return { ok: false, audioKey: label, error: "phonics_library_missing" };
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
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = await playUrlClip(
    trimmed,
    url,
    cacheKey,
    "phonics-content",
    options,
    options?.contentType,
  );
  if (result.ok) {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    recordPhonicsPlayback(trimmed, Math.round(now - t0));
  }
  return result;
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
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = await playStaticKeyClip(audioKey, "phonics-library", options);
  if (result.ok) {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    recordPhonicsPlayback(audioKey, Math.round(now - t0));
  }
  return result;
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
