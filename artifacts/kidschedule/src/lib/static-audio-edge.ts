import { getAppApiBaseOrigin } from "@/lib/api";
import { lookupStaticAudioUrl } from "@/lib/static-audio";
import type { StaticAudioMode } from "@workspace/static-audio/browser";

const PRELOAD_HINT_PHRASES: Array<{ text: string; mode: StaticAudioMode }> = [
  { text: "good job!", mode: "default" },
  { text: "listen carefully", mode: "default" },
];

let audioContextWarmed = false;

export function isMobileStaticAudioDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function getStaticAudioPrefetchLimit(): number {
  return isMobileStaticAudioDevice() ? 2 : 5;
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
  if (audioContextWarmed || typeof window === "undefined") return;

  type AutoplayPolicyWindow = Window & {
    getAutoplayPolicy?: (kind: "mediaelement" | "audiocontext") => string;
  };
  const policy = (window as AutoplayPolicyWindow).getAutoplayPolicy?.("audiocontext");
  if (policy === "disallowed") return;

  audioContextWarmed = true;

  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      void ctx.resume().catch(() => {});
    }
  } catch {
    /* optional */
  }

  try {
    const warm = new Audio();
    warm.preload = "none";
  } catch {
    /* ignore */
  }
}

export function installStaticAudioGestureWarmup(): void {
  if (typeof window === "undefined") return;
  const once = () => {
    warmStaticAudioOnFirstGesture();
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
export function injectStaticAudioPreloadHints(): void {
  if (typeof document === "undefined") return;

  for (const url of getStaticAudioPreloadHintUrls()) {
    const id = `static-audio-preload-${url.slice(-40).replace(/\W/g, "")}`;
    if (document.getElementById(id)) continue;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "preload";
    link.as = "fetch";
    link.href = url;
    link.crossOrigin = "anonymous";
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
