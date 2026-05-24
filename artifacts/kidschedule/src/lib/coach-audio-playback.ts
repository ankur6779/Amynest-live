import { getApiUrl } from "@/lib/api";
import type { AuthFetchFn } from "@/lib/poll-result";
import type { CoachAudioIdentity } from "@/lib/coach-audio-identity";
import type { Win } from "@/pages/ai-coach";
import { readResolvedApiJson } from "@/lib/poll-result";
import { getTtsRequestTimeoutMs } from "@/lib/tts-guard";
import { resolveClientPlaybackUrl } from "@/lib/tts-playback";

export type CoachAudioGenerateResponse = {
  ok?: boolean;
  url?: string;
  audioUrl?: string;
  cacheKey?: string;
  cached?: boolean;
  error?: string;
};

/** Dedicated coach cache layer — POST /api/ai-coach/audio/generate */
export async function generateCoachWinAudio(
  authFetch: AuthFetchFn,
  input: {
    planCacheKey: string;
    identity: CoachAudioIdentity;
  },
  init?: { signal?: AbortSignal },
): Promise<CoachAudioGenerateResponse> {
  const { identity } = input;
  try {
    const res = await authFetch(
      getApiUrl("/api/ai-coach/audio/generate"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planCacheKey: input.planCacheKey,
          winIndex: identity.winIndex,
          text: identity.text,
        }),
        signal: init?.signal,
      },
      getTtsRequestTimeoutMs(),
    );
    const data = await readResolvedApiJson<CoachAudioGenerateResponse>(res, authFetch).catch(
      () => null,
    );
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error ?? `coach_audio_failed_${res.status}` };
    }
    return data;
  } catch {
    return { ok: false, error: "coach_audio_failed" };
  }
}

export function resolveCoachPlaybackUrl(
  audioUrl: string,
  cacheKey?: string,
): string | null {
  if (!audioUrl?.trim()) return null;
  return resolveClientPlaybackUrl(audioUrl, cacheKey);
}

/** Background pre-generation for all wins in a plan (shared global cache). */
export function pregenerateCoachPlanAudio(
  authFetch: AuthFetchFn,
  planCacheKey: string,
  wins: Win[],
): void {
  const key = (planCacheKey ?? "").trim();
  if (!key || wins.length === 0) return;

  void authFetch(getApiUrl("/api/ai-coach/pregenerate-audio"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planCacheKey: key, wins: wins.slice(0, 20) }),
  }).catch((err) => {
    console.warn("[CoachAudio] pregenerate failed", err);
  });
}
