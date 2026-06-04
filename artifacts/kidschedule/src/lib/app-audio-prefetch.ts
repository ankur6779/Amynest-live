/**
 * Layer 5 — app-wide static audio prefetch + Service Worker offline cache.
 *
 * Boot: top cross-surface phrases (coach, hub feedback, common Amy lines).
 * Route: phonics A–Z + tier-1/2 CVC on phonics module open.
 */

import {
  getCoachDialogueExtraAudioTexts,
  getCoachDialogueWarmupPhrases,
} from "@workspace/speech-coach";
import { resolveApiMediaUrl } from "@/lib/api";
import { warmPhonicsLibraryOnRouteOpen } from "@/lib/global-audio-warmup";
import {
  ensureStaticAudioMapLoaded,
  lookupStaticAudioUrl,
  preloadStaticPhrases,
  prefetchStaticAudioUrlsBatch,
} from "@/lib/static-audio";
import type { StaticAudioMode } from "@workspace/static-audio/browser";

export const APP_BOOT_PREFETCH_LIMIT = 50;
export const SERVICE_WORKER_AUDIO_PRECACHE_LIMIT = 200;

const BOOT_FEEDBACK_PHRASES = [
  "Correct! Well done!",
  "Great work!",
  "Keep going!",
  "Nice try.",
  "Let's go!",
  "Amazing!",
  "You did it!",
  "One more time.",
] as const;

const BOOT_CANDIDATE_PHRASES: readonly string[] = [
  ...getCoachDialogueWarmupPhrases(),
  ...BOOT_FEEDBACK_PHRASES,
  ...getCoachDialogueExtraAudioTexts(),
];

let bootWarmStarted = false;
let phonicsRouteWarmStarted = false;

function dedupePhrases(phrases: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of phrases) {
    const text = raw.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

/** Resolve up to 50 catalog-backed phrases for first-gesture boot prefetch. */
export function getAppBootWarmupPhrases(): string[] {
  const out: string[] = [];
  for (const text of dedupePhrases(BOOT_CANDIDATE_PHRASES)) {
    if (lookupStaticAudioUrl(text, "default")) {
      out.push(text);
    }
    if (out.length >= APP_BOOT_PREFETCH_LIMIT) break;
  }
  return out;
}

export function collectStaticAudioUrls(
  phrases: readonly string[],
  mode: StaticAudioMode = "default",
): string[] {
  const urls: string[] = [];
  for (const phrase of phrases) {
    const url = lookupStaticAudioUrl(phrase, mode);
    if (url) urls.push(url);
  }
  return [...new Set(urls)];
}

export function requestServiceWorkerAudioPrecache(urls: readonly string[]): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  const resolved = [...new Set(urls.map((u) => resolveApiMediaUrl(u)).filter(Boolean))].slice(
    0,
    SERVICE_WORKER_AUDIO_PRECACHE_LIMIT,
  );
  if (resolved.length === 0) return;

  const post = () => {
    navigator.serviceWorker.controller?.postMessage({
      type: "PRECACHE_AUDIO_URLS",
      urls: resolved,
    });
  };

  if (navigator.serviceWorker.controller) {
    post();
    return;
  }
  navigator.serviceWorker.addEventListener("controllerchange", post, { once: true });
}

/** Prefetch top static phrases on first user gesture (HTTP + SW cache). */
export function warmAppBootStaticPhrases(): void {
  if (bootWarmStarted || typeof window === "undefined") return;
  bootWarmStarted = true;

  void ensureStaticAudioMapLoaded().then(() => {
    const phrases = getAppBootWarmupPhrases();
    if (phrases.length === 0) return;

    preloadStaticPhrases(phrases, "default", APP_BOOT_PREFETCH_LIMIT);

    const urls = collectStaticAudioUrls(phrases, "default");
    prefetchStaticAudioUrlsBatch(urls);
    requestServiceWorkerAudioPrecache(urls);
  });
}

/** Prefetch full phonics library when the /phonics route mounts. */
export function warmPhonicsRouteOnOpen(): void {
  if (phonicsRouteWarmStarted || typeof window === "undefined") return;
  phonicsRouteWarmStarted = true;

  warmPhonicsLibraryOnRouteOpen();
}
