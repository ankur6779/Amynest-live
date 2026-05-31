import { getAppApiBaseOrigin } from "@/lib/api";
import { audioManager } from "@/lib/audio-manager";
import { isAndroidAmyNestAudioClient } from "@/lib/device-lite";
import { isNativeAmyNestShell } from "@/lib/native-shell";
import { lookupStaticAudioUrl } from "@/lib/static-audio";
import type { StaticAudioMode } from "@workspace/static-audio/browser";

const PRELOAD_HINT_PHRASES: Array<{ text: string; mode: StaticAudioMode }> = [
  { text: "good job!", mode: "default" },
  { text: "listen carefully", mode: "default" },
  { text: "try again", mode: "default" },
  { text: "well done", mode: "default" },
  { text: "a as in apple", mode: "phonics" },
  { text: "b", mode: "phonics" },
];

export function isMobileStaticAudioDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function getStaticAudioPrefetchLimit(): number {
  return isMobileStaticAudioDevice() ? 4 : 8;
}

export function getStaticAudioPreloadHintUrls(): string[] {
  const urls: string[] = [];
  for (const { text, mode } of PRELOAD_HINT_PHRASES) {
    const url = lookupStaticAudioUrl(text, mode);
    if (url) urls.push(url);
  }
  return urls;
}

/**
 * Warm Web Audio / media pipeline on first user gesture.
 * No-op when called outside a real gesture (autoplay policy would warn otherwise).
 */
export function warmStaticAudioOnFirstGesture(): void {
  audioManager.warmMediaPipeline(false, { fromUserGesture: true });
}

export function installStaticAudioGestureWarmup(): void {
  if (typeof window === "undefined") return;
  const once = () => {
    warmStaticAudioOnFirstGesture();
    injectStaticAudioPreloadHints();
    window.removeEventListener("pointerdown", once, true);
    window.removeEventListener("keydown", once, true);
  };
  window.addEventListener("pointerdown", once, { capture: true, passive: true });
  window.addEventListener("keydown", once, { capture: true, passive: true });
}

/**
 * Top 1–2 phrases: `<link rel="preload" as="fetch">` for CDN edge fill.
 * `as="audio"` triggers an "unsupported `as` value" warning on Android Chrome
 * (Blink only treats it as a hint, not a fetched preload), so we use `fetch`
 * which is universally supported and fills the HTTP cache identically.
 */
let staticAudioPreloadHintsInjected = false;

export function injectStaticAudioPreloadHints(): void {
  if (typeof document === "undefined") return;
  if (staticAudioPreloadHintsInjected) return;
  staticAudioPreloadHintsInjected = true;

  for (const url of getStaticAudioPreloadHintUrls()) {
    const id = `static-audio-preload-${url.slice(-40).replace(/\W/g, "")}`;
    if (document.getElementById(id)) continue;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "preload";
    link.as = "fetch";
    link.href = url;
    if (!isNativeAmyNestShell() && !isAndroidAmyNestAudioClient()) {
      link.crossOrigin = "anonymous";
    }
    document.head.appendChild(link);
  }

  const apiOrigin = getAppApiBaseOrigin();
  if (apiOrigin && !document.querySelector('link[rel="dns-prefetch"][data-static-audio]')) {
    const dns = document.createElement("link");
    dns.rel = "dns-prefetch";
    dns.href = apiOrigin;
    dns.setAttribute("data-static-audio", "1");
    document.head.appendChild(dns);
  }
}
