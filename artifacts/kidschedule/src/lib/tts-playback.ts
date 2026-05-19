import { resolveApiMediaUrl } from "@/lib/api";
import { readResolvedApiJson, type AuthFetchFn } from "@/lib/poll-result";

const LOG = "[ElevenLabs]";

/** Reject missing URLs and template strings that contain the literal "undefined". */
export function isValidAudioUrl(audioUrl: string | null | undefined): audioUrl is string {
  const u = (audioUrl ?? "").trim();
  return u.length > 0 && !u.includes("undefined");
}

export type TtsSynthesizeResponse = {
  ok?: boolean;
  success?: boolean;
  audioUrl: string;
  cacheKey?: string;
  cached?: boolean;
};

/** Create an `HTMLAudioElement` for a resolved HTTPS or API stream URL. */
export function playAudio(url: string): HTMLAudioElement {
  try {
    const resolved = resolveApiMediaUrl(url);
    logPlayAudio(resolved);
    const audio = new Audio(resolved);
    void audio.play().catch((err) => {
      console.error("Playback failed", err);
    });
    return audio;
  } catch (e) {
    console.error("Invalid audio URL", url);
    throw e;
  }
}

/** POST /api/tts/synthesize with async job polling when the server returns 202. */
export async function synthesizeTts(
  authFetch: AuthFetchFn,
  body: Record<string, unknown>,
  init?: Omit<RequestInit, "method" | "body" | "headers"> & {
    headers?: Record<string, string>;
  },
): Promise<TtsSynthesizeResponse> {
  const res = await authFetch("/api/tts/synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...init?.headers },
    body: JSON.stringify(body),
    signal: init?.signal,
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error ?? `synthesize_failed_${res.status}`);
  }
  const data = await readResolvedApiJson<TtsSynthesizeResponse>(res, authFetch);
  console.log("[TTS RESPONSE]", data);
  if (data?.success === false || !isValidAudioUrl(data?.audioUrl)) {
    throw new Error("tts_failed");
  }
  return { ...data, success: true, ok: true };
}

/** Resolve synthesize `audioUrl` (GCS HTTPS, `/api/tts/audio/…`, or absolute) for fetch/play. */
export function resolveTtsAudioUrl(audioUrl: string): string {
  return resolveApiMediaUrl(audioUrl);
}

/**
 * Web: proxy public GCS URLs through the API stream to avoid CORS on fetch()+blob.
 * Mobile / direct <audio> can use the GCS URL as returned.
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

export function logPlayAudio(audioUrl: string): void {
  console.log("[PLAY AUDIO]", audioUrl);
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
