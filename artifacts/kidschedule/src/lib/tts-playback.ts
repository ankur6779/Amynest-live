import { resolveApiMediaUrl } from "@/lib/api";
import { readResolvedApiJson, type AuthFetchFn } from "@/lib/poll-result";

const LOG = "[ElevenLabs]";

export type TtsSynthesizeResponse = {
  audioUrl: string;
  cacheKey?: string;
  cached?: boolean;
};

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
  if (!data?.audioUrl) {
    throw new Error("tts_missing_audio_url");
  }
  return data;
}

/** Resolve synthesize `audioUrl` (always `/api/tts/audio/…` or absolute) for fetch/play. */
export function resolveTtsAudioUrl(audioUrl: string): string {
  return resolveApiMediaUrl(audioUrl);
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
