import { resolveApiMediaUrl } from "@/lib/api";
import {
  isCatalogPhrase,
  isStaticAudioStrictMode,
  logDynamicTtsViolation,
} from "@/lib/static-audio";
import { readResolvedApiJson, type AuthFetchFn } from "@/lib/poll-result";
import type { StaticAudioMode } from "@workspace/static-audio/browser";

const LOG = "[ElevenLabs]";

/** Reject missing URLs and template strings that contain the literal "undefined". */
export function isValidAudioUrl(audioUrl: string | null | undefined): audioUrl is string {
  const u = (audioUrl ?? "").trim();
  return u.length > 0 && !u.includes("undefined");
}

export type TtsSynthesizeResponse = {
  ok?: boolean;
  success?: boolean;
  background?: boolean;
  audioUrl?: string;
  cacheKey?: string;
  cached?: boolean;
  error?: string;
};

/** Create an `HTMLAudioElement` for a resolved HTTPS or API stream URL. */
export function playAudio(url: string): HTMLAudioElement | null {
  if (!isValidAudioUrl(url)) {
    return null;
  }
  try {
    const resolved = resolveApiMediaUrl(url);
    const audio = new Audio(resolved);
    return audio;
  } catch (e) {
    console.error("Invalid audio URL", url, e);
    return null;
  }
}

/** POST /api/tts/synthesize — dynamic AI content only; catalog phrases are rejected. */
export async function synthesizeTts(
  authFetch: AuthFetchFn,
  body: Record<string, unknown>,
  init?: Omit<RequestInit, "method" | "body" | "headers"> & {
    headers?: Record<string, string>;
  },
): Promise<TtsSynthesizeResponse> {
  const text = String(body.text ?? "").trim();
  const mode: StaticAudioMode = body.mode === "phonics" ? "phonics" : "default";

  if (text && isCatalogPhrase(text, mode)) {
    logDynamicTtsViolation(text, mode);
    return {
      success: false,
      ok: false,
      error: "tts_static_pregenerated_only",
    };
  }

  try {
    const res = await authFetch("/api/tts/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...init?.headers },
      body: JSON.stringify(body),
      signal: init?.signal,
    });
    const data = await readResolvedApiJson<TtsSynthesizeResponse>(res, authFetch).catch(() => null);
    if (!res.ok) {
      const errBody = (data ?? {}) as { error?: string };
      if (import.meta.env.DEV) {
        console.error("TTS synthesize HTTP error", res.status, errBody.error);
      }
      return { success: false, ok: false, error: errBody.error ?? `synthesize_failed_${res.status}` };
    }
    if (data?.background) {
      return { success: false, ok: false, background: true, error: "tts_background" };
    }
    if (data?.success === false || !isValidAudioUrl(data?.audioUrl)) {
      return { success: false, ok: false, error: data?.error ?? "tts_failed" };
    }
    return { ...data, success: true, ok: true, audioUrl: data.audioUrl };
  } catch (err) {
    if (import.meta.env.DEV && !isStaticAudioStrictMode()) {
      console.error("TTS synthesize failed", err);
    }
    return { success: false, ok: false, error: "tts_failed" };
  }
}

/** Resolve synthesize `audioUrl` (GCS HTTPS, `/api/tts/audio/…`, or absolute) for fetch/play. */
export function resolveTtsAudioUrl(audioUrl: string): string {
  return resolveApiMediaUrl(audioUrl);
}

/**
 * Web: proxy public GCS URLs through the API stream to avoid CORS on fetch()+blob.
 */
export function resolveClientPlaybackUrl(
  audioUrl: string,
  cacheKey?: string,
): string | null {
  if (!isValidAudioUrl(audioUrl)) return null;
  const resolved = resolveTtsAudioUrl(audioUrl);
  if (
    typeof window !== "undefined" &&
    cacheKey &&
    resolved.includes("storage.googleapis.com")
  ) {
    return resolveTtsAudioUrl(`/api/tts/audio/${cacheKey}.mp3`);
  }
  return resolved;
}

export function logTtsClient(step: string, detail?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.info(LOG, step, detail ?? "");
  }
}

export function logTtsClientError(step: string, err: unknown, detail?: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error(LOG, step, message, detail ?? "");
}
