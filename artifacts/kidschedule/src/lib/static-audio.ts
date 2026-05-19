import audioMap from "@/data/static-audio-map.json";
import { getApiUrl, resolveApiMediaUrl } from "@/lib/api";
import {
  isStaticTtsText,
  normalizeStaticAudioKey,
  staticAudioMissingKey,
  type StaticAudioMode,
} from "@workspace/static-audio";

type StaticAudioMapFile = {
  default: Record<string, string>;
  phonics: Record<string, string>;
};

const raw = audioMap as StaticAudioMapFile;

/** Session-scoped misses discovered at playback (mode:normalized). */
const missingKeys = new Set<string>();

/** Normalized phrase text already warned once this session. */
const loggedMissing = new Set<string>();

/** Re-key map entries with trim + lowercase so lookup is case-insensitive. */
function indexByNormalizedKey(bucket: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!bucket) return out;
  for (const [key, url] of Object.entries(bucket)) {
    const normalized = normalize(key);
    if (!normalized) continue;
    out[normalized] = (url ?? "").trim();
  }
  return out;
}

const map: { default: Record<string, string>; phonics: Record<string, string> } = {
  default: indexByNormalizedKey(raw.default),
  phonics: indexByNormalizedKey(raw.phonics),
};

export function normalize(text: string): string {
  return normalizeStaticAudioKey(text);
}

function isHttpsAudioUrl(url: string): boolean {
  return url.startsWith("https://") && !url.includes("undefined");
}

function recordMissingStaticAudio(normalized: string, mode: StaticAudioMode): void {
  if (!normalized) return;

  const key = staticAudioMissingKey(mode, normalized);
  missingKeys.add(key);

  if (!loggedMissing.has(normalized)) {
    console.warn("Missing static audio:", normalized);
    loggedMissing.add(normalized);
  }

  if (import.meta.env.PROD) {
    void reportMissingToServer(key);
  }
}

let reportQueue: string[] = [];
let reportTimer: ReturnType<typeof setTimeout> | null = null;

function flushMissingReports(): void {
  const keys = [...new Set(reportQueue)];
  reportQueue = [];
  reportTimer = null;
  if (keys.length === 0) return;

  void fetch(getApiUrl("/api/static-audio/missing"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keys }),
    keepalive: true,
  }).catch(() => {});
}

function reportMissingToServer(key: string): void {
  reportQueue.push(key);
  if (reportTimer) return;
  reportTimer = setTimeout(flushMissingReports, 500);
}

/** Unique missing keys this session (`mode:normalized`). */
export function getMissingStaticAudioKeys(): string[] {
  return [...missingKeys].sort();
}

export type StaticAudioLookup = {
  text: string;
  normalized: string;
  mode: StaticAudioMode;
  url: string | null;
};

/** Resolve pre-generated URL with normalized key + optional diagnostic logging. */
export function lookupStaticAudio(
  rawText: string,
  mode: StaticAudioMode = "default",
  options?: { log?: boolean },
): StaticAudioLookup {
  const text = rawText.trim();
  const normalized = normalize(text);
  const url = normalized ? (map[mode]?.[normalized] ?? null) : null;

  if (!url && normalized && isStaticTtsText(text, mode)) {
    recordMissingStaticAudio(normalized, mode);
  }

  if (options?.log !== false) {
    console.log("[STATIC AUDIO LOOKUP]", {
      text,
      normalized,
      mode,
      url,
    });
  }

  return { text, normalized, mode, url };
}

/** Pre-generated GCS URL for static copy, if present in the shipped map. */
export function getStaticAudioUrl(
  rawText: string,
  mode: StaticAudioMode = "default",
): string | null {
  const { normalized, url } = lookupStaticAudio(rawText, mode);
  if (!url) {
    return null;
  }
  if (!isHttpsAudioUrl(url)) {
    console.error("Invalid audio URL", url);
    recordMissingStaticAudio(normalized, mode);
    return null;
  }
  return url;
}

export function hasStaticAudio(rawText: string, mode: StaticAudioMode = "default"): boolean {
  return getStaticAudioUrl(rawText, mode) !== null;
}

/**
 * When true, callers must not fall back to /api/tts/synthesize (production static-only).
 */
export function shouldBlockStaticTtsFallback(
  rawText: string,
  mode: StaticAudioMode = "default",
): boolean {
  if (!import.meta.env.PROD) return false;
  if (!isStaticTtsText(rawText, mode)) return false;
  const { normalized, url } = lookupStaticAudio(rawText, mode, { log: false });
  if (!url) {
    recordMissingStaticAudio(normalized, mode);
    return true;
  }
  if (!isHttpsAudioUrl(url)) {
    recordMissingStaticAudio(normalized, mode);
    return true;
  }
  return false;
}

/**
 * Create an <audio> element for pre-generated static audio (no ElevenLabs).
 * Caller must call `audio.play()` after user gesture.
 */
export function createStaticAudioElement(
  rawText: string,
  mode: StaticAudioMode = "default",
): HTMLAudioElement | null {
  const url = getStaticAudioUrl(rawText, mode);
  if (!url) return null;

  const resolved = resolveApiMediaUrl(url);
  console.log("[PLAY STATIC AUDIO]", resolved);

  const audio = new Audio(resolved);
  audio.preload = "auto";
  return audio;
}

/**
 * @deprecated Prefer `createStaticAudioElement` — does not auto-play.
 */
export function playStaticAudio(
  rawText: string,
  mode: StaticAudioMode = "default",
): HTMLAudioElement | null {
  const audio = createStaticAudioElement(rawText, mode);
  if (!audio) return null;
  void audio.play().catch((err) => {
    console.error("[StaticAudio] Playback failed", err);
  });
  return audio;
}
